import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Check,
  X,
  CheckCircle2,
  Hourglass,
  Plus,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { ActiveNotification, NotificationService } from '../../services/notification.service';
import { TaskService } from '../../services/task.service';
import { Task } from '../../types';
import { cn } from '../../lib/utils';

interface NotificationBannerProps {
  onDataMutated: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ onDataMutated }) => {
  const [activeNotifs, setActiveNotifs] = useState<ActiveNotification[]>([]);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((notif) => {
      setActiveNotifs((prev) => {
        const existingIdx = prev.findIndex(
          (n) => n.id === notif.id || (n.type === 'check_in' && notif.type === 'check_in')
        );
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = notif;
          return next;
        }
        return [...prev, notif];
      });
    });
    return () => unsubscribe();
  }, []);

  const handleDismiss = (id: string) => {
    setActiveNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSnooze = (taskId: string, minutes: number, notifId: string) => {
    NotificationService.snooze(taskId, minutes);
    handleDismiss(notifId);
  };

  const handleCompleteTask = async (task: Task, notifId: string, isLastInGroup: boolean) => {
    await TaskService.complete(task.id, true);
    if (isLastInGroup) {
      handleDismiss(notifId);
    } else {
      // Remove just this task from group list
      setActiveNotifs((prev) =>
        prev
          .map((n) => {
            if (n.id === notifId && n.tasks) {
              const remaining = n.tasks.filter((t) => t.id !== task.id);
              if (remaining.length === 0) return null;
              return { ...n, tasks: remaining, task: remaining[0] };
            }
            return n;
          })
          .filter(Boolean) as ActiveNotification[]
      );
    }
    onDataMutated();
  };

  const handleExtendTime = async (task: Task, notifId: string) => {
    if (task.endTime) {
      const [h, m] = task.endTime.split(':').map(Number);
      const totalM = h * 60 + m + 15;
      const newH = Math.floor(totalM / 60) % 24;
      const newM = totalM % 60;
      const newEndTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
      await TaskService.update(task.id, { endTime: newEndTime });
    }
    NotificationService.snooze(task.id, 15);
    handleDismiss(notifId);
    onDataMutated();
  };

  if (activeNotifs.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full select-none pointer-events-none">
      {activeNotifs.map((notif) => {
        const isCheckIn = notif.type === 'check_in';
        const taskList = notif.tasks && notif.tasks.length > 0 ? notif.tasks : [notif.task];

        return (
          <div
            key={notif.id}
            className={cn(
              'pointer-events-auto rounded-2xl bg-card border shadow-glass p-3.5 space-y-2.5 animate-in slide-in-from-bottom-3 duration-200 transition-all',
              isCheckIn
                ? 'border-emerald-500/40 border-l-4 border-l-emerald-500'
                : 'border-primary/40 border-l-4 border-l-primary'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs',
                    isCheckIn
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-primary/15 text-primary'
                  )}
                >
                  {isCheckIn ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4 animate-ring" />
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    {isCheckIn ? 'Kiểm tra tiến độ công việc' : 'Sắp tới giờ làm việc'}
                    {isCheckIn && taskList.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-500 font-mono font-bold">
                        {taskList.length} việc
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {isCheckIn
                      ? 'Đã qua hơn 50% thời gian. Bạn đã hoàn thành chưa?'
                      : `Bắt đầu ${notif.dueInMinutes === 0 ? 'ngay bây giờ' : `sau ${notif.dueInMinutes} phút`} (lúc ${notif.task.startTime})`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDismiss(notif.id)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
                title="Đóng"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Case 1: UPCOMING REMINDER (No premature done button!) */}
            {!isCheckIn && (
              <div className="space-y-2 pt-1">
                <div className="p-2 rounded-xl bg-secondary/50 border border-border/60 flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-foreground truncate">
                    {notif.task.title}
                  </span>
                  <span className="text-[10px] font-mono text-primary shrink-0 font-bold">
                    {notif.task.startTime} - {notif.task.endTime || '30p'}
                  </span>
                </div>

                {/* Reminder Actions: Snooze or Acknowledge */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-border/40 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSnooze(notif.task.id, 5, notif.id)}
                    className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                  >
                    Hoãn 5p
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze(notif.task.id, 10, notif.id)}
                    className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                  >
                    Hoãn 10p
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(notif.id)}
                    className="ml-auto px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all"
                  >
                    Đã rõ
                  </button>
                </div>
              </div>
            )}

            {/* Case 2: PROGRESS CHECK-IN (Single or Multi-task support) */}
            {isCheckIn && (
              <div className="space-y-2 pt-1">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {taskList.map((task) => (
                    <div
                      key={task.id}
                      className="p-2 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {task.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.startTime} - {task.endTime || '30p'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleExtendTime(task, notif.id)}
                          className="px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-semibold transition-colors"
                          title="Gia hạn thêm 15 phút"
                        >
                          +15p
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCompleteTask(task, notif.id, taskList.length === 1)
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
                        >
                          <Check className="w-3 h-3" />
                          <span>Xong</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom options */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      taskList.forEach((t) => NotificationService.snooze(t.id, 10));
                      handleDismiss(notif.id);
                    }}
                    className="text-muted-foreground hover:text-foreground text-[11px] font-medium"
                  >
                    Đang làm tiếp (Nhắc lại sau 10p)
                  </button>

                  {taskList.length > 1 && (
                    <button
                      type="button"
                      onClick={async () => {
                        for (const t of taskList) {
                          await TaskService.complete(t.id, true);
                        }
                        handleDismiss(notif.id);
                        onDataMutated();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>Xong tất cả ({taskList.length})</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
