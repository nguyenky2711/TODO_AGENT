import React from 'react';
import { Calendar, CheckSquare, Sparkles, Command, Sun, Moon, Zap, Settings, Plus } from 'lucide-react';
import { CalendarViewMode, ThemeMode } from '../../types';
import { cn } from '../../lib/utils';

interface NavbarProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenTaskModal: () => void;
  onOpenCommandPalette: () => void;
  onToggleAgent: () => void;
  isAgentOpen: boolean;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  onViewModeChange,
  theme,
  onThemeChange,
  onOpenTaskModal,
  onOpenCommandPalette,
  onToggleAgent,
  isAgentOpen,
  onOpenSettings,
}) => {
  const themes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'light-neon', label: 'Pink Neon', icon: <Zap className="w-3.5 h-3.5 text-pink-500" /> },
    { id: 'dark-neon', label: 'Cyber Neon', icon: <Zap className="w-3.5 h-3.5 text-cyan-400" /> },
  ];

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md px-4 flex items-center justify-between z-30 transition-colors">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-neon-purple flex items-center justify-center text-white shadow-neon-glow">
          <CheckSquare className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Productivity Agent
          </span>
          <span className="text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            Local-First
          </span>
        </div>
      </div>

      {/* Center: View Switcher (Day / Week / Month) */}
      <div className="flex items-center bg-secondary p-1 rounded-lg border border-border/60">
        <button
          onClick={() => onViewModeChange('day')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-all',
            viewMode === 'day'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Ctrl + 1"
        >
          Ngày <span className="text-[10px] opacity-60">1</span>
        </button>
        <button
          onClick={() => onViewModeChange('week')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-all',
            viewMode === 'week'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Ctrl + 2"
        >
          Tuần <span className="text-[10px] opacity-60">2</span>
        </button>
        <button
          onClick={() => onViewModeChange('month')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-all',
            viewMode === 'month'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Ctrl + 3"
        >
          Tháng <span className="text-[10px] opacity-60">3</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Command Palette Button */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted-foreground bg-secondary/80 hover:bg-secondary rounded-lg border border-border transition-colors"
          title="Mở bảng lệnh (Ctrl + K)"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Tìm kiếm...</span>
          <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] bg-background border border-border rounded font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Quick Add Task */}
        <button
          onClick={onOpenTaskModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-lg shadow-sm transition-all active:scale-95"
          title="Tạo việc mới (Ctrl + N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo việc</span>
        </button>

        {/* 4-Theme Dropdown / Switcher */}
        <div className="flex items-center bg-secondary/60 rounded-lg p-0.5 border border-border">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={cn(
                'p-1.5 rounded-md transition-all',
                theme === t.id
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={`Chuyển sang ${t.label}`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          title="Cài đặt & Gemini API Key"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* AI Agent Toggle Button */}
        <button
          onClick={onToggleAgent}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all',
            isAgentOpen
              ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white border-transparent shadow-neon-glow'
              : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
          )}
          title="Trợ lý AI (Ctrl + J)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Agent</span>
          <kbd className="text-[9px] px-1 py-0.2 rounded bg-black/20 opacity-80 font-mono">
            Ctrl+J
          </kbd>
        </button>
      </div>
    </header>
  );
};
