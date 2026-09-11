import React, { useState, useEffect } from 'react';
import { X, FolderPlus, FolderEdit, Trash2, AlertTriangle } from 'lucide-react';
import { Project } from '../../types';
import { cn } from '../../lib/utils';

interface ProjectModalProps {
  isOpen: boolean;
  project?: Project | null;
  onClose: () => void;
  onSave: (data: Partial<Project>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const PALETTE = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
  '#3b82f6', // Blue
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  project,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setTargetDate(project.targetDate || '');
      setColor(project.color || PALETTE[0]);
    } else {
      setName('');
      setDescription('');
      setTargetDate('');
      setColor(PALETTE[0]);
    }
    setIsConfirmingDelete(false);
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: project?.id,
        name,
        description: description || undefined,
        targetDate: targetDate || undefined,
        color,
        status: project?.status || 'ACTIVE',
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!project?.id || !onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(project.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-glass overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-2">
            {project ? (
              <FolderEdit className="w-4 h-4 text-primary" />
            ) : (
              <FolderPlus className="w-4 h-4 text-primary" />
            )}
            <h3 className="font-bold text-sm text-foreground">
              {project ? 'Chỉnh Sửa Dự Án / Mục Tiêu' : 'Tạo Dự Án / Mục Tiêu Mới'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isConfirmingDelete ? (
          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Xác nhận xóa dự án?</p>
                <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                  Bạn có chắc chắn muốn xóa dự án <strong>"{project?.name}"</strong> không?
                  <br />
                  Các công việc thuộc dự án này <strong>vẫn được giữ lại an toàn</strong> và sẽ chuyển thành công việc tự do.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-3 py-1.5 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
              >
                Không xóa
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Đang xóa...' : 'Xóa dự án ngay'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Tên dự án *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Học TypeScript, Luyện Piano..."
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Màu nhận diện</label>
              <div className="flex items-center gap-2 mt-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      'w-6 h-6 rounded-full transition-transform',
                      color === c ? 'scale-125 ring-2 ring-primary ring-offset-2 ring-offset-card shadow-xs' : 'hover:scale-110'
                    )}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Mô tả mục tiêu</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kết quả kỳ vọng đạt được..."
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Ngày mục tiêu (Target Date)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div>
                {project && onDelete && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/10 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa dự án
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                >
                  {isSubmitting ? 'Đang lưu...' : project ? 'Lưu thay đổi' : 'Tạo dự án'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
