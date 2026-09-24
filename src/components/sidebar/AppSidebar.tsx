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
  AlertTriangle
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
}) => {
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isUnscheduledOpen, setIsUnscheduledOpen] = useState(true);

  // Multi-selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Storage size state
  const [dbSize, setDbSize] = useState<string>('0 KB');

  // Project to delete confirmation
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    getDatabaseSize().then((res) => setDbSize(res.formatted));
  }, [unscheduledTasks, projects]);

  // Drag & Drop to Trash state
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);

  const toggleSelectTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.size === unscheduledTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(unscheduledTasks.map((t) => t.id)));
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setIsDragging(true);

    // If dragging a task that is selected, bundle all selected tasks!
    if (selectedTaskIds.has(task.id)) {
      const ids = Array.from(selectedTaskIds);
      e.dataTransfer.setData('taskIds', JSON.stringify(ids));
      e.dataTransfer.setData('text/plain', task.id);
    } else {
      e.dataTransfer.setData('taskIds', JSON.stringify([task.id]));
      e.dataTransfer.setData('text/plain', task.id);
    }

    e.dataTransfer.setData('application/json', JSON.stringify(task));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsOverTrash(false);
  };

  const handleTrashDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOverTrash(true);
  };

  const handleTrashDragLeave = () => {
    setIsOverTrash(false);
  };

  const handleTrashDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverTrash(false);
    setIsDragging(false);

    // Check if a project was dropped
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        setProjectToDelete(proj);
      }
      return;
    }

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
    <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        
        {/* SECTION 1: PROJECTS */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            <button
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

              {/* Project list with Progress */}
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
                  <div className="flex items-center justify-between mb-1.5">
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
                      {/* Action buttons on hover */}
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
                          className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(5, proj.progress ?? 0))}%`,
                        backgroundColor: proj.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: UNSCHEDULED TASKS (Chờ xếp lịch) */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            <button
              onClick={() => setIsUnscheduledOpen(!isUnscheduledOpen)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              {isUnscheduledOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>Chờ Xếp Lịch</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                {unscheduledTasks.length}
              </span>
            </button>

            <div className="flex items-center gap-1">
              {/* Toggle multi-select mode */}
              <button
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  if (isMultiSelectMode) setSelectedTaskIds(new Set());
                }}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                  isMultiSelectMode || selectedTaskIds.size > 0
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
                title="Bật chế độ chọn nhiều để xóa hoặc kéo thả"
              >
                {isMultiSelectMode || selectedTaskIds.size > 0 ? 'Hủy chọn' : 'Chọn nhiều'}
              </button>

              <button
                onClick={onOpenTaskModal}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Thêm việc chờ xếp lịch"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Multi-selection Toolbar */}
          {(isMultiSelectMode || selectedTaskIds.size > 0) && unscheduledTasks.length > 0 && (
            <div className="mb-2 p-2 rounded-lg bg-secondary/80 border border-border flex items-center justify-between text-xs">
              <span className="font-semibold text-primary text-[11px]">
                Đã chọn {selectedTaskIds.size} việc
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSelectAll}
                  className="px-2 py-0.5 rounded bg-card border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  {selectedTaskIds.size === unscheduledTasks.length ? 'Bỏ chọn' : 'Chọn hết'}
                </button>
                {selectedTaskIds.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-[10px] font-bold hover:opacity-90 flex items-center gap-1 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa ({selectedTaskIds.size})</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/70 px-1 mb-2">
            💡 Kéo vào Lịch để xếp giờ, hoặc kéo vào Thùng rác để xóa.
          </p>

          {isUnscheduledOpen && (
            <div className="space-y-1.5 min-h-[100px]">
              {unscheduledTasks.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground">
                  Không còn việc chưa xếp lịch 🎉
                </div>
              ) : (
                unscheduledTasks.map((task) => {
                  const isSelected = selectedTaskIds.has(task.id);
                  const isMultiSelecting = isMultiSelectMode || selectedTaskIds.size > 0;
                  const taskColor = task.color || task.project?.color;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        // In multi-select mode, clicking the card toggles selection instead of opening edit modal
                        if (isMultiSelecting) {
                          toggleSelectTask(e, task.id);
                        }
                      }}
                      onDoubleClick={(e) => {
                        if (!isMultiSelecting) {
                          e.stopPropagation();
                          onEditTask(task);
                        }
                      }}
                      style={
                        taskColor
                          ? {
                              backgroundColor: `${taskColor}14`,
                              borderColor: `${taskColor}40`,
                            }
                          : undefined
                      }
                      className={cn(
                        'group flex items-start gap-2 p-2 rounded-lg border transition-all hover:shadow-xs select-none relative',
                        isMultiSelecting
                          ? 'cursor-pointer'
                          : 'cursor-grab active:cursor-grabbing',
                        isSelected
                          ? 'bg-primary/20 border-primary/60 shadow-xs'
                          : taskColor
                          ? 'hover:brightness-105'
                          : 'bg-secondary/50 hover:bg-secondary border-border hover:border-primary/40'
                      )}
                    >
                      {/* Left Action Area: Selection & Completion (isolated from card click) */}
                      <div 
                        className="flex items-center gap-1 shrink-0 mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Checkbox for Multi-select or Drag handle */}
                        {isMultiSelecting ? (
                          <button
                            type="button"
                            onClick={(e) => toggleSelectTask(e, task.id)}
                            className="p-1 -m-1 rounded hover:bg-secondary/80 text-primary transition-colors shrink-0"
                            title={isSelected ? 'Bỏ chọn việc này' : 'Chọn việc này'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 fill-primary text-primary-foreground" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            )}
                          </button>
                        ) : (
                          <div 
                            className="p-1 -m-1 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 cursor-grab"
                            title="Kéo thả vào Lịch để xếp giờ hoặc kéo vào Thùng rác để xóa"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                        )}

                        {/* Complete status checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteTask(task.id, task.status !== 'DONE');
                          }}
                          className="p-1 -m-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-primary transition-colors shrink-0"
                          title={task.status === 'DONE' ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                        >
                          {task.status === 'DONE' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Circle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Content Area: Click title to open detail modal */}
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMultiSelecting) {
                              toggleSelectTask(e, task.id);
                            } else {
                              onEditTask(task);
                            }
                          }}
                          className={cn(
                            'text-left font-medium text-xs truncate block w-full transition-colors cursor-pointer',
                            isSelected
                              ? 'text-primary font-semibold'
                              : 'text-foreground hover:text-primary hover:underline'
                          )}
                          title={
                            isMultiSelecting
                              ? 'Bấm để chọn / bỏ chọn'
                              : 'Bấm để xem & sửa chi tiết công việc'
                          }
                        >
                          {task.title}
                        </button>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn('text-[9px] font-semibold px-1 py-0.2 rounded border', getPriorityBadgeColor(task.priority))}>
                            {task.priority}
                          </span>
                          {task.project && (
                            <span className="text-[9px] text-muted-foreground truncate">
                              • {task.project.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hover Action buttons when not in multi-select mode */}
                      {!isMultiSelecting && (
                        <div 
                          className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                            title="Xem chi tiết / Sửa việc này"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMultiSelectMode(true);
                              toggleSelectTask(e, task.id);
                            }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                            title="Chọn nhiều việc"
                          >
                            <Square className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>

      {/* DEDICATED TRASH DROP ZONE (Thùng rác kéo thả) */}
      <div className="p-3 border-t border-border/80 bg-card/40">
        <div
          onDragOver={handleTrashDragOver}
          onDragLeave={handleTrashDragLeave}
          onDrop={handleTrashDrop}
          onClick={() => {
            if (selectedTaskIds.size > 0) handleDeleteSelected();
          }}
          className={cn(
            'p-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold transition-all duration-200 select-none',
            isOverTrash
              ? 'bg-destructive/25 border-destructive text-destructive scale-105 shadow-neon-pink ring-2 ring-destructive/30'
              : isDragging
              ? 'bg-destructive/15 border-destructive/80 text-destructive animate-pulse shadow-sm'
              : selectedTaskIds.size > 0
              ? 'bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20 hover:border-destructive shadow-xs'
              : 'bg-secondary/40 border-border/70 text-muted-foreground hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5'
          )}
        >
          <Trash2 className={cn('w-4 h-4 transition-transform', isOverTrash ? 'scale-125 rotate-12 text-destructive' : '')} />
          <span>
            {isOverTrash
              ? 'Thả vào đây để xóa ngay!'
              : selectedTaskIds.size > 0
              ? `Kéo hoặc bấm để xóa (${selectedTaskIds.size} việc)`
              : isDragging
              ? 'Kéo vào đây để xóa việc'
              : 'Thùng rác (Kéo việc vào để xóa)'}
          </span>
        </div>
      </div>

      {/* Footer Info & Storage Usage */}
      <div className="px-3 py-2 border-t border-border bg-card/60 text-[11px] flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <HardDrive className="w-3.5 h-3.5 text-primary" />
          <span>Dung lượng DB:</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono font-bold text-foreground bg-secondary/80 px-2 py-0.5 rounded-md border border-border/60 shadow-xs">
          <span>{dbSize}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Local SQLite Active" />
        </div>
      </div>

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-glass p-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 text-red-500 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-foreground">Xóa dự án này?</h4>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                  Bạn có chắc muốn xóa dự án <strong>"{projectToDelete.name}"</strong>?
                  <br />
                  Các công việc bên trong sẽ <strong>được giữ lại an toàn</strong> (trở thành công việc tự do).
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
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa dự án
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
