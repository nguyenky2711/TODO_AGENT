import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, FolderKanban, Plus, Search, Sparkles } from 'lucide-react';
import { CalendarViewMode, ThemeMode, Task, Project } from './types';
import { cn } from './lib/utils';
import { Navbar } from './components/layout/Navbar';
import { AppSidebar } from './components/sidebar/AppSidebar';
import { CalendarContainer } from './components/calendar/CalendarContainer';
import { AgentDrawer } from './components/agent/AgentDrawer';
import { TaskModal } from './components/tasks/TaskModal';
import { ProjectModal } from './components/projects/ProjectModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { CommandPalette } from './components/command/CommandPalette';
import { NotificationBanner } from './components/notifications/NotificationBanner';
import { UserGuideModal } from './components/guide/UserGuideModal';
import { DailyBriefingModal } from './components/briefing/DailyBriefingModal';
import { GoalBreakdownModal } from './components/goals/GoalBreakdownModal';
import { getDatabase } from './db/sqlite';
import { seedInitialDataIfNeeded } from './db/seed';
import { TaskService } from './services/task.service';
import { ProjectService } from './services/project.service';
import { NotificationService } from './services/notification.service';

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme_mode') as ThemeMode) || 'dark-neon';
  });

  // Calendar & View state
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Entities state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  // Modals & Panels state (Responsive default: Agent closed on mobile unless ?agent=true)
  const [isAgentOpen, setIsAgentOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('agent=true')) return true;
    return typeof window !== 'undefined' ? window.innerWidth >= 1280 : false;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(() => typeof window !== 'undefined' && window.location.search.includes('sidebar=true'));
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(() => typeof window !== 'undefined' && window.location.search.includes('cmd=true'));
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [briefingMode, setBriefingMode] = useState<'morning' | 'evening'>('morning');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [quickCreateDate, setQuickCreateDate] = useState<string | undefined>();
  const [quickCreateTime, setQuickCreateTime] = useState<string | undefined>();

  // Apply theme to document class
  useEffect(() => {
    document.documentElement.className = theme === 'light' ? '' : theme;
    localStorage.setItem('theme_mode', theme);
  }, [theme]);

  // Load Database and initial seed
  const loadData = useCallback(async () => {
    try {
      const [fetchedTasks, fetchedProjects] = await Promise.all([
        TaskService.getAll(),
        ProjectService.getAll(),
      ]);
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        await getDatabase();
        await seedInitialDataIfNeeded();
        await loadData();
        NotificationService.init();

        // Check Daily Morning Briefing auto-trigger on first morning open
        const todayDateStr = new Date().toISOString().split('T')[0];
        const lastBriefing = localStorage.getItem('last_briefing_date');
        const hour = new Date().getHours();
        if (lastBriefing !== todayDateStr && hour < 12) {
          setBriefingMode('morning');
          setIsBriefingOpen(true);
          localStorage.setItem('last_briefing_date', todayDateStr);
        }
      } catch (err) {
        console.error('Error during app initialization:', err);
      } finally {
        setIsDbReady(true);
      }
    };

    initApp();
  }, [loadData]);

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+N, Ctrl+J, Ctrl+1/2/3, F1, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingTask(null);
        setQuickCreateDate(undefined);
        setQuickCreateTime(undefined);
        setIsTaskModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsAgentOpen((prev) => !prev);
      } else if (e.key === 'F1') {
        e.preventDefault();
        setIsUserGuideOpen((prev) => !prev);
      } else if (!isInput && (e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setViewMode('day');
      } else if (!isInput && (e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setViewMode('week');
      } else if (!isInput && (e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        setViewMode('month');
      } else if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setIsProjectModalOpen(false);
        setIsSettingsOpen(false);
        setIsCommandPaletteOpen(false);
        setIsUserGuideOpen(false);
        setIsBriefingOpen(false);
        setIsGoalModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleScheduleTask = async (taskId: string, date: string, startTime: string, endTime: string) => {
    await TaskService.schedule(taskId, date, startTime, endTime);
    await loadData();
  };

  const handleQuickCreate = (date: string, startTime: string) => {
    setEditingTask(null);
    setQuickCreateDate(date);
    setQuickCreateTime(startTime);
    setIsTaskModalOpen(true);
  };

  const handleCompleteTask = async (taskId: string, isDone: boolean) => {
    await TaskService.complete(taskId, isDone);
    await loadData();
  };

  const handleSaveTask = async (data: Partial<Task>): Promise<Task> => {
    let saved: Task;
    if (data.id) {
      saved = await TaskService.update(data.id, data);
    } else {
      saved = await TaskService.create(data);
    }
    await loadData();
    return saved;
  };

  const handleDeleteTask = async (id: string) => {
    await TaskService.delete(id);
    await loadData();
    setIsTaskModalOpen(false);
  };

  const handleBatchDeleteTasks = async (ids: string[]) => {
    for (const id of ids) {
      await TaskService.delete(id);
    }
    await loadData();
  };

  const handleSaveProject = async (data: Partial<Project>) => {
    if (data.id) {
      await ProjectService.update(data.id, data);
    } else {
      await ProjectService.create(data);
    }
    await loadData();
  };

  const handleDeleteProject = async (id: string) => {
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
    }
    await ProjectService.delete(id);
    await loadData();
  };

  // Filter tasks if project is selected
  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  const unscheduledTasks = tasks.filter(
    (t) => (!t.startDate || !t.startTime) && t.status !== 'DONE' && t.status !== 'CANCELLED'
  );

  if (!isDbReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground select-none">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-neon-purple flex items-center justify-center text-white shadow-neon-glow animate-pulse-glow mb-4">
          <span className="font-bold text-xl">⚡</span>
        </div>
        <h2 className="text-base font-bold tracking-tight">Đang tải Personal Productivity Agent...</h2>
        <p className="text-xs text-muted-foreground mt-1">Khởi tạo SQLite database trên máy...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        theme={theme}
        onThemeChange={setTheme}
        onOpenTaskModal={() => {
          setEditingTask(null);
          setQuickCreateDate(undefined);
          setQuickCreateTime(undefined);
          setIsTaskModalOpen(true);
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleAgent={() => setIsAgentOpen((prev) => !prev)}
        isAgentOpen={isAgentOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBriefing={(mode) => {
          setBriefingMode(mode);
          setIsBriefingOpen(true);
        }}
        onOpenGoalBreakdown={() => setIsGoalModalOpen(true)}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main Workspace: 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Projects & Unscheduled Tasks */}
        <AppSidebar
          projects={projects}
          unscheduledTasks={unscheduledTasks}
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setIsMobileSidebarOpen(false);
          }}
          onOpenProjectModal={() => {
            setEditingProject(null);
            setIsProjectModalOpen(true);
          }}
          onEditProject={(proj) => {
            setEditingProject(proj);
            setIsProjectModalOpen(true);
          }}
          onDeleteProject={handleDeleteProject}
          onOpenTaskModal={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onCompleteTask={handleCompleteTask}
          onBatchDeleteTasks={handleBatchDeleteTasks}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
        {/* Center: Google Calendar Grid Container */}
        <CalendarContainer
          viewMode={viewMode}
          currentDate={currentDate}
          tasks={filteredTasks}
          onDateChange={setCurrentDate}
          onTaskClick={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onScheduleTask={handleScheduleTask}
          onQuickCreate={handleQuickCreate}
          onCompleteTask={handleCompleteTask}
        />

        {/* Right: AI Agent Assistant Drawer */}
        <AgentDrawer
          isOpen={isAgentOpen}
          onClose={() => setIsAgentOpen(false)}
          onDataMutated={loadData}
          onOpenGuide={() => setIsUserGuideOpen(true)}
        />
      </div>
      {/* Mobile Bottom Navigation Bar (Visible on < lg) */}
      <nav className="lg:hidden h-14 border-t border-border bg-card/95 backdrop-blur-xl px-2 flex items-center justify-around z-30 shrink-0 select-none">
        <button
          type="button"
          onClick={() => {
            setSelectedProjectId(null);
            setIsMobileSidebarOpen(false);
            setIsAgentOpen(false);
          }}
          className={cn(
            'flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
            !isMobileSidebarOpen && !isAgentOpen ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Lịch</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsAgentOpen(false);
            setIsMobileSidebarOpen((prev) => !prev);
          }}
          className={cn(
            'flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
            isMobileSidebarOpen ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Dự án</span>
        </button>

        {/* Quick Add Center FAB */}
        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setQuickCreateDate(undefined);
            setQuickCreateTime(undefined);
            setIsTaskModalOpen(true);
          }}
          className="w-10 h-10 -mt-4 rounded-full bg-gradient-to-tr from-primary to-neon-purple text-white flex items-center justify-center shadow-neon-glow active:scale-95 transition-transform"
          title="Tạo việc mới"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Tìm kiếm</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsMobileSidebarOpen(false);
            setIsAgentOpen((prev) => !prev);
          }}
          className={cn(
            'flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
            isAgentOpen ? 'text-neon-pink font-bold' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="w-4 h-4 text-neon-cyan" />
          <span>AI Agent</span>
        </button>
      </nav>

      {/* Overlays and Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={editingTask}
        projects={projects}
        defaultDate={quickCreateDate}
        defaultStartTime={quickCreateTime}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        project={editingProject}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataMutated={loadData}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tasks={tasks}
        projects={projects}
        onOpenTaskModal={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        onToggleAgent={() => setIsAgentOpen((prev) => !prev)}
        onViewModeChange={setViewMode}
        onThemeChange={setTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectTask={(task) => {
          setEditingTask(task);
          setIsTaskModalOpen(true);
        }}
        onOpenBriefing={(mode) => {
          setBriefingMode(mode);
          setIsBriefingOpen(true);
        }}
        onOpenGoalBreakdown={() => setIsGoalModalOpen(true)}
        onOpenUserGuide={() => setIsUserGuideOpen(true)}
      />

      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
        onUsePrompt={(_prompt) => {
          setIsAgentOpen(true);
        }}
      />

      <DailyBriefingModal
        isOpen={isBriefingOpen}
        mode={briefingMode}
        onClose={() => setIsBriefingOpen(false)}
        onDataMutated={loadData}
      />

      <GoalBreakdownModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onDataMutated={loadData}
      />

      <NotificationBanner onDataMutated={loadData} />
    </div>
  );
};
