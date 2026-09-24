import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Calendar, Sparkles, Sun, Moon, Zap, Settings, CheckSquare, Folder, ArrowRight, BookOpen, Target, X } from 'lucide-react';
import { Task, Project, ThemeMode, CalendarViewMode } from '../../types';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onOpenTaskModal: () => void;
  onToggleAgent: () => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenSettings: () => void;
  onSelectTask: (task: Task) => void;
  onOpenBriefing?: (mode: 'morning' | 'evening') => void;
  onOpenGoalBreakdown?: () => void;
  onOpenUserGuide?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tasks,
  projects,
  onOpenTaskModal,
  onToggleAgent,
  onViewModeChange,
  onThemeChange,
  onOpenSettings,
  onSelectTask,
  onOpenBriefing,
  onOpenGoalBreakdown,
  onOpenUserGuide,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Actions list
  const actions = [
    {
      id: 'act-new-task',
      label: 'Tạo công việc mới',
      category: 'Hành động nhanh',
      icon: <Plus className="w-4 h-4 text-primary" />,
      shortcut: 'Ctrl+N',
      run: () => { onClose(); onOpenTaskModal(); },
    },
    {
      id: 'act-guide',
      label: 'Xem Cẩm nang hướng dẫn sử dụng ứng dụng',
      category: 'Hành động nhanh',
      icon: <BookOpen className="w-4 h-4 text-primary" />,
      shortcut: 'F1',
      run: () => { onClose(); onOpenUserGuide?.(); },
    },
    {
      id: 'act-morning-briefing',
      label: 'Bản tin chào buổi sáng (Top 3 Tiêu điểm)',
      category: 'Trợ lý AI',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      run: () => { onClose(); onOpenBriefing?.('morning'); },
    },
    {
      id: 'act-evening-review',
      label: 'Tổng kết ngày & Dời việc tồn đọng (1-Click)',
      category: 'Trợ lý AI',
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
      run: () => { onClose(); onOpenBriefing?.('evening'); },
    },
    {
      id: 'act-goal-breakdown',
      label: 'Quản lý & Phân rã mục tiêu dài hạn theo tuần',
      category: 'Trợ lý AI',
      icon: <Target className="w-4 h-4 text-neon-purple" />,
      run: () => { onClose(); onOpenGoalBreakdown?.(); },
    },
    {
      id: 'act-agent',
      label: 'Mở Trợ lý AI Agent',
      category: 'Hành động nhanh',
      icon: <Sparkles className="w-4 h-4 text-neon-purple" />,
      shortcut: 'Ctrl+J',
      run: () => { onClose(); onToggleAgent(); },
    },
    {
      id: 'act-view-day',
      label: 'Chuyển sang chế độ xem Ngày',
      category: 'Điều hướng',
      icon: <Calendar className="w-4 h-4 text-muted-foreground" />,
      shortcut: 'Ctrl+1',
      run: () => { onClose(); onViewModeChange('day'); },
    },
    {
      id: 'act-view-week',
      label: 'Chuyển sang chế độ xem Tuần (Google Calendar)',
      category: 'Điều hướng',
      icon: <Calendar className="w-4 h-4 text-muted-foreground" />,
      shortcut: 'Ctrl+2',
      run: () => { onClose(); onViewModeChange('week'); },
    },
    {
      id: 'act-view-month',
      label: 'Chuyển sang chế độ xem Tháng',
      category: 'Điều hướng',
      icon: <Calendar className="w-4 h-4 text-muted-foreground" />,
      shortcut: 'Ctrl+3',
      run: () => { onClose(); onViewModeChange('month'); },
    },
    {
      id: 'act-theme-dark-neon',
      label: 'Đổi theme: Cyberpunk Neon',
      category: 'Giao diện',
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      run: () => { onClose(); onThemeChange('dark-neon'); },
    },
    {
      id: 'act-theme-light-neon',
      label: 'Đổi theme: Pink Neon',
      category: 'Giao diện',
      icon: <Zap className="w-4 h-4 text-pink-400" />,
      run: () => { onClose(); onThemeChange('light-neon'); },
    },
    {
      id: 'act-theme-dark',
      label: 'Đổi theme: Dark Slate',
      category: 'Giao diện',
      icon: <Moon className="w-4 h-4 text-muted-foreground" />,
      run: () => { onClose(); onThemeChange('dark'); },
    },
    {
      id: 'act-theme-light',
      label: 'Đổi theme: Clean Light',
      category: 'Giao diện',
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      run: () => { onClose(); onThemeChange('light'); },
    },
    {
      id: 'act-settings',
      label: 'Cài đặt & Quản lý Memory',
      category: 'Hệ thống',
      icon: <Settings className="w-4 h-4 text-muted-foreground" />,
      run: () => { onClose(); onOpenSettings(); },
    },
  ];

  // Matched tasks
  const matchedTasks = tasks
    .filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || (t.description && t.description.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 5)
    .map(t => ({
      id: `task-${t.id}`,
      label: t.title,
      category: 'Công việc',
      icon: <CheckSquare className="w-4 h-4 text-primary" />,
      shortcut: t.startTime ? `${t.startDate || ''} ${t.startTime}` : 'Chưa xếp lịch',
      run: () => { onClose(); onSelectTask(t); },
    }));

  // Matched projects
  const matchedProjects = projects
    .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3)
    .map(p => ({
      id: `proj-${p.id}`,
      label: p.name,
      category: 'Dự án',
      icon: <Folder className="w-4 h-4" style={{ color: p.color }} />,
      shortcut: `${p.progress}%`,
      run: () => { onClose(); },
    }));

  const filteredActions = query.trim()
    ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const allItems = [...filteredActions, ...matchedTasks, ...matchedProjects];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 bg-black/25 backdrop-blur-xs p-3 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-glass overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
      >
        {/* Search Header */}
        <div className="p-3 border-b border-border flex items-center gap-2.5 bg-card">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm công việc, dự án hoặc lệnh..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none min-w-0"
          />
          {/* Close button for touch & ESC for desktop */}
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-secondary border border-border rounded font-mono text-muted-foreground">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Results List */}
        <div className="p-2 overflow-y-auto space-y-1">
          {allItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Không tìm thấy kết quả nào phù hợp.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.run()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-foreground hover:bg-secondary/70'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={cn('text-[10px] font-mono', isSelected ? 'opacity-90' : 'text-muted-foreground')}>
                      {item.shortcut}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 opacity-90" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-2 border-t border-border bg-secondary/30 flex items-center justify-between text-[11px] text-muted-foreground px-3">
          <span>Dùng phím ↑ ↓ để chọn, Enter để chạy</span>
          <span className="font-mono">⌘K</span>
        </div>
      </div>
    </div>
  );
};
