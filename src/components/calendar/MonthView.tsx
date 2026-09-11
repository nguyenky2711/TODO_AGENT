import React from 'react';
import { Task } from '../../types';
import { cn, formatDate } from '../../lib/utils';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onScheduleTask: (taskId: string, date: string, startTime: string, endTime: string) => void;
  onQuickCreate: (date: string, startTime: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  tasks,
  onTaskClick,
  onScheduleTask,
  onQuickCreate,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDay = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month padding days
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = startingDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDate - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month padding days to complete grid (up to 35 or 42)
  const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  const todayStr = formatDate(new Date());

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    onScheduleTask(taskId, dateStr, '09:00', '10:00');
  };

  const dayHeaders = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <div className="flex flex-col h-full bg-card/40 overflow-hidden select-none">
      {/* Day header */}
      <div className="grid grid-cols-7 border-b border-border bg-card/80 backdrop-blur-md">
        {dayHeaders.map((dh, idx) => (
          <div key={idx} className="p-2 text-center text-xs font-semibold text-muted-foreground border-r border-border/40">
            {dh}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 border-b border-border">
        {days.slice(0, 35).map((dObj, idx) => {
          const dStr = formatDate(dObj.date);
          const isToday = dStr === todayStr;
          const dayTasks = tasks.filter((t) => t.startDate === dStr && t.status !== 'CANCELLED');

          return (
            <div
              key={idx}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dStr)}
              onClick={() => onQuickCreate(dStr, '09:00')}
              className={cn(
                'border-r border-b border-border/40 p-1.5 flex flex-col justify-between hover:bg-secondary/30 transition-colors cursor-pointer group min-h-[90px]',
                !dObj.isCurrentMonth ? 'opacity-40 bg-secondary/10' : '',
                isToday ? 'bg-primary/[0.03]' : ''
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isToday ? 'bg-primary text-primary-foreground shadow-neon-glow' : 'text-foreground'
                  )}
                >
                  {dObj.date.getDate()}
                </span>
                <span className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  + Thêm
                </span>
              </div>

              {/* Task list pills */}
              <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                {dayTasks.slice(0, 3).map((task) => {
                  const taskColor = task.color || task.project?.color || '#6366f1';
                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      style={{
                        backgroundColor: `${taskColor}14`,
                        borderColor: `${taskColor}35`,
                      }}
                      className="truncate text-[11px] pl-2 pr-1.5 py-0.5 rounded-md border hover:shadow-xs text-foreground font-medium transition-all hover:brightness-105 flex items-center gap-1.5"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: taskColor }}
                      />
                      {task.startTime && (
                        <span className="font-mono text-[9px] font-semibold shrink-0" style={{ color: taskColor }}>
                          {task.startTime}
                        </span>
                      )}
                      <span className="truncate flex-1">{task.title}</span>
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-muted-foreground font-medium px-1">
                    +{dayTasks.length - 3} việc khác
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
