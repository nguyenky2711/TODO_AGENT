import React, { useState, useEffect } from 'react';
import { Bell, Clock, Check, X, Moon } from 'lucide-react';
import { ActiveNotification, NotificationService } from '../../services/notification.service';
import { TaskService } from '../../services/task.service';

interface NotificationBannerProps {
  onDataMutated: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ onDataMutated }) => {
  const [activeNotifs, setActiveNotifs] = useState<ActiveNotification[]>([]);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((notif) => {
      setActiveNotifs((prev) => [...prev, notif]);
    });
    return () => unsubscribe();
  }, []);

  const handleDismiss = (id: string) => {
    setActiveNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSnooze = (notif: ActiveNotification, minutes: number) => {
    NotificationService.snooze(notif.task.id, minutes);
    handleDismiss(notif.id);
  };

  const handleComplete = async (notif: ActiveNotification) => {
    await TaskService.complete(notif.task.id, true);
    handleDismiss(notif.id);
    onDataMutated();
  };

  if (activeNotifs.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full select-none pointer-events-none">
      {activeNotifs.map((notif) => (
        <div
          key={notif.id}
          className="pointer-events-auto rounded-2xl bg-card border border-border shadow-2xl p-3.5 space-y-2.5 animate-bounce-short transition-all border-l-4 border-l-primary"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 animate-ring" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-foreground truncate max-w-[200px]">
                  {notif.task.title}
                </h4>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {notif.dueInMinutes === 0 ? 'Bắt đầu ngay bây giờ!' : `Bắt đầu sau ${notif.dueInMinutes} phút`} ({notif.task.startTime})
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDismiss(notif.id)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-border/40 text-[11px]">
            <button
              onClick={() => handleSnooze(notif, 5)}
              className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
            >
              Hoãn 5p
            </button>
            <button
              onClick={() => handleSnooze(notif, 10)}
              className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
            >
              Hoãn 10p
            </button>
            <button
              onClick={() => handleSnooze(notif, 30)}
              className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
            >
              Hoãn 30p
            </button>
            <button
              onClick={() => handleComplete(notif)}
              className="ml-auto px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Xong</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
