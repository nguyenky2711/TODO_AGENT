import { TaskService } from './task.service';
import { Task } from '../types';

export interface ActiveNotification {
  id: string;
  task: Task;
  dueInMinutes: number;
  timestamp: number;
}

type NotificationListener = (notif: ActiveNotification) => void;

class NotificationServiceManager {
  private listeners: Set<NotificationListener> = new Set();
  private notifiedTaskKeys: Set<string> = new Set();
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
      this.checkUpcomingTasks();
    }, 20000);

    // Initial check after startup
    setTimeout(() => this.checkUpcomingTasks(), 2500);
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
      // Must be called inside user interaction handler on iOS Safari 16.4+
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

  async checkUpcomingTasks(): Promise<void> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const tasks = await TaskService.getAll({
      startDate: todayStr,
      status: 'TODO',
    });

    for (const task of tasks) {
      if (!task.startTime) continue;
      const [th, tm] = task.startTime.split(':').map(Number);
      if (isNaN(th) || isNaN(tm)) continue;

      const taskMinutes = th * 60 + tm;
      const diffMinutes = taskMinutes - currentMinutes;
      const reminderBefore = task.reminderMinutesBefore ?? 10;

      // Check if within reminder window and not in the past
      if (diffMinutes >= 0 && diffMinutes <= reminderBefore) {
        const key = `${task.id}-${todayStr}-${task.startTime}`;
        const snoozedTime = this.snoozedUntil.get(key);

        if (snoozedTime && Date.now() < snoozedTime) {
          continue; // still snoozing
        }

        if (!this.notifiedTaskKeys.has(key) || (snoozedTime && Date.now() >= snoozedTime)) {
          this.notifiedTaskKeys.add(key);
          this.triggerNotification(task, diffMinutes);
        }
      }
    }
  }

  async triggerNotification(task: Task, diffMinutes: number): Promise<void> {
    const minutesText = diffMinutes === 0 ? 'ngay bây giờ' : `sau ${diffMinutes} phút`;
    const title = `⏰ Nhắc việc: ${task.title}`;
    const body = `Bắt đầu ${minutesText} (lúc ${task.startTime}).`;

    // 1. Mobile Haptic Vibration feedback if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }

    // 2. Play subtle pleasant chime
    this.playNotificationSound();

    // 3. System / Push Notification (ServiceWorker on iOS/Mobile or Native window.Notification)
    if (this.getPermissionStatus() === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, {
            body,
            icon: '/apple-touch-icon.png',
            badge: '/favicon-32x32.png',
            tag: `task-reminder-${task.id}`,
            data: { taskId: task.id },
          });
        } else if ('Notification' in window) {
          new Notification(title, {
            body,
            icon: '/apple-touch-icon.png',
            tag: `task-reminder-${task.id}`,
          });
        }
      } catch (err) {
        console.warn('System notification display failed:', err);
      }
    }

    // 4. In-App Interactive Notification Banner
    const notif: ActiveNotification = {
      id: `notif-${Date.now()}-${task.id}`,
      task,
      dueInMinutes: diffMinutes,
      timestamp: Date.now(),
    };

    this.listeners.forEach((l) => l(notif));
  }

  snooze(taskId: string, minutes: number): void {
    for (const key of this.notifiedTaskKeys) {
      if (key.startsWith(taskId)) {
        this.snoozedUntil.set(key, Date.now() + minutes * 60 * 1000);
      }
    }
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
