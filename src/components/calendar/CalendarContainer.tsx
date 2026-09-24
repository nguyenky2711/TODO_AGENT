import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarViewMode, Task } from '../../types';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { MonthView } from './MonthView';

interface CalendarContainerProps {
  viewMode: CalendarViewMode;
  currentDate: Date;
  tasks: Task[];
  onDateChange: (date: Date) => void;
  onTaskClick: (task: Task) => void;
  onScheduleTask: (taskId: string, date: string, startTime: string, endTime: string) => void;
  onQuickCreate: (date: string, startTime: string) => void;
  onCompleteTask: (taskId: string, isDone: boolean) => void;
}

export const CalendarContainer: React.FC<CalendarContainerProps> = ({
  viewMode,
  currentDate,
  tasks,
  onDateChange,
  onTaskClick,
  onScheduleTask,
  onQuickCreate,
  onCompleteTask,
}) => {
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    onDateChange(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    onDateChange(d);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const monthYearTitle = currentDate.toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-background">
      {/* Sub-Header Navigation */}
      <div className="h-11 sm:h-12 border-b border-border px-3 sm:px-4 flex items-center justify-between bg-card/60 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-border bg-secondary/80 hover:bg-secondary text-foreground transition-all shadow-xs"
          >
            Hôm nay
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-foreground capitalize flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {monthYearTitle}
          </span>
        </div>

        <div className="text-xs text-muted-foreground hidden sm:block">
          {viewMode === 'week' ? 'Chế độ xem Tuần (Chuẩn Google Calendar)' : viewMode === 'day' ? 'Chế độ xem Ngày' : 'Chế độ xem Tháng'}
        </div>
      </div>

      {/* Main View Display */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            tasks={tasks}
            onTaskClick={onTaskClick}
            onScheduleTask={onScheduleTask}
            onQuickCreate={onQuickCreate}
            onCompleteTask={onCompleteTask}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            tasks={tasks}
            onTaskClick={onTaskClick}
            onScheduleTask={onScheduleTask}
            onQuickCreate={onQuickCreate}
            onCompleteTask={onCompleteTask}
          />
        )}
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            tasks={tasks}
            onTaskClick={onTaskClick}
            onScheduleTask={onScheduleTask}
            onQuickCreate={onQuickCreate}
          />
        )}
      </div>
    </div>
  );
};
