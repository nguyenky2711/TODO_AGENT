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
  private timer: any = null;

  init(): void {
    if (this.timer) return;
    
    // Request native notification permission if available
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Run check every 20 seconds
    this.timer = setInterval(() => {
      this.checkUpcomingTasks();
    }, 20000);

    // Initial check
    setTimeout(() => this.checkUpcomingTasks(), 2000);
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

  private triggerNotification(task: Task, diffMinutes: number): void {
    const minutesText = diffMinutes === 0 ? 'ngay bây giờ' : `sau ${diffMinutes} phút`;
    const title = `⏰ Nhắc nhở công việc: ${task.title}`;
    const body = `Công việc bắt đầu ${minutesText} (lúc ${task.startTime}).`;

    // 1. Native Windows Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Native notification failed:', err);
      }
    }

    // 2. Play soft audio cue
    this.playNotificationSound();

    // 3. Emit in-app banner for Snooze and Mark Done
    const notif: ActiveNotification = {
      id: `notif-${Date.now()}-${task.id}`,
      task,
      dueInMinutes: diffMinutes,
      timestamp: Date.now(),
    };

    this.listeners.forEach((l) => l(notif));
  }

  snooze(taskId: string, minutes: number): void {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    // Find keys matching taskId
    for (const key of this.notifiedTaskKeys) {
      if (key.startsWith(taskId)) {
        this.snoozedUntil.set(key, Date.now() + minutes * 60 * 1000);
      }
    }
  }

  private playNotificationSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (err) {
      // Audio not permitted without gesture
    }
  }
}

export const NotificationService = new NotificationServiceManager();
