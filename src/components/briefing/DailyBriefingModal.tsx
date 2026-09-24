import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Calendar,
  Layers,
  RotateCw,
  Loader2
} from 'lucide-react';
import { PriorityService, PrioritizedTaskResult } from '../../services/priority.service';
import { CalendarService } from '../../services/calendar.service';
import { TaskService } from '../../services/task.service';
import { Task } from '../../types';
import { cn } from '../../lib/utils';

interface DailyBriefingModalProps {
  isOpen: boolean;
  mode: 'morning' | 'evening';
  onClose: () => void;
  onDataMutated: () => void;
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  isOpen,
  mode,
  onClose,
  onDataMutated,
}) => {
  const [topPriorities, setTopPriorities] = useState<PrioritizedTaskResult[]>([]);
  const [todayScheduled, setTodayScheduled] = useState<Task[]>([]);
  const [todayPending, setTodayPending] = useState<Task[]>([]);
  const [todayCompleted, setTodayCompleted] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [goldenSlot, setGoldenSlot] = useState<{ startTime: string; endTime: string; durationMinutes: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const currentDayName = dayNames[new Date().getDay()];

  useEffect(() => {
    if (!isOpen) return;

    const loadBriefingData = async () => {
      setIsLoading(true);
      setSuccessMsg('');
      try {
        // 1. Gợi ý ưu tiên
        const priorities = await PriorityService.suggestDailyPriorities(todayStr, 'BALANCED');
        setTopPriorities(priorities.slice(0, 3));

        // 2. Lịch trình hôm nay
        const allToday = await TaskService.getAll({ startDate: todayStr });
        const scheduled = allToday.filter(t => t.startTime);
        setTodayScheduled(scheduled);

        // 3. Phân loại hoàn thành & dở dang
        setTodayCompleted(allToday.filter(t => t.status === 'DONE'));
        setTodayPending(allToday.filter(t => t.status !== 'DONE'));

        // 4. Việc trễ hạn
        const overdue = await TaskService.getOverdueTasks(todayStr);
        setOverdueTasks(overdue);

        // 5. Khung giờ trống vàng
        const slots = await CalendarService.findFreeSlots(todayStr, 45);
        if (slots.length > 0) {
          // Lấy slot dài nhất
          const sorted = [...slots].sort((a, b) => b.durationMinutes - a.durationMinutes);
          setGoldenSlot(sorted[0]);
        } else {
          setGoldenSlot(null);
        }
      } catch (err) {
        console.error('Failed to load briefing:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBriefingData();
  }, [isOpen, mode, todayStr]);

  const handleRescheduleAllToTomorrow = async () => {
    setIsRescheduling(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const toReschedule = Array.from(new Set([...todayPending.map(t => t.id), ...overdueTasks.map(t => t.id)]));
      const count = await TaskService.batchReschedule(toReschedule, tomorrowStr, '09:00');
      
      setSuccessMsg(`🗓️ Đã dời thành công ${count} công việc sang sáng mai lúc 09:00!`);
      onDataMutated();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Reschedule failed:', err);
    } finally {
      setIsRescheduling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-card text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm",
              mode === 'morning' ? "bg-amber-500" : "bg-indigo-600"
            )}>
              {mode === 'morning' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                {mode === 'morning' ? 'Bản Tin Chào Buổi Sáng' : 'Tổng Kết Cuối Ngày (Review)'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono font-normal">
                  {currentDayName}, {todayStr}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {mode === 'morning' 
                  ? 'Nắm bắt 3 trọng tâm chính và khung giờ tập trung hôm nay' 
                  : 'Ăn mừng thành quả đạt được và dời các việc tồn sang ngày mai'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Đang tổng hợp dữ liệu lịch trình & thứ tự ưu tiên...</span>
            </div>
          ) : (
            <>
              {/* Success alert */}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* MORNING VIEW */}
              {mode === 'morning' && (
                <>
                  {/* Top 3 Focus */}
                  <div className="space-y-2">
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5 text-primary">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Top 3 Việc Quan Trọng Nhất Hôm Nay</span>
                    </span>
                    <div className="space-y-2">
                      {topPriorities.length === 0 ? (
                        <p className="p-3 rounded-xl bg-secondary/30 text-muted-foreground text-center">
                          ✨ Hôm nay chưa có công việc nào. Bạn có thể tự do sáng tạo hoặc tạo việc mới!
                        </p>
                      ) : (
                        topPriorities.map((item, idx) => (
                          <div
                            key={item.task.id}
                            className="p-3 rounded-xl bg-secondary/30 border border-border/80 flex items-start justify-between gap-3 hover:border-primary/40 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-primary">#{idx + 1}</span>
                                <span className="font-semibold text-foreground">{item.task.title}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium border border-primary/20">
                                  {item.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">{item.reason}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                              ~{item.task.estimatedMinutes}p
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Golden Slot & Schedule summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Golden Deep Work Slot */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Khung Giờ Vàng (Deep Work)</span>
                      </div>
                      {goldenSlot ? (
                        <p className="text-[11px] text-muted-foreground">
                          Từ <strong>{goldenSlot.startTime}</strong> đến <strong>{goldenSlot.endTime}</strong> ({goldenSlot.durationMinutes} phút trống liên tục). Rất thích hợp để tập trung sâu!
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Lịch hôm nay đã kín khung giờ trống lớn. Hãy linh hoạt xử lý từng việc ngắn nhé!
                        </p>
                      )}
                    </div>

                    {/* Scheduled Events */}
                    <div className="p-3 rounded-xl bg-secondary/40 border border-border/80 space-y-1">
                      <div className="flex items-center gap-1.5 text-foreground font-bold text-xs">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>Lịch Đã Xếp Hôm Nay ({todayScheduled.length})</span>
                      </div>
                      {todayScheduled.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">
                          Chưa có khung giờ cố định nào. Thoải mái kéo thả sắp xếp!
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground truncate">
                          Bắt đầu sớm nhất: <strong>{todayScheduled[0]?.startTime}</strong> ({todayScheduled[0]?.title})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Overdue Alert if any */}
                  {overdueTasks.length > 0 && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-2.5 text-destructive">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="text-[11px] space-y-0.5">
                        <strong className="block">Cảnh báo: Có {overdueTasks.length} việc bị trễ hạn từ hôm qua!</strong>
                        <span>Ví dụ: {overdueTasks.slice(0, 2).map(t => `"${t.title}"`).join(', ')}. Hãy ưu tiên giải quyết sớm nhé.</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* EVENING VIEW */}
              {mode === 'evening' && (
                <>
                  {/* Dopamine Celebration */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/15 to-neon-purple/15 border border-primary/30 text-center space-y-1">
                    <span className="text-2xl">🎉</span>
                    <h4 className="font-bold text-sm text-foreground">
                      Hôm nay bạn đã hoàn thành {todayCompleted.length} công việc!
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Mỗi bước đi nhỏ đều đưa bạn đến gần hơn với mục tiêu lớn. Chúc mừng bạn!
                    </p>
                  </div>

                  {/* Leftover tasks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Việc còn tồn hôm nay ({todayPending.length})</span>
                      </span>
                      {todayPending.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          Có thể dời sang sáng mai bằng 1-Click
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {todayPending.length === 0 ? (
                        <p className="p-3 rounded-xl bg-secondary/30 text-emerald-500 font-medium text-center">
                          ✨ Tuyệt vời! Bạn không để lại việc tồn đọng nào cho ngày hôm nay.
                        </p>
                      ) : (
                        todayPending.map((t) => (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-lg bg-secondary/30 border border-border/60 flex items-center justify-between text-xs"
                          >
                            <span className="truncate text-foreground">• {t.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono ml-2">
                              {t.priority}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Action Button: Reschedule all to tomorrow */}
                  {todayPending.length > 0 && !successMsg && (
                    <button
                      onClick={handleRescheduleAllToTomorrow}
                      disabled={isRescheduling}
                      className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 shadow-sm transition-all"
                    >
                      {isRescheduling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Đang dời lịch sang sáng mai...</span>
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Dời toàn bộ việc tồn sang 09:00 sáng mai</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-card/80 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {mode === 'morning' ? '💡 Chúc bạn một ngày tràn đầy năng lượng!' : '🌙 Nghỉ ngơi trọn vẹn để nạp năng lượng nhé!'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 font-medium text-xs transition-colors"
          >
            Đã rõ
          </button>
        </div>
      </div>
    </div>
  );
};
