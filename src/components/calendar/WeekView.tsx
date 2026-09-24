import React, { useRef, useEffect } from 'react';
import { Task } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { Clock, CheckCircle2 } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onScheduleTask: (taskId: string, date: string, startTime: string, endTime: string) => void;
  onQuickCreate: (date: string, startTime: string) => void;
  onCompleteTask: (taskId: string, isDone: boolean) => void;
}

const START_HOUR = 7;
const END_HOUR = 23;

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  tasks,
  onTaskClick,
  onScheduleTask,
  onQuickCreate,
  onCompleteTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate 7 days of the week (Monday to Sunday) cleanly
  const daysOfWeek: Date[] = [];
  const curr = new Date(currentDate);
  const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(curr);
  monday.setDate(curr.getDate() + distanceToMonday);
  monday.setHours(12, 0, 0, 0); // Anchor at noon to avoid timezone and DST drift

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    daysOfWeek.push(d);
  }

  // Scroll to current hour on load
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const targetHour = Math.max(START_HOUR, Math.min(END_HOUR, currentHour - 1));
      const el = containerRef.current.querySelector(`[data-hour="${targetHour}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  const todayStr = formatDate(new Date());

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dateStr: string, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Calculate start and end time
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = Math.min(23, hour + 1).toString().padStart(2, '0');
    const endTime = `${endHour}:00`;

    onScheduleTask(taskId, dateStr, startTime, endTime);
  };

  const now = new Date();
  const showNowLine = now.getHours() >= START_HOUR && now.getHours() <= END_HOUR;
  const hoursArray = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="flex flex-col h-full bg-card/40 overflow-hidden select-none">
      {/* Week Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20">
        <div className="p-3 text-center border-r border-border/60 text-xs font-semibold text-muted-foreground flex items-center justify-center">
          <Clock className="w-3.5 h-3.5" />
        </div>
        {daysOfWeek.map((day, idx) => {
          const dStr = formatDate(day);
          const isToday = dStr === todayStr;
          const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
          const dayName = dayNames[day.getDay()];

          return (
            <div
              key={idx}
              className={cn(
                'p-2.5 text-center border-r border-border/60 transition-colors',
                isToday ? 'bg-primary/5' : ''
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground block">
                {dayName}
              </span>
              <div
                className={cn(
                  'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mt-1 transition-all',
                  isToday
                    ? 'bg-primary text-primary-foreground shadow-neon-glow'
                    : 'text-foreground'
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Grid Container: Dynamic Row Height */}
      <div ref={containerRef} className="flex-1 overflow-y-auto relative">
        <div className="flex flex-col relative min-h-full">
          {hoursArray.map((hour) => {
            const isNowHour = showNowLine && hour === now.getHours();

            return (
              <div
                key={hour}
                data-hour={hour}
                className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 min-h-[64px] group/row relative"
              >
                {/* Time Label Column */}
                <div className="border-r border-border/60 select-none bg-card/20 p-2 text-right font-mono text-[11px] text-muted-foreground/80 flex items-start justify-end">
                  <span className="-mt-1">{`${hour.toString().padStart(2, '0')}:00`}</span>
                </div>

                {/* 7 Days Columns for this Hour */}
                {daysOfWeek.map((day, dayIdx) => {
                  const dateStr = formatDate(day);
                  const isToday = dateStr === todayStr;

                  // Tasks scheduled in this hour slot
                  const hourTasks = tasks
                    .filter((t) => {
                      if (t.startDate !== dateStr || !t.startTime || t.status === 'CANCELLED') return false;
                      const h = parseInt(t.startTime.split(':')[0], 10);
                      return h === hour;
                    })
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

                  return (
                    <div
                      key={dayIdx}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateStr, hour)}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          onQuickCreate(dateStr, `${hour.toString().padStart(2, '0')}:00`);
                        }
                      }}
                      className={cn(
                        'relative border-r border-border/60 p-1 flex flex-col gap-1.5 transition-colors cursor-pointer group/cell min-h-[64px]',
                        isToday ? 'bg-primary/[0.02]' : '',
                        'hover:bg-secondary/25'
                      )}
                    >
                      {/* Current Time Indicator line if today & current hour */}
                      {isToday && isNowHour && (
                        <div
                          style={{ top: `${Math.round((now.getMinutes() / 60) * 100)}%` }}
                          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center -translate-y-1/2"
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm -ml-1.5 ring-2 ring-background" />
                          <div className="flex-1 h-[2px] bg-red-500 shadow-xs" />
                        </div>
                      )}

                      {/* Scheduled Tasks for this hour (auto-scaled stack) */}
                      {hourTasks.map((task) => {
                        const taskColor = task.color || task.project?.color || '#6366f1';
                        const isDone = task.status === 'DONE';

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', task.id);
                              e.dataTransfer.setData('taskIds', JSON.stringify([task.id]));
                              e.dataTransfer.setData('application/json', JSON.stringify(task));
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskClick(task);
                            }}
                            style={{
                              backgroundColor: `${taskColor}14`,
                              borderColor: `${taskColor}35`,
                            }}
                            className={cn(
                              'w-full rounded-lg pl-3.5 pr-2 py-1.5 text-xs transition-all duration-200 cursor-pointer shadow-xs group/card backdrop-blur-md relative border min-h-[44px] flex flex-col justify-between overflow-hidden',
                              'hover:shadow-md hover:border-opacity-100 hover:brightness-[1.03]',
                              isDone ? 'opacity-50 line-through grayscale-[30%]' : ''
                            )}
                          >
                            {/* Left accent indicator pill */}
                            <div
                              className="absolute left-1.5 top-1.5 bottom-1.5 w-1 rounded-full transition-all duration-200 group-hover/card:w-1.5"
                              style={{ backgroundColor: taskColor }}
                            />

                            <div className="flex items-start justify-between gap-1">
                              <div className="font-semibold text-foreground text-[11px] leading-snug break-words flex-1">
                                {task.title}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCompleteTask(task.id, !isDone);
                                }}
                                className="shrink-0 p-1 -m-1 rounded-md hover:bg-card/80 text-muted-foreground/70 hover:text-primary transition-colors mt-0.5"
                                title={isDone ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                              >
                                <CheckCircle2
                                  className={cn('w-3.5 h-3.5', isDone ? 'text-emerald-500 fill-emerald-500/20' : '')}
                                />
                              </button>
                            </div>

                            {/* Time & Priority */}
                            <div
                              className="text-[10px] font-mono mt-1 font-semibold flex items-center justify-between gap-1"
                              style={{ color: taskColor }}
                            >
                              <span className="truncate">
                                {task.startTime}{task.endTime ? ` - ${task.endTime}` : ''}
                              </span>
                              {task.priority === 'HIGH' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-500 font-bold uppercase shrink-0">
                                  Gấp
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Ghost add button on hover if empty */}
                      {hourTasks.length === 0 && (
                        <div className="opacity-0 group-hover/cell:opacity-100 text-[10px] text-muted-foreground/50 p-1 pointer-events-none select-none transition-opacity">
                          + Thêm việc
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
