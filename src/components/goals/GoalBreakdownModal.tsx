import React, { useState } from 'react';
import { Target, X, Sparkles, Calendar, Clock, CheckCircle2, Loader2, ArrowRight, Layers } from 'lucide-react';
import { GoalService } from '../../services/goal.service';
import { GoalRoadmapPlan } from '../../types';
import { cn } from '../../lib/utils';

interface GoalBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataMutated: () => void;
}

export const GoalBreakdownModal: React.FC<GoalBreakdownModalProps> = ({
  isOpen,
  onClose,
  onDataMutated,
}) => {
  const [goalTitle, setGoalTitle] = useState('');
  const [durationMonths, setDurationMonths] = useState(6);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [roadmapPlan, setRoadmapPlan] = useState<GoalRoadmapPlan | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleGeneratePlan = async () => {
    if (!goalTitle.trim() || isLoading) return;
    setIsLoading(true);
    setSuccessMsg('');
    try {
      const plan = await GoalService.planGoalDecomposition(goalTitle.trim(), durationMonths, hoursPerWeek);
      setRoadmapPlan(plan);
    } catch (err: any) {
      console.error('Goal plan failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!roadmapPlan || isCommitting) return;
    setIsCommitting(true);
    try {
      const result = await GoalService.commitGoalRoadmap(roadmapPlan);
      setSuccessMsg(`🎉 Đã tạo thành công dự án "${result.project.name}" cùng ${result.taskCount} công việc theo tuần!`);
      onDataMutated();
      setTimeout(() => {
        onClose();
        setRoadmapPlan(null);
        setGoalTitle('');
        setSuccessMsg('');
      }, 2500);
    } catch (err: any) {
      console.error('Commit goal failed:', err);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-card text-foreground rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center text-neon-purple">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                Quản Lý & Phân Rã Mục Tiêu Dài Hạn
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-purple/15 text-neon-purple font-semibold border border-neon-purple/30 uppercase">
                  AI Goal Strategist
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Nhập mục tiêu lớn — AI tự động tạo lộ trình các mốc và chia nhỏ task theo tuần
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Goal Input Form */}
          <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border/80">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Mục tiêu lớn bạn muốn chinh phục *
              </label>
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Ví dụ: Học tiếng Anh giao tiếp trong 6 tháng, Xây dựng app MVP, v.v."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-card border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Thời hạn mục tiêu
                </label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                >
                  <option value={1}>1 tháng (Sprint tập trung)</option>
                  <option value={2}>2 tháng</option>
                  <option value={3}>3 tháng (1 Quý)</option>
                  <option value={6}>6 tháng (Nửa năm)</option>
                  <option value={12}>12 tháng (1 Năm)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Thời gian cam kết / tuần
                </label>
                <select
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                >
                  <option value={3}>3 giờ / tuần (~25p mỗi ngày)</option>
                  <option value={5}>5 giờ / tuần (~45p mỗi ngày)</option>
                  <option value={10}>10 giờ / tuần (~1.5h mỗi ngày)</option>
                  <option value={15}>15+ giờ / tuần (Cường độ cao)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={!goalTitle.trim() || isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary to-neon-purple text-white font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-40 shadow-sm transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI đang phân tích và chia milestone theo tuần...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI Lập Kế Hoạch & Phân Rã Lộ Trình</span>
                </>
              )}
            </button>
          </div>

          {/* Success Notification */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Roadmap Preview */}
          {roadmapPlan && !successMsg && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Lộ trình các mốc tuần dự kiến ({roadmapPlan.milestones.length} tuần)</span>
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Tổng ước tính: ~{roadmapPlan.totalEstimatedHours} giờ
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {roadmapPlan.milestones.map((ms) => (
                  <div
                    key={ms.weekNumber}
                    className="p-3 rounded-xl bg-card border border-border/80 space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary">
                        {ms.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
                        {ms.tasks.length} task
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{ms.description}</p>
                    <div className="space-y-1 pt-1 border-t border-border/40">
                      {ms.tasks.map((t, tIdx) => (
                        <div key={tIdx} className="flex items-center justify-between text-[11px] text-foreground/80 py-0.5">
                          <span className="truncate">• {t.title}</span>
                          <span className="text-[10px] text-muted-foreground ml-2 font-mono flex-shrink-0">
                            {t.difficulty} (~{t.estimatedMinutes}p)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-card/80 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 font-medium transition-colors"
          >
            Đóng
          </button>

          {roadmapPlan && !successMsg && (
            <button
              onClick={handleCommit}
              disabled={isCommitting}
              className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu vào SQLite...</span>
                </>
              ) : (
                <>
                  <span>Khởi tạo Dự Án & Tasks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
