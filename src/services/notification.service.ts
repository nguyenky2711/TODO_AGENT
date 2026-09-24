import { TaskService } from './task.service';
import { Task } from '../types';

export type NotificationType = 'upcoming' | 'check_in';

export interface ActiveNotification {
  id: string;
  type: NotificationType;
  task: Task;
  tasks?: Task[]; // For multi-task parallel check-ins
  dueInMinutes?: number;
  progressPercent?: number;
  timestamp: number;
}

type NotificationListener = (notif: ActiveNotification) => void;

class NotificationServiceManager {
  private listeners: Set<NotificationListener> = new Set();
  private notifiedKeys: Set<string> = new Set();
  private snoozedUntil: Map<string, number> = new Map();
  private timer: number | null = null;
  private audioCtx: AudioContext | null = null;
  public isAudioUnlocked: boolean = false;

  init(): void {
    if (this.timer) return;

    // Pre-warm / unlock Web Audio API on first user interaction (critical for iOS Safari)
    this.setupAudioUnlock();

    // Run check every 20 seconds
    this.timer = window.setInterval(() => {
      this.checkTasks();
    }, 20000);

    // Initial check after startup
    setTimeout(() => this.checkTasks(), 3000);
  }

  private setupAudioUnlock(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        if (!this.audioCtx) {
          const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
          const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
          if (AudioContextClass) {
            this.audioCtx = new AudioContextClass();
          }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        this.isAudioUnlocked = true;
      } catch (err) {
        // AudioContext not allowed yet
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  async requestPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        this.playNotificationSound();
      }
      return result;
    } catch (err) {
      console.warn('Notification.requestPermission failed:', err);
      return this.getPermissionStatus();
    }
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async checkTasks(): Promise<void> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const tasks = await TaskService.getAll({
      startDate: todayStr,
    });

    const activeTasks = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS');
    const eligibleCheckInTasks: Task[] = [];

    for (const task of activeTasks) {
      if (!task.startTime) continue;
      const [sh, sm] = task.startTime.split(':').map(Number);
      if (isNaN(sh) || isNaN(sm)) continue;

      const startMinutes = sh * 60 + sm;
      const diffStart = startMinutes - currentMinutes;
      const reminderBefore = task.reminderMinutesBefore ?? 10;

      // 1. UPCOMING REMINDER (Before start time, fire strictly ONCE unless snoozed)
      if (diffStart >= 0 && diffStart <= reminderBefore) {
        const key = `upcoming-${task.id}-${todayStr}-${task.startTime}`;
        const snoozedTime = this.snoozedUntil.get(key);

        if (snoozedTime) {
          // If snooze period is still active, skip
          if (Date.now() < snoozedTime) {
            continue;
          }
          // Snooze period has expired: fire once and delete the snooze entry!
          this.snoozedUntil.delete(key);
          this.notifiedKeys.add(key);
          this.triggerUpcomingNotification(task, diffStart);
        } else if (!this.notifiedKeys.has(key)) {
          // Has not been notified yet: fire once and permanently record key!
          this.notifiedKeys.add(key);
          this.triggerUpcomingNotification(task, diffStart);
        }
      }

      // 2. CHECK-IN PROMPT (>= 50% of duration has passed, fire strictly ONCE unless snoozed)
      if (currentMinutes > startMinutes) {
        let endMinutes = startMinutes + (task.estimatedMinutes || 30);
        if (task.endTime) {
          const [eh, em] = task.endTime.split(':').map(Number);
          if (!isNaN(eh) && !isNaN(em)) {
            endMinutes = eh * 60 + em;
          }
        }

        const duration = Math.max(15, endMinutes - startMinutes);
        const elapsed = currentMinutes - startMinutes;
        const progressPercent = Math.min(100, Math.round((elapsed / duration) * 100));

        // When >= 50% elapsed and task is still active
        if (progressPercent >= 50) {
          const key = `checkin-${task.id}-${todayStr}-${task.startTime}`;
          const snoozedTime = this.snoozedUntil.get(key);

          if (snoozedTime) {
            if (Date.now() < snoozedTime) {
              continue;
            }
            // Snooze expired: fire once and clear snooze entry
            this.snoozedUntil.delete(key);
            this.notifiedKeys.add(key);
            eligibleCheckInTasks.push(task);
          } else if (!this.notifiedKeys.has(key)) {
            // First time >= 50%: fire once and record key
            this.notifiedKeys.add(key);
            eligibleCheckInTasks.push(task);
          }
        }
      }
    }

