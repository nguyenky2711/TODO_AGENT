import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  GripVertical,
  ChevronRight,
  ChevronDown,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  HardDrive,
  Pencil,
  AlertTriangle,
  FolderKanban,
  X,
  Calendar,
  Layers,
  Clock,
} from 'lucide-react';
import { Project, Task } from '../../types';
import { getDatabaseSize } from '../../db/sqlite';
import { cn, getPriorityBadgeColor } from '../../lib/utils';

interface AppSidebarProps {
  projects: Project[];
  unscheduledTasks: Task[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onOpenProjectModal: () => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => Promise<void>;
  onOpenTaskModal: () => void;
  onEditTask: (task: Task) => void;
  onCompleteTask: (id: string, isDone: boolean) => void;
  onBatchDeleteTasks: (ids: string[]) => Promise<void>;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  projects,
  unscheduledTasks,
  selectedProjectId,
  onSelectProject,
  onOpenProjectModal,
  onEditProject,
  onDeleteProject,
  onOpenTaskModal,
  onEditTask,
  onCompleteTask,
  onBatchDeleteTasks,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'unscheduled'>('projects');
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(true);

  // Multi-selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Storage size state
  const [dbSize, setDbSize] = useState<string>('0 KB');

  // Drag over trash state
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Project to delete confirmation
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    getDatabaseSize().then((res) => setDbSize(res.formatted));
  }, [unscheduledTasks, projects]);

  const toggleSelectTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllUnscheduled = () => {
    if (selectedTaskIds.size === unscheduledTasks.length) {
      setSelectedTaskIds(new Set());
      setIsMultiSelectMode(false);
    } else {
      setSelectedTaskIds(new Set(unscheduledTasks.map((t) => t.id)));
      setIsMultiSelectMode(true);
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.setData('application/json', JSON.stringify(task));

    if (selectedTaskIds.has(task.id)) {
      e.dataTransfer.setData('taskIds', JSON.stringify(Array.from(selectedTaskIds)));
    } else {
      e.dataTransfer.setData('taskIds', JSON.stringify([task.id]));
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsOverTrash(false);
  };

  const handleTrashDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverTrash(true);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTrashDragLeave = () => {
    setIsOverTrash(false);
  };

  const handleTrashDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverTrash(false);
    setIsDragging(false);

    let idsToDelete: string[] = [];
    const taskIdsJson = e.dataTransfer.getData('taskIds');
    if (taskIdsJson) {
      try {
        idsToDelete = JSON.parse(taskIdsJson);
      } catch {}
    }

    if (idsToDelete.length === 0) {
      const singleId = e.dataTransfer.getData('text/plain');
      if (singleId) idsToDelete = [singleId];
    }

    if (idsToDelete.length > 0) {
      await onBatchDeleteTasks(idsToDelete);
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTaskIds.size === 0) return;
    const ids = Array.from(selectedTaskIds);
    await onBatchDeleteTasks(ids);
    setSelectedTaskIds(new Set());
    setIsMultiSelectMode(false);
  };

  return (
    <>
      {/* MOBILE BOTTOM SHEET (lg:hidden) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Subtle dismiss backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={onCloseMobile}
          />

          {/* Slide-Up Bottom Sheet Card */}
          <div className="relative w-full max-h-[72vh] bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 z-50 select-none">
            {/* Drag Handle & Header */}
            <div className="pt-2 px-4 pb-2 border-b border-border/70 flex flex-col gap-2 shrink-0 bg-card">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <FolderKanban className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-xs text-foreground">Dự Án & Việc Chưa Xếp</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onOpenProjectModal}
                    className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    + Dự án
                  </button>
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Segmented Mobile Tabs */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-secondary rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className={cn(
                    'py-1 text-xs font-semibold rounded-lg transition-all',
                    activeTab === 'projects'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground'
                  )}
                >
                  Dự Án ({projects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unscheduled')}
                  className={cn(
                    'py-1 text-xs font-semibold rounded-lg transition-all',
                    activeTab === 'unscheduled'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground'
                  )}
                >
                  Chờ Xếp Lịch ({unscheduledTasks.length})
                </button>
              </div>
            </div>

            {/* Mobile Sheet Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeTab === 'projects' ? (
                <div className="space-y-1.5">
                  {/* All projects pill */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProject(null);
                      onCloseMobile?.();
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between border transition-all',
                      selectedProjectId === null
                        ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-xs'
                        : 'bg-card border-border/70 text-foreground hover:bg-secondary'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <span>Tất cả dự án (Xem toàn bộ lịch)</span>
                    </div>
                  </button>

                  {/* Project items */}
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(proj.id === selectedProjectId ? null : proj.id);
                        onCloseMobile?.();
                      }}
                      className={cn(
                        'p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5',
                        selectedProjectId === proj.id
                          ? 'bg-secondary border-border shadow-xs ring-1 ring-primary/30'
                          : 'bg-card border-border/70 hover:bg-secondary/60'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: proj.color }}
                          />
                          <span className="font-semibold text-xs text-foreground truncate">
                            {proj.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {proj.progress ?? 0}%
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProject?.(proj);
                            }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-secondary rounded-full h-1 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${proj.progress ?? 0}%`,
                            backgroundColor: proj.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] text-muted-foreground">
                      Chạm vào việc để xem hoặc chỉnh sửa:
                    </span>
                    <button
                      type="button"
                      onClick={onOpenTaskModal}
                      className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      + Việc mới
                    </button>
                  </div>

                  {unscheduledTasks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Không còn công việc chờ xếp lịch 🎉
                    </div>
                  ) : (
                    unscheduledTasks.map((task) => {
                      const priorityColor = getPriorityBadgeColor(task.priority);
                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            onEditTask(task);
                            onCloseMobile?.();
                          }}
                          className="p-2.5 rounded-xl border border-border/70 bg-card hover:bg-secondary cursor-pointer transition-all shadow-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-xs text-foreground block truncate">
                              {task.title}
                            </span>
                            {task.description && (
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {task.description}
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0',
                              priorityColor
                            )}
                          >
                            {task.priority}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Mobile Bottom Bar Info */}
            <div className="p-2.5 border-t border-border/70 bg-card text-[10px] flex items-center justify-between text-muted-foreground shrink-0">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-primary" />
                SQLite Local-first
              </span>
              <span className="font-mono font-bold text-foreground bg-secondary px-1.5 py-0.5 rounded">
                {dbSize}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR (hidden lg:flex) */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card/60 backdrop-blur-md flex-col h-[calc(100vh-3.5rem)] select-none shrink-0">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* SECTION 1: PROJECTS */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              <button
                type="button"
                onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                {isProjectsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Dự Án / Mục Tiêu</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-secondary text-foreground/80 font-normal">
                  {projects.length}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenProjectModal}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Tạo dự án mới"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {isProjectsOpen && (
              <div className="space-y-1">
                {/* All Projects Option */}
                <button
                  type="button"
                  onClick={() => onSelectProject(null)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all',
                    selectedProjectId === null
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                      : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/70" />
                    <span>Tất cả dự án</span>
                  </div>
                </button>

                {/* Project List */}
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    draggable
                    onDragStart={(e) => {
                      setIsDragging(true);
                      e.dataTransfer.setData('projectId', proj.id);
                      e.dataTransfer.setData('text/plain', proj.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectProject(proj.id === selectedProjectId ? null : proj.id)}
                    className={cn(
                      'group cursor-pointer px-2.5 py-2 rounded-lg text-xs transition-all border relative',
                      selectedProjectId === proj.id
                        ? 'bg-secondary border-border shadow-xs'
                        : 'border-transparent hover:bg-secondary/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="font-medium text-foreground truncate">{proj.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-[10px] font-semibold text-muted-foreground group-hover:hidden">
                          {proj.progress ?? 0}%
                        </span>
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProject?.(proj);
                            }}
                            title="Sửa dự án"
                            className="p-1 rounded hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(proj);
                            }}
                            title="Xóa dự án"
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-secondary/80 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${proj.progress ?? 0}%`,
                          backgroundColor: proj.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: UNSCHEDULED TASKS */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              <button
                type="button"
                onClick={() => setIsUnscheduledOpen(!isUnscheduledOpen)}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                {isUnscheduledOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Chờ Xếp Lịch</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                  {unscheduledTasks.length}
                </span>
              </button>

              <div className="flex items-center gap-1">
                {unscheduledTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllUnscheduled}
                    className="p-1 hover:bg-secondary rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    title={selectedTaskIds.size > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  >
                    {selectedTaskIds.size === unscheduledTasks.length && unscheduledTasks.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenTaskModal}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Thêm việc chưa xếp lịch"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {isUnscheduledOpen && (
              <div className="space-y-1.5">
                {unscheduledTasks.length === 0 ? (
                  <div className="text-center py-4 px-2 rounded-xl bg-secondary/20 border border-border/40 text-[11px] text-muted-foreground">
                    <span>Không còn việc chờ xếp lịch 🎉</span>
                  </div>
                ) : (
                  unscheduledTasks.map((task) => {
                    const isSelected = selectedTaskIds.has(task.id);
                    const priorityColor = getPriorityBadgeColor(task.priority);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onEditTask(task)}
                        className={cn(
                          'group p-2 rounded-xl border bg-card/70 hover:bg-card hover:border-primary/40 cursor-grab active:cursor-grabbing transition-all shadow-xs relative flex items-start gap-2',
                          isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border/70'
                        )}
                      >
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {isMultiSelectMode ? (
                            <button
                              type="button"
                              onClick={(e) => toggleSelectTask(e, task.id)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <Square className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="font-semibold text-xs text-foreground truncate">{task.title}</span>
                            <span className={cn('text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase shrink-0', priorityColor)}>
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* TRASH DROP ZONE */}
        <div className="p-2.5 border-t border-border/70 bg-card/40 shrink-0">
          <div
            onDragOver={handleTrashDragOver}
            onDragLeave={handleTrashDragLeave}
            onDrop={handleTrashDrop}
            onClick={() => {
              if (selectedTaskIds.size > 0) handleDeleteSelected();
            }}
            className={cn(
              'p-2 rounded-xl border border-border/80 flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold transition-all duration-200 select-none',
              isOverTrash
                ? 'bg-destructive/20 border-destructive text-destructive scale-102 ring-1 ring-destructive/30'
                : isDragging
                ? 'bg-destructive/10 border-destructive/60 text-destructive animate-pulse'
                : selectedTaskIds.size > 0
                ? 'bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20'
                : 'bg-secondary/30 text-muted-foreground hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5'
            )}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px]">
              {isOverTrash
                ? 'Thả để xóa ngay'
                : selectedTaskIds.size > 0
                ? `Bấm để xóa (${selectedTaskIds.size} việc)`
                : 'Thùng rác (Kéo vào để xóa)'}
            </span>
          </div>
        </div>

        {/* Footer Database Size */}
        <div className="px-3 py-1.5 border-t border-border/60 bg-card/60 text-[10px] flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <HardDrive className="w-3 h-3 text-primary" />
            <span>SQLite Local:</span>
          </div>
          <div className="flex items-center gap-1 font-mono font-bold text-foreground bg-secondary/80 px-1.5 py-0.5 rounded border border-border/60">
            <span>{dbSize}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Delete Project Confirmation Modal */}
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-glass p-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3 text-destructive mb-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">Xóa dự án này?</h4>
                  <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                    Bạn có chắc muốn xóa dự án <strong>"{projectToDelete.name}"</strong>?
                    <br />
                    Các công việc bên trong sẽ <strong>được giữ lại an toàn</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (onDeleteProject) {
                      await onDeleteProject(projectToDelete.id);
                    }
                    setProjectToDelete(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa dự án
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
