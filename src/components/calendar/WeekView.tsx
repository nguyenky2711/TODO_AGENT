import React, { useRef, useEffect, useState } from 'react';
import { Task } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { Clock, CheckCircle2, ListChecks } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onScheduleTask: (taskId: string, date: string, startTime: string, endTime: string) => void;
  onQuickCreate: (date: string, startTime: string) => void;
  onCompleteTask: (taskId: string, isDone: boolean) => void;
}

const START_HOUR = 0; // 00:00 Full 24-hour day
const END_HOUR = 23; // 23:00
const ROW_HEIGHT = 64; // Pixels per hour

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

  // Filter & calculate segments touching dateStr
  const daySegments = tasks
    .map((task) => {
      if (!task.startDate || !task.startTime || task.status === 'CANCELLED') return null;

      const startDate = task.startDate;
      let endDate = task.endDate || task.startDate;

      // If endDate <= startDate but endTime <= startTime, infer overnight task ending next day
      if (endDate <= startDate && task.endTime && task.endTime <= task.startTime) {
        const [y, m, d] = startDate.split('-').map(Number);
        const nextDate = new Date(y, m - 1, d + 1);
        const nextY = nextDate.getFullYear();
        const nextM = (nextDate.getMonth() + 1).toString().padStart(2, '0');
        const nextD = nextDate.getDate().toString().padStart(2, '0');
        endDate = `${nextY}-${nextM}-${nextD}`;
      }

      // Check if this date falls within [startDate, endDate]
      if (dateStr < startDate || dateStr > endDate) return null;

      const isFirstDay = dateStr === startDate;
      const isLastDay = dateStr === endDate;

      let startMin = 0;
      let endMin = totalDayMinutes;
      let timeLabel = '';

      if (isFirstDay && isLastDay) {
        // Single-day task
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
        // First day of multi-day / overnight task (extends from startTime to 24:00 midnight)
        const [sh, sm] = task.startTime.split(':').map(Number);
        startMin = (sh - startHour) * 60 + (isNaN(sm) ? 0 : sm);
        endMin = totalDayMinutes;
        timeLabel = `${task.startTime} → (qua ngày ${task.endTime || ''})`.trim();
      } else if (isLastDay) {
        // Last day of multi-day / overnight task (starts from 00:00 midnight to endTime)
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
        // Intermediate full day
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
        height: Math.max(34, (duration / 60) * rowHeight),
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

  // Group into overlapping clusters
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

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  tasks,
  onTaskClick,
  onScheduleTask,
  onQuickCreate,
  onCompleteTask,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const todayStr = formatDate(currentTime);
  const [focusedDateStr, setFocusedDateStr] = useState<string>(() => formatDate(currentDate));

  // Sync focused date when currentDate changes
  useEffect(() => {
    setFocusedDateStr(formatDate(currentDate));
  }, [currentDate]);

  // Live clock ticker every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate 7 days of the week (Monday to Sunday)
  const daysOfWeek: Date[] = [];
  const curr = new Date(currentDate);
  const dayOfWeek = curr.getDay();
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(curr);
  monday.setDate(curr.getDate() + distanceToMonday);
  monday.setHours(12, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    daysOfWeek.push(d);
  }

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
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dateStr: string, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = Math.min(23, hour + 1).toString().padStart(2, '0');
    const endTime = `${endHour}:00`;

    onScheduleTask(taskId, dateStr, startTime, endTime);
  };

  const currentMinutesFromStart =
    (currentTime.getHours() - START_HOUR) * 60 + currentTime.getMinutes();
  const showNowLine =
    currentTime.getHours() >= START_HOUR && currentTime.getHours() <= END_HOUR;
  const nowLineTop = (currentMinutesFromStart / 60) * ROW_HEIGHT;

  // Dynamic grid template columns: Focused day gets 3.2fr, others get 1fr
  const columnsTemplate = `54px ${daysOfWeek
    .map((d) => (formatDate(d) === focusedDateStr ? '3.2fr' : '1fr'))
    .join(' ')}`;

  return (
    <div className="flex flex-col h-full bg-card/40 overflow-x-auto overflow-y-hidden select-none">
      <div className="min-w-[680px] md:min-w-full flex flex-col h-full">
        {/* Week Header with Dynamic Focus Columns */}
        <div
          className="grid border-b border-border bg-card/85 backdrop-blur-md sticky top-0 z-30 shrink-0 transition-all duration-300"
          style={{ gridTemplateColumns: columnsTemplate }}
        >
          <div className="p-3 text-center border-r border-border/60 text-xs font-semibold text-muted-foreground flex items-center justify-center sticky left-0 z-40 bg-card/95 backdrop-blur-md shadow-xs">
            <Clock className="w-3.5 h-3.5" />
          </div>

          {daysOfWeek.map((day, idx) => {
            const dStr = formatDate(day);
            const isToday = dStr === todayStr;
            const isFocused = dStr === focusedDateStr;
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const dayName = dayNames[day.getDay()];

            return (
              <div
                key={idx}
                onClick={() => setFocusedDateStr(dStr)}
                className={cn(
                  'p-2 text-center border-r border-border/60 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center',
                  isFocused ? 'bg-primary/10 shadow-xs' : 'hover:bg-secondary/40',
                  isToday && !isFocused ? 'bg-primary/[0.03]' : ''
                )}
                title={isFocused ? 'Ngày đang chọn mở rộng' : 'Bấm để mở rộng xem chi tiết ngày này'}
              >
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      'text-[11px] font-semibold transition-colors',
                      isFocused ? 'text-primary font-bold' : 'text-muted-foreground'
                    )}
                  >
                    {dayName}
                  </span>
                  {isFocused && (
                    <span className="hidden sm:inline text-[9px] font-bold px-1 rounded bg-primary/20 text-primary">
                      Đang xem
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-0.5 transition-all',
                    isToday
                      ? 'bg-primary text-primary-foreground shadow-neon-glow'
                      : isFocused
                      ? 'bg-foreground text-background'
                      : 'text-foreground/80'
                  )}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Continuous Time Grid Container (Full 24 Hours) */}
        <div ref={containerRef} className="flex-1 overflow-y-auto relative">
          <div
            className="grid relative transition-all duration-300"
            style={{
              height: `${hoursArray.length * ROW_HEIGHT}px`,
              gridTemplateColumns: columnsTemplate,
            }}
          >
            {/* Sticky Time Axis Column on Left (00:00 - 23:00) */}
            <div className="border-r border-border/60 bg-card/95 backdrop-blur-md sticky left-0 z-20 shadow-xs select-none">
              {hoursArray.map((hour) => (
                <div
                  key={hour}
                  style={{ height: `${ROW_HEIGHT}px` }}
                  className="border-b border-border/40 p-2 text-right font-mono text-[11px] text-muted-foreground/80 flex items-start justify-end"
                >
                  <span className="-mt-1.5">{`${hour.toString().padStart(2, '0')}:00`}</span>
                </div>
              ))}
            </div>

            {/* 7 Days Columns with Dynamic Width */}
            {daysOfWeek.map((day, dayIdx) => {
              const dateStr = formatDate(day);
              const isToday = dateStr === todayStr;
              const isFocused = dateStr === focusedDateStr;

              // Compute positioned tasks for this day
              const positionedTasks = computePositionedTasksForDay(
                tasks,
                dateStr,
                START_HOUR,
                END_HOUR,
                ROW_HEIGHT
              );

              return (
                <div
                  key={dayIdx}
                  onClick={() => {
                    if (!isFocused) setFocusedDateStr(dateStr);
                  }}
                  className={cn(
                    'relative border-r border-border/60 h-full transition-all duration-300',
                    isFocused ? 'bg-primary/[0.03]' : 'hover:bg-secondary/15 cursor-pointer'
                  )}
                >
                  {/* Background Grid Row Lines (Clickable slots) */}
                  {hoursArray.map((hour) => (
                    <div
                      key={hour}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateStr, hour)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedDateStr(dateStr);
                        onQuickCreate(dateStr, `${hour.toString().padStart(2, '0')}:00`);
                      }}
                      className="border-b border-border/40 hover:bg-secondary/30 transition-colors cursor-pointer group/cell relative"
                    >
                      {isFocused && (
                        <div className="opacity-0 group-hover/cell:opacity-100 text-[10px] text-muted-foreground/40 p-1 pointer-events-none transition-opacity">
                          + {hour}:00
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Red Current Time Line */}
                  {isToday && showNowLine && (
                    <div
                      style={{ top: `${nowLineTop}px` }}
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center -translate-y-1/2"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm -ml-1.5 ring-2 ring-background" />
                      <div className="flex-1 h-[2px] bg-red-500 shadow-xs" />
                    </div>
                  )}

                  {/* Absolutely Positioned Task Cards */}
                  {positionedTasks.map(
                    ({ task, top, height, leftPercent, widthPercent, timeLabel }) => {
                      const taskColor = task.color || task.project?.color || '#6366f1';
                      const isDone = task.status === 'DONE';
                      const subtaskCount = task.subtasks?.length || 0;
                      const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;

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
                            setFocusedDateStr(dateStr);
                            onTaskClick(task);
                          }}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                            backgroundColor: `${taskColor}14`,
                            borderColor: `${taskColor}45`,
                          }}
                          className={cn(
                            'absolute z-10 rounded-lg pl-3 pr-1.5 py-1 text-xs transition-all duration-150 cursor-pointer shadow-xs group/card backdrop-blur-md border overflow-hidden flex flex-col justify-between',
                            'hover:z-20 hover:shadow-md hover:border-opacity-100 hover:brightness-[1.03]',
                            isDone ? 'opacity-50 line-through grayscale-[30%]' : ''
                          )}
                        >
                          {/* Left accent color pill */}
                          <div
                            className="absolute left-1 top-1 bottom-1 w-1 rounded-full transition-all group-hover/card:w-1.5"
                            style={{ backgroundColor: taskColor }}
                          />

                          {/* Card Content: Expanded vs Compact */}
                          <div className="flex items-start justify-between gap-1 min-w-0">
                            <div className="font-semibold text-foreground text-[11px] leading-tight break-words line-clamp-2 flex-1">
                              {task.title}
                            </div>
                            {isFocused && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCompleteTask(task.id, !isDone);
                                }}
                                className="shrink-0 p-0.5 -m-0.5 rounded-md hover:bg-card/80 text-muted-foreground hover:text-primary transition-colors"
                                title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu xong'}
                              >
                                <CheckCircle2
                                  className={cn(
                                    'w-3.5 h-3.5',
                                    isDone ? 'text-emerald-500 fill-emerald-500/20' : ''
                                  )}
                                />
                              </button>
                            )}
                          </div>

                          {/* Subtasks summary with time & priority (when focused & has subtasks) */}
                          {isFocused && subtaskCount > 0 && height >= 54 && (
                            <div className="space-y-0.5 my-0.5 pt-0.5 border-t border-border/30 overflow-hidden">
                              <div className="flex items-center gap-1 text-[9px] font-semibold text-primary/90 bg-primary/10 px-1.5 py-0.2 rounded w-fit">
                                <ListChecks className="w-2.5 h-2.5" />
                                <span>
                                  {completedSubtasks}/{subtaskCount} việc phụ
                                </span>
                              </div>
                              {height >= 85 &&
                                task.subtasks!.slice(0, height >= 120 ? 3 : 1).map((st) => (
                                  <div
                                    key={st.id}
                                    className="flex items-center justify-between text-[9px] text-muted-foreground gap-1"
                                  >
                                    <span
                                      className={cn(
                                        'truncate',
                                        st.isCompleted ? 'line-through opacity-50' : 'text-foreground/90'
                                      )}
                                    >
                                      {st.isCompleted ? '✓' : '○'} {st.title}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {(st.startTime || st.endTime) && (
                                        <span className="font-mono text-[8px] opacity-80 font-bold">
                                          {st.startTime || ''}{st.endTime ? `-${st.endTime}` : ''}
                                        </span>
                                      )}
                                      {st.priority === 'HIGH' && (
                                        <span
                                          className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"
                                          title="Ưu tiên cao"
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                          {/* Time interval label */}
                          <div
                            className="text-[10px] font-mono mt-auto font-semibold flex items-center justify-between gap-1 shrink-0"
                            style={{ color: taskColor }}
                          >
                            <span className="truncate">
                              {isFocused ? timeLabel : task.startTime}
                            </span>
                            {task.priority === 'HIGH' && !isDone && (
                              <span className="text-[9px] font-bold text-red-500 shrink-0">
                                ●
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
