import React, { useRef, useEffect, useState } from 'react';
import { Task } from '../../types';
import { cn, formatDate, getDayNameVi, getPriorityBadgeColor } from '../../lib/utils';
import { CheckCircle2, Clock, Tag } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onScheduleTask: (taskId: string, date: string, startTime: string, endTime: string) => void;
  onQuickCreate: (date: string, startTime: string) => void;
  onCompleteTask: (taskId: string, isDone: boolean) => void;
}

const START_HOUR = 0; // 00:00 Full 24-hour day
const END_HOUR = 23;  // 23:00
const ROW_HEIGHT = 72; // Pixels per hour for DayView

interface PositionedTask {
  task: Task;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
  timeLabel: string;
}

function computePositionedTasksForDay(
  tasks: Task[],
  dateStr: string,
  startHour: number = START_HOUR,
  endHour: number = END_HOUR,
  rowHeight: number = ROW_HEIGHT
): PositionedTask[] {
  const totalDayMinutes = (endHour - startHour + 1) * 60;

  const daySegments = tasks
    .map((task) => {
      if (!task.startDate || !task.startTime || task.status === 'CANCELLED') return null;

      const startDate = task.startDate;
      let endDate = task.endDate || task.startDate;

      if (endDate <= startDate && task.endTime && task.endTime <= task.startTime) {
        const [y, m, d] = startDate.split('-').map(Number);
        const nextDate = new Date(y, m - 1, d + 1);
        const nextY = nextDate.getFullYear();
        const nextM = (nextDate.getMonth() + 1).toString().padStart(2, '0');
        const nextD = nextDate.getDate().toString().padStart(2, '0');
        endDate = `${nextY}-${nextM}-${nextD}`;
      }

      if (dateStr < startDate || dateStr > endDate) return null;

      const isFirstDay = dateStr === startDate;
      const isLastDay = dateStr === endDate;

      let startMin = 0;
      let endMin = totalDayMinutes;
      let timeLabel = '';

      if (isFirstDay && isLastDay) {
        const [sh, sm] = task.startTime.split(':').map(Number);
        startMin = (sh - startHour) * 60 + (isNaN(sm) ? 0 : sm);

        let calculatedEnd = startMin + (task.estimatedMinutes || 30);
        if (task.endTime) {
          const [eh, em] = task.endTime.split(':').map(Number);
          if (!isNaN(eh)) {
            calculatedEnd = (eh - startHour) * 60 + (isNaN(em) ? 0 : em);
          }
        }
        endMin = Math.max(startMin + 25, calculatedEnd);
        timeLabel = `${task.startTime}${task.endTime ? ` - ${task.endTime}` : ''}`;
      } else if (isFirstDay) {
        const [sh, sm] = task.startTime.split(':').map(Number);
        startMin = (sh - startHour) * 60 + (isNaN(sm) ? 0 : sm);
        endMin = totalDayMinutes;
        timeLabel = `${task.startTime} → (qua ngày ${task.endTime || ''})`.trim();
      } else if (isLastDay) {
        startMin = 0;
        if (task.endTime) {
          const [eh, em] = task.endTime.split(':').map(Number);
          if (!isNaN(eh)) {
            endMin = Math.max(25, (eh - startHour) * 60 + (isNaN(em) ? 0 : em));
          } else {
            endMin = 60;
          }
        } else {
          endMin = 60;
        }
        timeLabel = `(tiếp) → ${task.endTime || '07:00'}`;
      } else {
        startMin = 0;
        endMin = totalDayMinutes;
        timeLabel = `Cả ngày (tiếp tục)`;
      }

      startMin = Math.max(0, Math.min(totalDayMinutes, startMin));
      endMin = Math.max(startMin + 25, Math.min(totalDayMinutes, endMin));
      const duration = endMin - startMin;

      return {
        task,
        startMin,
        endMin,
        top: Math.max(0, (startMin / 60) * rowHeight),
        height: Math.max(40, (duration / 60) * rowHeight),
        timeLabel,
      };
    })
    .filter(Boolean) as {
      task: Task;
      startMin: number;
      endMin: number;
      top: number;
      height: number;
      timeLabel: string;
    }[];

  if (daySegments.length === 0) return [];

  daySegments.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const clusters: (typeof daySegments)[] = [];
  let currentCluster: typeof daySegments = [];
  let clusterEnd = -1;

  for (const item of daySegments) {
    if (currentCluster.length === 0 || item.startMin < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMin;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedTask[] = [];

  for (const cluster of clusters) {
    const columns: (typeof daySegments)[] = [];

    for (const item of cluster) {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (lastInCol.endMin <= item.startMin) {
          columns[i].push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([item]);
      }
    }

    const numCols = columns.length;
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      for (const item of columns[colIdx]) {
        result.push({
          task: item.task,
          top: item.top,
          height: item.height,
          leftPercent: (colIdx / numCols) * 100,
          widthPercent: (1 / numCols) * 100,
          timeLabel: item.timeLabel,
        });
      }
    }
  }

  return result;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  tasks,
  onTaskClick,
  onScheduleTask,
  onQuickCreate,
  onCompleteTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Live clock ticker every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const dateStr = formatDate(currentDate);
  const todayStr = formatDate(currentTime);
  const isToday = dateStr === todayStr;

  const hoursArray = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  // Auto-scroll on initial load to current hour
  useEffect(() => {
    if (containerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const targetHour = Math.max(0, Math.min(23, currentHour - 1));
      const targetTop = targetHour * ROW_HEIGHT;
      containerRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
    }
  }, [dateStr]);

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

  const showNowLine = isToday && currentTime.getHours() >= START_HOUR && currentTime.getHours() <= END_HOUR;
  const currentMinutesFromStart = (currentTime.getHours() - START_HOUR) * 60 + currentTime.getMinutes();
  const nowLineTop = (currentMinutesFromStart / 60) * ROW_HEIGHT;

  const positionedTasks = computePositionedTasksForDay(tasks, dateStr, START_HOUR, END_HOUR, ROW_HEIGHT);

  return (
    <div className="flex flex-col h-full bg-card/40 overflow-hidden select-none">
      {/* Day Header Banner */}
      <div className="p-3 border-b border-border bg-card/85 backdrop-blur-md flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            {getDayNameVi(currentDate)},{' '}
            {currentDate.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </h2>
          <p className="text-xs text-muted-foreground">Có {positionedTasks.length} công việc trong ngày</p>
        </div>
        {isToday && (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
            Hôm nay
          </span>
        )}
      </div>

      {/* Continuous Time Grid (Full 24 Hours) */}
      <div ref={containerRef} className="flex-1 overflow-y-auto relative">
        <div
          className="grid grid-cols-[64px_1fr] relative"
          style={{ height: `${hoursArray.length * ROW_HEIGHT}px` }}
        >
          {/* Time Axis Column (00:00 - 23:00) */}
          <div className="border-r border-border/60 bg-card/95 backdrop-blur-md sticky left-0 z-20 shadow-xs select-none">
            {hoursArray.map((hour) => (
              <div
                key={hour}
                style={{ height: `${ROW_HEIGHT}px` }}
                className="border-b border-border/40 p-2.5 text-right text-xs font-mono text-muted-foreground/80 flex items-start justify-end"
              >
                <span className="-mt-1.5">{`${hour.toString().padStart(2, '0')}:00`}</span>
              </div>
            ))}
          </div>

          {/* Day Continuous Column */}
          <div className="relative h-full">
            {/* Hour Grid Slots (Clickable) */}
            {hoursArray.map((hour) => (
              <div
                key={hour}
                style={{ height: `${ROW_HEIGHT}px` }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, hour)}
                onClick={() => onQuickCreate(dateStr, `${hour.toString().padStart(2, '0')}:00`)}
                className="border-b border-border/40 hover:bg-secondary/20 transition-colors cursor-pointer group/cell relative"
              >
                <div className="opacity-0 group-hover/cell:opacity-100 text-[11px] text-muted-foreground/40 p-1.5 pointer-events-none transition-opacity">
                  + {hour}:00
                </div>
              </div>
            ))}

            {/* Red Current Time Line */}
            {showNowLine && (
              <div
                style={{ top: `${nowLineTop}px` }}
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center -translate-y-1/2"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm -ml-1.5 ring-2 ring-background" />
                <div className="flex-1 h-[2px] bg-red-500 shadow-xs" />
              </div>
            )}

            {/* Positioned Task Cards */}
            {positionedTasks.map(({ task, top, height, leftPercent, widthPercent, timeLabel }) => {
              const taskColor = task.color || task.project?.color || '#6366f1';
              const isDone = task.status === 'DONE';
              const priorityColor = getPriorityBadgeColor(task.priority);

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
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `calc(${leftPercent}% + 4px)`,
                    width: `calc(${widthPercent}% - 8px)`,
                    backgroundColor: `${taskColor}12`,
                    borderColor: `${taskColor}40`,
                  }}
                  className={cn(
                    'absolute z-10 rounded-xl pl-4 pr-3 py-2 text-xs transition-all duration-150 cursor-pointer shadow-xs overflow-hidden backdrop-blur-md border flex flex-col justify-between group/daycard',
                    'hover:z-20 hover:shadow-lg hover:border-opacity-100 hover:brightness-[1.03]',
                    isDone ? 'opacity-50 line-through grayscale-[30%]' : ''
                  )}
                >
                  {/* Left accent color pill */}
                  <div
                    className="absolute left-1.5 top-2 bottom-2 w-1.5 rounded-full transition-all group-hover/daycard:w-2"
                    style={{ backgroundColor: taskColor }}
                  />

                  {/* Title & Complete Checkbox */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-foreground break-words line-clamp-2">
                        {task.title}
                      </h4>
                      {task.description && height >= 60 && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompleteTask(task.id, !isDone);
                      }}
                      className="shrink-0 p-1 rounded-lg hover:bg-card/80 text-muted-foreground hover:text-primary transition-colors"
                      title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                    >
                      <CheckCircle2
                        className={cn(
                          'w-4 h-4',
                          isDone ? 'text-emerald-500 fill-emerald-500/20' : ''
                        )}
                      />
                    </button>
                  </div>
                  {/* Subtasks checklist items with time & priority */}
                  {task.subtasks && task.subtasks.length > 0 && height >= 65 && (
                    <div className="space-y-1 my-1 pt-1 border-t border-border/30 overflow-hidden">
                      {task.subtasks.slice(0, height >= 140 ? 4 : 2).map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between text-[10px] text-muted-foreground gap-1.5"
                        >
                          <span
                            className={cn(
                              'truncate flex-1',
                              st.isCompleted ? 'line-through opacity-50' : 'text-foreground/90'
                            )}
                          >
                            {st.isCompleted ? '✓' : '○'} {st.title}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {(st.startTime || st.endTime) && (
                              <span className="font-mono text-[9px] text-primary/80 bg-primary/10 px-1 py-0.2 rounded font-bold">
                                {st.startTime || ''}{st.endTime ? `-${st.endTime}` : ''}
                              </span>
                            )}
                            <span
                              className={cn(
                                'text-[8px] font-bold px-1 py-0.2 rounded uppercase',
                                st.priority === 'HIGH'
                                  ? 'bg-destructive/15 text-destructive'
                                  : st.priority === 'LOW'
                                  ? 'bg-blue-500/15 text-blue-500'
                                  : 'bg-amber-500/15 text-amber-500'
                              )}
                            >
                              {st.priority === 'HIGH' ? 'Cao' : st.priority === 'LOW' ? 'Thấp' : 'Vừa'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {task.subtasks.length > (height >= 140 ? 4 : 2) && (
                        <span className="text-[9px] text-muted-foreground/60 font-semibold block">
                          +{task.subtasks.length - (height >= 140 ? 4 : 2)} việc phụ khác...
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer Time & Badges */}
                  <div className="flex items-center justify-between gap-2 text-[10px] mt-auto shrink-0">
                    <div
                      className="font-mono font-bold flex items-center gap-1"
                      style={{ color: taskColor }}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{timeLabel}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {task.tags && task.tags.length > 0 && height >= 70 && (
                        <span className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-secondary/80 text-muted-foreground">
                          <Tag className="w-2.5 h-2.5" />
                          {typeof task.tags[0] === 'string'
                            ? task.tags[0]
                            : (task.tags[0] as { name?: string }).name}
                        </span>
                      )}
                      <span className={cn('px-1.5 py-0.2 rounded font-bold uppercase', priorityColor)}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
