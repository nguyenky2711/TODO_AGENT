import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  CheckSquare,
  Sparkles,
  Command,
  Sun,
  Moon,
  Zap,
  Settings,
  Plus,
  BookOpen,
  Target,
  Menu,
  X,
  MoreVertical,
} from 'lucide-react';
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
  onOpenBriefing: (mode: 'morning' | 'evening') => void;
  onOpenGoalBreakdown: () => void;
  onOpenUserGuide: () => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
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
  onOpenBriefing,
  onOpenGoalBreakdown,
  onOpenUserGuide,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const themes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Sáng', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'dark', label: 'Tối', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'light-neon', label: 'Pink Neon', icon: <Zap className="w-3.5 h-3.5 text-pink-500" /> },
    { id: 'dark-neon', label: 'Cyber Neon', icon: <Zap className="w-3.5 h-3.5 text-cyan-400" /> },
  ];

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const currentHour = new Date().getHours();
  const isEvening = currentHour >= 17;

  return (
    <header className="h-14 border-b border-border bg-card/85 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-30 transition-colors shrink-0">
      {/* Left: Mobile Menu Toggle + Brand */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Toggle for Sidebar */}
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={isMobileSidebarOpen ? 'Đóng menu dự án' : 'Mở danh sách dự án & việc'}
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-primary to-neon-purple flex items-center justify-center text-white shadow-neon-glow shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Todo Agent
            </span>
            <span className="hidden sm:inline-block text-[9px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Local-First
            </span>
          </div>
        </div>
      </div>

      {/* Center: View Switcher (Day / Week / Month) */}
      <div className="flex items-center bg-secondary p-0.5 sm:p-1 rounded-lg border border-border/60">
        <button
          type="button"
          onClick={() => onViewModeChange('day')}
          className={cn(
            'px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all',
            viewMode === 'day'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Xem theo Ngày (Ctrl + 1)"
        >
          Ngày
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('week')}
          className={cn(
            'px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all',
            viewMode === 'week'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Xem theo Tuần (Ctrl + 2)"
        >
          Tuần
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('month')}
          className={cn(
            'px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-all',
            viewMode === 'month'
              ? 'bg-card text-foreground shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Xem theo Tháng (Ctrl + 3)"
        >
          Tháng
        </button>
      </div>

      {/* Right: Desktop Controls vs Mobile Overflow */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick Add Task Button */}
        <button
          type="button"
          onClick={onOpenTaskModal}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-lg shadow-xs transition-all active:scale-95"
          title="Tạo việc mới (Ctrl + N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tạo việc</span>
        </button>

        {/* AI Agent Button */}
        <button
          type="button"
          onClick={onToggleAgent}
          className={cn(
            'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95',
            isAgentOpen
              ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white border-transparent shadow-neon-glow'
              : 'bg-secondary hover:bg-secondary/80 text-foreground border-border'
          )}
          title="Trợ lý AI (Ctrl + J)"
        >
          <Sparkles className="w-3.5 h-3.5 text-neon-cyan sm:text-inherit" />
          <span className="hidden sm:inline">AI Agent</span>
        </button>

        {/* DESKTOP ONLY TOOLBAR (Hidden on < lg) */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Command Palette Button */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground bg-secondary/80 hover:bg-secondary rounded-lg border border-border transition-colors"
            title="Mở bảng lệnh (Ctrl + K)"
          >
            <Command className="w-3.5 h-3.5" />
            <kbd className="px-1.5 py-0.5 text-[10px] bg-background border border-border rounded font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Daily Briefing */}
          <button
            type="button"
            onClick={() => onOpenBriefing(isEvening ? 'evening' : 'morning')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground rounded-lg border border-border transition-all"
            title="Bản tin sáng / Tổng kết ngày"
          >
            {isEvening ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tổng kết ngày</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Bản tin sáng</span>
              </>
            )}
          </button>

          {/* Goals */}
          <button
            type="button"
            onClick={onOpenGoalBreakdown}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground rounded-lg border border-border transition-all"
            title="Phân rã mục tiêu lớn bằng AI"
          >
            <Target className="w-3.5 h-3.5 text-neon-purple" />
            <span>Mục tiêu</span>
          </button>

          {/* User Guide */}
          <button
            type="button"
            onClick={onOpenUserGuide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground rounded-lg border border-border transition-all"
            title="Cẩm nang hướng dẫn sử dụng (F1)"
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span className="hidden xl:inline">Hướng dẫn</span>
          </button>

          {/* Themes */}
          <div className="flex items-center bg-secondary/60 rounded-lg p-0.5 border border-border">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
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
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            title="Cài đặt & Gemini API Key"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* MOBILE OVERFLOW MENU BUTTON (Visible on < lg) */}
        <div className="relative lg:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Thêm tùy chọn"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Mobile Dropdown Panel */}
          {isMobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-card border border-border shadow-glass p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenCommandPalette();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary flex items-center justify-between text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Command className="w-3.5 h-3.5 text-primary" />
                  <span>Tìm kiếm lệnh...</span>
                </div>
                <kbd className="text-[10px] font-mono px-1 py-0.5 bg-secondary rounded border border-border">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenBriefing(isEvening ? 'evening' : 'morning');
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary flex items-center gap-2 text-foreground"
              >
                {isEvening ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tổng kết cuối ngày</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bản tin sáng</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenGoalBreakdown();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary flex items-center gap-2 text-foreground"
              >
                <Target className="w-3.5 h-3.5 text-neon-purple" />
                <span>Phân rã mục tiêu (AI)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenUserGuide();
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary flex items-center gap-2 text-foreground"
              >
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Cẩm nang hướng dẫn</span>
              </button>

              <div className="border-t border-border/60 my-1 pt-1">
                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Giao diện (Theme)
                </div>
                <div className="grid grid-cols-4 gap-1 px-2 py-1">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onThemeChange(t.id)}
                      className={cn(
                        'p-1.5 rounded-lg flex items-center justify-center transition-all',
                        theme === t.id
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                      )}
                      title={t.label}
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border/60 my-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-secondary flex items-center gap-2 text-foreground"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Cài đặt hệ thống</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
