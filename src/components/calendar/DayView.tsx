import React, { useRef, useEffect } from 'react';
import { Task } from '../../types';
import { cn, formatDate, getDayNameVi, getPriorityBadgeColor } from '../../lib/utils';
import { CheckCircle2, Clock } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onScheduleTask: (taskId: string, date: string, startTime: string, endTime: string) => void;
  onQuickCreate: (date: string, startTime: string) => void;
  onCompleteTask: (taskId: string, isDone: boolean) => void;
}

const START_HOUR = 7;
const END_HOUR = 23;

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  tasks,
  onTaskClick,
  onScheduleTask,
  onQuickCreate,
  onCompleteTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dateStr = formatDate(currentDate);
  const todayStr = formatDate(new Date());
  const isToday = dateStr === todayStr;

  const dayTasks = tasks.filter(
    (t) => t.startDate === dateStr && t.startTime && t.status !== 'CANCELLED'
  );

  const hoursArray = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

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
  }, [dateStr]);

  // Current time line
  const now = new Date();
  const showNowLine = isToday && now.getHours() >= START_HOUR && now.getHours() <= END_HOUR;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${Math.min(23, hour + 1).toString().padStart(2, '0')}:00`;
    onScheduleTask(taskId, dateStr, startTime, endTime);
  };

  return (
    <div className="flex flex-col h-full bg-card/40 overflow-hidden select-none">
      {/* Day Banner */}
      <div className="p-3 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            {getDayNameVi(currentDate)}, {currentDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </h2>
          <p className="text-xs text-muted-foreground">
            Có {dayTasks.length} công việc đã lên lịch
          </p>
        </div>
        {isToday && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
            Hôm nay
          </span>
        )}
      </div>

      {/* Time Grid: Dynamic Auto-Scaling Row Height */}
      <div ref={containerRef} className="flex-1 overflow-y-auto relative">
        <div className="flex flex-col relative min-h-full">
          {hoursArray.map((hour) => {
            const isNowHour = showNowLine && hour === now.getHours();

            // Tasks starting in this hour
            const hourTasks = dayTasks
              .filter((t) => {
                if (!t.startTime) return false;
                const h = parseInt(t.startTime.split(':')[0], 10);
                return h === hour;
              })
              .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

            return (
              <div
                key={hour}
                data-hour={hour}
                className="grid grid-cols-[70px_1fr] border-b border-border/40 min-h-[72px] group/row relative"
              >
                {/* Hour Label */}
                <div className="border-r border-border/60 bg-card/20 select-none p-2.5 text-right text-xs font-mono text-muted-foreground flex items-start justify-end">
                  <span className="-mt-1">{`${hour.toString().padStart(2, '0')}:00`}</span>
                </div>

                {/* Day Slot: expands dynamically with multiple tasks */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, hour)}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      onQuickCreate(dateStr, `${hour.toString().padStart(2, '0')}:00`);
                    }
                  }}
                  className="p-2 flex flex-col gap-2 min-h-[72px] transition-colors hover:bg-secondary/20 cursor-pointer relative group/cell"
                >
                  {/* Current Time Indicator line */}
                  {isNowHour && (
                    <div
                      style={{ top: `${Math.round((now.getMinutes() / 60) * 100)}%` }}
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center -translate-y-1/2"
                    >
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm -ml-1.5 ring-2 ring-background" />
                      <div className="flex-1 h-[2px] bg-red-500 shadow-xs" />
                    </div>
                  )}

                  {/* Scheduled task cards */}
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
                          backgroundColor: `${taskColor}12`,
                          borderColor: `${taskColor}35`,
                        }}
                        className={cn(
                          'w-full rounded-xl pl-4.5 pr-3 py-3 text-xs transition-all duration-200 cursor-pointer shadow-xs z-10 relative overflow-hidden',
                          'backdrop-blur-md hover:shadow-lg border flex flex-col gap-2 hover:brightness-[1.03] group/daycard',
                          isDone ? 'opacity-50 line-through grayscale-[30%]' : ''
                        )}
                      >
                        {/* Left accent indicator pill */}
                        <div
                          className="absolute left-2 top-2.5 bottom-2.5 w-1 rounded-full transition-all duration-200 group-hover/daycard:w-1.5"
                          style={{ backgroundColor: taskColor }}
                        />

                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-foreground break-words flex-1">
                            {task.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCompleteTask(task.id, !isDone);
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                            title={isDone ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                          >
                            <CheckCircle2 className={cn('w-4 h-4', isDone ? 'text-emerald-500' : '')} />
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-1.5 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{task.startTime} - {task.endTime}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-semibold', getPriorityBadgeColor(task.priority))}>
                              {task.priority}
                            </span>
                            {task.project && (
                              <span className="text-[11px] font-medium" style={{ color: task.project.color }}>
                                {task.project.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty slot placeholder on hover */}
                  {hourTasks.length === 0 && (
                    <span className="opacity-0 group-hover/cell:opacity-80 text-[11px] text-muted-foreground p-1 block pointer-events-none select-none">
                      + Thêm việc vào {`${hour.toString().padStart(2, '0')}:00`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
