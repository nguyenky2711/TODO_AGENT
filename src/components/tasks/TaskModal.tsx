import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Tag, Trash2, Sparkles, AlertCircle, StickyNote } from 'lucide-react';
import { Task, Project, Priority, Difficulty, TaskStatus, TaskNote } from '../../types';
import { NoteService } from '../../services/note.service';
import { cn } from '../../lib/utils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  projects: Project[];
  defaultDate?: string;
  defaultStartTime?: string;
  onSave: (data: Partial<Task>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const COLOR_PALETTE = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#64748b', // Slate
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  task,
  projects,
  defaultDate,
  defaultStartTime,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [color, setColor] = useState('#6366f1');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [naturalInput, setNaturalInput] = useState('');

  // Take Notes state
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setProjectId(task.projectId || '');
      setColor(task.color || task.project?.color || '#6366f1');
      setStartDate(task.startDate || '');
      setStartTime(task.startTime || '');
      setEndTime(task.endTime || '');
      setDueDate(task.dueDate || '');
      setPriority(task.priority);
      setDifficulty(task.difficulty || 'MEDIUM');
      setEstimatedMinutes(task.estimatedMinutes ?? 30);
      setStatus(task.status);
      setReminderMinutes(task.reminderMinutesBefore ?? 10);
      NoteService.getByTaskId(task.id).then(setNotes);
    } else {
      setTitle('');
      setDescription('');
      setProjectId(projects[0]?.id || '');
      setColor(projects[0]?.color || '#6366f1');
      setStartDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime(defaultStartTime || '');
      if (defaultStartTime) {
        const [h] = defaultStartTime.split(':').map(Number);
        setEndTime(`${Math.min(23, h + 1).toString().padStart(2, '0')}:00`);
      } else {
        setEndTime('');
      }
      setDueDate('');
      setPriority('MEDIUM');
      setDifficulty('MEDIUM');
      setEstimatedMinutes(30);
      setStatus('TODO');
      setReminderMinutes(10);
      setNaturalInput('');
      setNotes([]);
    }
    setNewNoteText('');
  }, [task, defaultDate, defaultStartTime, projects, isOpen]);

  // Quick Natural Language Parse helper
  const handleParseNatural = () => {
    if (!naturalInput.trim()) return;
    const text = naturalInput.toLowerCase();
    
    // Find time
    const timeMatch = text.match(/(\d{1,2})[:h](\d{2})?|(\d{1,2})\s*(giờ|g)/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1] || timeMatch[3], 10);
      let minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (text.includes('tối') && hour < 12) hour += 12;
      if (text.includes('chiều') && hour < 12) hour += 12;
      const sh = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      setStartTime(sh);
      setEndTime(`${Math.min(23, hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    // Find date
    const now = new Date();
    if (text.includes('mai')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
    } else if (text.includes('hôm nay')) {
      setStartDate(now.toISOString().split('T')[0]);
    }

    // Find priority
    if (text.includes('gấp') || text.includes('quan trọng') || text.includes('cao')) {
      setPriority('HIGH');
    }

    // Clean title
    let clean = naturalInput
      .replace(/lúc\s*\d{1,2}[:h](\d{2})?/gi, '')
      .replace(/(\d{1,2})\s*(giờ|g)/gi, '')
      .replace(/hôm nay|ngày mai|tối nay|chiều nay/gi, '')
      .replace(/ưu tiên cao|gấp|quan trọng/gi, '')
      .trim();
    if (clean) setTitle(clean);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task?.id || !newNoteText.trim() || isAddingNote) return;
    setIsAddingNote(true);
    try {
      const created = await NoteService.create(task.id, newNoteText.trim(), status);
      setNotes((prev) => [created, ...prev]);
      setNewNoteText('');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await NoteService.delete(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: task?.id,
        title,
        description: description || undefined,
        projectId: projectId || undefined,
        startDate: startDate || undefined,
        startTime: startTime || undefined,
        endDate: startDate || undefined,
        endTime: endTime || undefined,
        dueDate: dueDate || undefined,
        priority,
        difficulty,
        estimatedMinutes,
        status,
        color: color || undefined,
        reminderMinutesBefore: reminderMinutes,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-glass overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/60">
          <h3 className="font-bold text-sm text-foreground">
            {task ? 'Chỉnh Sửa Công Việc' : 'Tạo Công Việc Mới'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Natural Language Quick Input */}
          {!task && (
            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-primary font-semibold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Add bằng ngôn ngữ tự nhiên:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  placeholder="Ví dụ: Luyện piano mai 7 giờ tối 45 phút"
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleParseNatural}
                  className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity shrink-0"
                >
                  Phân tích
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="font-semibold text-foreground block mb-1">
              Tiêu đề công việc *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập việc cần làm..."
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-foreground block mb-1">
              Mô tả chi tiết
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú, link, tài liệu..."
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Project & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Dự án / Mục tiêu
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  const newProjId = e.target.value;
                  setProjectId(newProjId);
                  const matched = projects.find((p) => p.id === newProjId);
                  if (matched) setColor(matched.color);
                }}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">(Không thuộc dự án nào)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Mức độ ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="LOW">Thấp (LOW)</option>
                <option value="MEDIUM">Vừa (MEDIUM)</option>
                <option value="HIGH">Cao (HIGH)</option>
              </select>
            </div>
          </div>

          {/* Difficulty & Estimated Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Độ khó (Tư duy)
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="EASY">Dễ (Ít tốn não / Việc nhẹ)</option>
                <option value="MEDIUM">Vừa (Tiêu chuẩn)</option>
                <option value="HARD">Khó (Tập trung sâu / Thách thức)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Thời lượng ước tính
              </label>
              <select
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value={15}>15 phút (⚡ Quick Win)</option>
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>60 phút (1 giờ)</option>
                <option value={90}>90 phút (1.5 giờ)</option>
                <option value={120}>120 phút (2 giờ)</option>
              </select>
            </div>
          </div>

          {/* Color Picker Swatches */}
          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground text-[11px]">
                Màu sắc nhận diện (Background Task)
              </label>
              <span className="text-[10px] text-muted-foreground">
                {projectId ? 'Mặc định theo dự án (có thể đổi)' : 'Tự do chọn màu theo ý thích'}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={cn(
                    'w-6 h-6 rounded-full transition-transform',
                    color === c
                      ? 'scale-125 ring-2 ring-primary ring-offset-2 ring-offset-card shadow-sm'
                      : 'hover:scale-110 opacity-70 hover:opacity-100'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Date & Time Scheduling */}
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/70 space-y-3">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Lịch trình trên Calendar (bỏ trống nếu chưa xếp lịch):
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Ngày làm</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Bắt đầu</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Kết thúc</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground focus:outline-none"
                />
              </div>
            </div>

            {/* Reminder selection */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Nhắc nhở trước:
              </span>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="px-2 py-1 rounded bg-card border border-border text-foreground text-[11px]"
              >
                <option value={5}>5 phút</option>
                <option value={10}>10 phút</option>
                <option value={15}>15 phút</option>
                <option value={30}>30 phút</option>
                <option value={60}>1 tiếng</option>
              </select>
            </div>
          </div>

          {/* Status if editing */}
          {task && (
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Trạng thái hiện tại
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="TODO">Chưa làm (TODO)</option>
                <option value="IN_PROGRESS">Đang làm (IN_PROGRESS)</option>
                <option value="DONE">Hoàn thành (DONE)</option>
                <option value="CANCELLED">Hủy bỏ (CANCELLED)</option>
              </select>
            </div>
          )}

          {/* SECTION: TAKE NOTES (Ghi chú tiến độ kèm thời gian & trạng thái) */}
          {task && (
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <StickyNote className="w-3.5 h-3.5 text-primary" />
                  Take Note (Tiến độ & Trạng thái)
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {notes.length} ghi chú
                </span>
              </div>

              {/* Input for new note */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNote(e);
                    }
                  }}
                  placeholder="Ghi chú nhanh (vd: Đã xong phần 1, đang review...)"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim() || isAddingNote}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
                >
                  + Note
                </button>
              </div>

              {/* Notes Timeline List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {notes.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 italic text-center py-2">
                    Chưa có note nào. Nhập ghi chú ở trên để lưu lại nhật ký công việc.
                  </p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2 rounded-lg bg-card/90 border border-border/60 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground leading-relaxed break-words font-medium">
                          {note.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider',
                              note.taskStatus === 'DONE'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                : note.taskStatus === 'IN_PROGRESS'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : note.taskStatus === 'CANCELLED'
                                ? 'bg-red-500/10 text-red-600 border-red-500/30'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                            )}
                          >
                            {note.taskStatus}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(note.createdAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-muted-foreground/50 hover:text-destructive rounded transition-colors"
                        title="Xóa note này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            {task && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="flex items-center gap-1 text-destructive hover:text-destructive/80 font-semibold text-xs px-2 py-1 rounded hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa việc</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-bold shadow-sm transition-all"
              >
                {isSubmitting ? 'Đang lưu...' : task ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