    // Trigger multi-task check-in strictly once for the eligible tasks
    if (eligibleCheckInTasks.length > 0) {
      this.triggerCheckInNotification(eligibleCheckInTasks);
    }
  }

  private async triggerUpcomingNotification(task: Task, diffMinutes: number): Promise<void> {
    const minutesText = diffMinutes === 0 ? 'ngay bây giờ' : `sau ${diffMinutes} phút`;
    const title = `⏰ Sắp tới giờ: ${task.title}`;
    const body = `Công việc bắt đầu ${minutesText} (lúc ${task.startTime}). Chuẩn bị nhé!`;

    // Mobile Haptic Vibration (fire once)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([80, 40, 80]); } catch {}
    }

    this.playNotificationSound();

    // System Push Notification (with stable tag to prevent duplicate system alerts)
    if (this.getPermissionStatus() === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, {
            body,
            icon: '/apple-touch-icon.png',
            badge: '/favicon-32x32.png',
            tag: `upcoming-${task.id}`,
            data: { taskId: task.id },
          });
        } else if ('Notification' in window) {
          new Notification(title, {
            body,
            icon: '/apple-touch-icon.png',
            tag: `upcoming-${task.id}`,
          });
        }
      } catch (err) {
        console.warn('System notification error:', err);
      }
    }

    // Emit in-app banner with stable unique ID
    const notif: ActiveNotification = {
      id: `upcoming-${task.id}`,
      type: 'upcoming',
      task,
      dueInMinutes: diffMinutes,
      timestamp: Date.now(),
    };

    this.listeners.forEach((l) => l(notif));
  }

  private async triggerCheckInNotification(tasks: Task[]): Promise<void> {
    const title = tasks.length === 1
      ? `💡 Đã hoàn thành: ${tasks[0].title}?`
      : `💡 Kiểm tra tiến độ (${tasks.length} việc đang diễn ra)`;
    
    const body = tasks.length === 1
      ? `Đã qua hơn 50% thời gian. Bạn đã xong việc này chưa?`
      : `Có ${tasks.length} công việc đã hoàn thành hoặc gần hết giờ. Bấm để xác nhận!`;

    // Mobile Haptic Vibration
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([100, 50, 100]); } catch {}
    }

    this.playNotificationSound();

    // System Push Notification
    if (this.getPermissionStatus() === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, {
            body,
            icon: '/apple-touch-icon.png',
            badge: '/favicon-32x32.png',
            tag: `checkin-group`,
          });
        } else if ('Notification' in window) {
          new Notification(title, {
            body,
            icon: '/apple-touch-icon.png',
            tag: `checkin-group`,
          });
        }
      } catch (err) {
        console.warn('Check-in notification error:', err);
      }
    }

    // Stable ID to prevent duplicate banners
    const notif: ActiveNotification = {
      id: `checkin-active-group`,
      type: 'check_in',
      task: tasks[0],
      tasks,
      timestamp: Date.now(),
    };

    this.listeners.forEach((l) => l(notif));
  }

  snooze(taskId: string, minutes: number): void {
    const until = Date.now() + minutes * 60 * 1000;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Find and set snooze for upcoming or checkin keys
    for (const key of this.notifiedKeys) {
      if (key.includes(taskId)) {
        this.snoozedUntil.set(key, until);
      }
    }

    // Also explicitly set for standard key patterns if not yet in notifiedKeys
    this.snoozedUntil.set(`upcoming-${taskId}-${todayStr}`, until);
    this.snoozedUntil.set(`checkin-${taskId}-${todayStr}`, until);
  }

  playNotificationSound(): void {
    try {
      const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Two-tone chime (D5 -> A5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now); // D6 harmonic

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (err) {
      // Audio not permitted or device muted
    }
  }

  async testChimeAndNotification(): Promise<void> {
    this.playNotificationSound();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([80, 40, 80]); } catch {}
    }

    if (this.getPermissionStatus() === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification('🔔 Thử nghiệm thông báo', {
            body: 'Hệ thống thông báo và chuông nhắc nhở hoạt động hoàn hảo!',
            icon: '/apple-touch-icon.png',
            badge: '/favicon-32x32.png',
          });
        } else if ('Notification' in window) {
          new Notification('🔔 Thử nghiệm thông báo', {
            body: 'Hệ thống thông báo và chuông nhắc nhở hoạt động hoàn hảo!',
            icon: '/apple-touch-icon.png',
          });
        }
      } catch (e) {
        console.warn('Test notification error:', e);
      }
    }
  }
}

export const NotificationService = new NotificationServiceManager();
