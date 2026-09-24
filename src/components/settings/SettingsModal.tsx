import React, { useState, useEffect } from 'react';
import { X, Key, Brain, Database, Check, Save, RotateCw, Trash2, HardDrive, Bell, Volume2, Smartphone } from 'lucide-react';
import { NotificationService } from '../../services/notification.service';
import { MemoryService } from '../../services/memory.service';
import { AgentMemory } from '../../types';
import { getDatabaseSize } from '../../db/sqlite';
import { seedInitialDataIfNeeded } from '../../db/seed';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataMutated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataMutated,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [isSavedKey, setIsSavedKey] = useState(false);
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemVal, setNewMemVal] = useState('');
  const [dbSize, setDbSize] = useState('0 KB');
  const [notifStatus, setNotifStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('gemini_api_key') || '';
      const savedModel = localStorage.getItem('gemini_model') || '';
      setApiKey(saved);
      setModelName(savedModel);
      setIsSavedKey(false);
      setNotifStatus(NotificationService.getPermissionStatus());
      loadMemories();
    }
  }, [isOpen]);

  const loadMemories = async () => {
    const list = await MemoryService.getAll();
    setMemories(list);
    const size = await getDatabaseSize();
    setDbSize(size.formatted);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    if (modelName.trim()) {
      localStorage.setItem('gemini_model', modelName.trim());
    } else {
      localStorage.removeItem('gemini_model');
    }
    setIsSavedKey(true);
    setTimeout(() => setIsSavedKey(false), 2000);
  };

  const handleSaveMemory = async (key: string, val: string) => {
    await MemoryService.set(key, val);
    await loadMemories();
    onDataMutated();
  };

  const handleDeleteMemory = async (key: string) => {
    await MemoryService.delete(key);
    await loadMemories();
    onDataMutated();
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemKey.trim() || !newMemVal.trim()) return;
    await MemoryService.set(newMemKey.trim(), newMemVal.trim());
    setNewMemKey('');
    setNewMemVal('');
    await loadMemories();
    onDataMutated();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-xs p-3 sm:p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-glass overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-card/60">
          <h3 className="font-bold text-sm text-foreground">Cài Đặt Ứng Dụng & AI</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* SECTION 1: GEMINI API KEY */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/80 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <Key className="w-4 h-4 text-primary" />
              <span>Gemini Developer API Key (Google AI Studio)</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Nhập API Key để kích hoạt LLM trực tiếp (Free tier). Nếu để trống, app sẽ tự động dùng bộ phân tích thông minh offline.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
              >
                {isSavedKey ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavedKey ? 'Đã lưu' : 'Lưu'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-border/40">
              <label className="text-[11px] text-muted-foreground block mb-1 font-medium">
                Mô hình Gemini (Model):
              </label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Tự động tối ưu (Khuyên dùng gemini-3.6-flash)</option>
                <option value="gemini-3.6-flash">gemini-3.6-flash (Mới nhất, đề xuất)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>
          </div>

          {/* SECTION 2: AGENT STRUCTURED MEMORY */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <Brain className="w-4 h-4 text-neon-purple" />
                <span>Agent Memory (Bộ nhớ thói quen cá nhân)</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Lưu trong SQLite</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Agent tham khảo các giá trị này khi bạn yêu cầu xếp lịch tự động (ví dụ: giờ rảnh buổi tối, thời lượng tập piano...).
            </p>

            {/* Memory List */}
            <div className="space-y-1.5 pt-1">
              {memories.map((mem) => (
                <div
                  key={mem.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/60"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11px] font-semibold text-primary block truncate">
                      {mem.key}
                    </span>
                    {mem.description && (
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {mem.description}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <input
                      type="text"
                      defaultValue={mem.value}
                      onBlur={(e) => handleSaveMemory(mem.key, e.target.value)}
                      className="w-24 px-2 py-1 rounded bg-secondary text-foreground text-right font-mono text-[11px] border border-border focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(mem.key)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      title="Xóa thói quen này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add memory item */}
            <form onSubmit={handleAddMemory} className="pt-2 flex items-center gap-1.5 border-t border-border/40">
              <input
                type="text"
                value={newMemKey}
                onChange={(e) => setNewMemKey(e.target.value)}
                placeholder="Key (vd: workout_duration)"
                className="flex-1 px-2 py-1 rounded bg-card border border-border text-[11px] text-foreground"
              />
              <input
                type="text"
                value={newMemVal}
                onChange={(e) => setNewMemVal(e.target.value)}
                placeholder="Value (vd: 30)"
                className="w-24 px-2 py-1 rounded bg-card border border-border text-[11px] text-foreground text-right"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[11px]"
              >
                + Thêm
              </button>
            </form>
          </div>
          {/* SECTION 2.5: NOTIFICATIONS & AUDIO REMINDERS */}
          <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <Bell className="w-4 h-4 text-neon-cyan" />
                <span>Thông Báo & Nhắc Việc (iOS / Mobile / Web)</span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  notifStatus === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    : notifStatus === 'denied'
                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                }`}
              >
                {notifStatus === 'granted'
                  ? '✓ Đã kích hoạt'
                  : notifStatus === 'denied'
                  ? '✕ Bị chặn trong trình duyệt'
                  : notifStatus === 'unsupported'
                  ? 'Chưa hỗ trợ đẩy'
                  : 'Chưa cấp quyền'}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              App sẽ tự động phát âm chuông và gửi thông báo nhắc việc trước giờ diễn ra (theo cài đặt của từng công việc).
            </p>

            <div className="flex items-center gap-2 pt-1">
              {notifStatus !== 'granted' && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await NotificationService.requestPermission();
                    setNotifStatus(res);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Cho phép nhận thông báo
                </button>
              )}

              <button
                type="button"
                onClick={() => NotificationService.testChimeAndNotification()}
                className="px-3 py-1.5 rounded-lg bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Volume2 className="w-3.5 h-3.5 text-neon-cyan" />
                Thử chuông & rung
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-card border border-border/70 text-[11px] text-muted-foreground flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Lưu ý cho iPhone (iOS):</strong> Để nhận thông báo đẩy như app native, hãy mở Safari và bấm nút <strong>Chia sẻ</strong> &rarr; chọn <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong>.
              </div>
            </div>
          </div>


          {/* SECTION 3: LOCAL-FIRST INFO & STORAGE SIZE */}
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-[11px] text-muted-foreground flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Dung lượng đã sử dụng: <strong className="font-mono text-foreground">{dbSize}</strong></span>
              </div>
              <span className="font-mono text-emerald-500 font-bold">100% Offline</span>
            </div>
            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-[10px]">Cần lại dữ liệu mẫu ban đầu?</span>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Khôi phục các dự án và công việc mẫu ban đầu? Dữ liệu hiện tại sẽ được thêm mẫu.')) {
                    await seedInitialDataIfNeeded(true);
                    await loadMemories();
                    onDataMutated();
                  }
                }}
                className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[10px] flex items-center gap-1 transition-colors"
              >
                <RotateCw className="w-3 h-3" />
                Nạp lại dữ liệu mẫu
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
