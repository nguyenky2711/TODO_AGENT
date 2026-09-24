import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Bot,
  User,
  BookOpen,
  Trash2,
  Calendar,
  Clock,
  Target,
  Flame,
  ChevronDown,
} from 'lucide-react';
import { ChatMessage, ToolCall } from '../../ai/types';
import { AgentExecutor } from '../../ai/agent-executor';
import { AuditService } from '../../services/audit.service';
import { cn } from '../../lib/utils';

interface AgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataMutated: () => void;
  onOpenGuide?: () => void;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  isOpen,
  onClose,
  onDataMutated,
  onOpenGuide,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await AgentExecutor.processMessage(query, messages);
      setMessages((prev) => [...prev, response]);
      if (response.toolCalls && response.toolCalls.length > 0) {
        onDataMutated();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `❌ Gặp sự cố: ${errorMsg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = async (actionId: string, msgId: string) => {
    const success = await AuditService.undo(actionId);
    if (success) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                content: `${m.content}\n\n*(Đã hoàn tác [Undo] thành công)*`,
                actionId: undefined,
              }
            : m
        )
      );
      onDataMutated();
    }
  };

  const handleConfirmAction = async (msgId: string, toolCall: ToolCall) => {
    setIsLoading(true);
    try {
      const response = await AgentExecutor.processMessage('', messages, toolCall);
      setMessages((prev) =>
        prev
          .map((m) => (m.id === msgId ? { ...m, pendingConfirmation: undefined } : m))
          .concat(response)
      );
      onDataMutated();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              pendingConfirmation: undefined,
              content: `${m.content}\n\n*(Người dùng đã hủy thao tác)*`,
            }
          : m
      )
    );
  };

  const quickPills = [
    { label: '📅 Việc hôm nay & mai', prompt: 'Hôm nay và ngày mai tôi có việc gì?' },
    { label: '⏱️ Tìm giờ rảnh', prompt: 'Tối mai tôi rảnh lúc nào?' },
    { label: '🎯 Việc ưu tiên', prompt: 'Hôm nay tôi nên làm gì trước?' },
    { label: '🔥 Việc gấp 3 ngày', prompt: 'Tôi có việc gì gấp trong 3 ngày tới?' },
    { label: '🌙 Dời việc tồn', prompt: 'Dời các việc chưa xong hôm nay sang ngày mai lúc 9h' },
  ];

  if (!isOpen) return null;

  return (
    <aside
      className={cn(
        // Mobile / Tablet: Floating compact bottom sheet above the bottom nav, no screen blackout
        'fixed bottom-16 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 max-h-[58vh] rounded-2xl z-40',
        'border border-border/80 bg-card/95 backdrop-blur-xl shadow-glass flex flex-col',
        'animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 select-none',
        // Desktop (lg): Normal right-docked column in 3-column workspace
        'lg:static lg:bottom-auto lg:left-auto lg:right-auto lg:w-96 lg:max-h-none lg:h-[calc(100vh-3.5rem)]',
        'lg:rounded-none lg:border-t-0 lg:border-b-0 lg:border-r-0 lg:border-l lg:border-border lg:shadow-none lg:animate-none'
      )}
    >
      {/* Mini Header */}
      <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between bg-card/70 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-primary to-neon-purple flex items-center justify-center text-white shadow-neon-glow shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
            Trợ Lý AI
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </span>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Xóa đoạn chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              title="Cẩm nang câu lệnh (F1)"
            >
              <BookOpen className="w-3.5 h-3.5 text-primary" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            title="Đóng cửa sổ chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2.5 min-h-[140px]">
        {messages.length === 0 ? (
          /* Compact Helper Starter Box */
          <div className="py-2 px-1 text-center space-y-1.5">
            <p className="text-[11px] font-semibold text-foreground">
              Hỏi lịch, sắp xếp thời gian hoặc giao việc cho AI
            </p>
            <p className="text-[10px] text-muted-foreground">
              Chọn nhanh gợi ý bên dưới hoặc nhập câu hỏi trực tiếp:
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';

            return (
              <div
                key={m.id}
                className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[90%] rounded-xl p-2.5 text-xs leading-relaxed transition-all shadow-xs',
                    isUser
                      ? 'bg-gradient-to-r from-primary to-indigo-600 text-white rounded-br-xs'
                      : 'bg-secondary/70 text-foreground border border-border/70 rounded-bl-xs'
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75 font-semibold">
                    {isUser ? (
                      <>
                        <User className="w-3 h-3" />
                        <span>Bạn</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-primary" />
                        <span>AI Agent</span>
                      </>
                    )}
                  </div>

                  <div className="whitespace-pre-line select-text">{m.content}</div>

                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-border/40 space-y-1">
                      {m.toolCalls.map((tc, idx) => (
                        <div
                          key={idx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background/60 border border-border/70 flex items-center gap-1 text-primary"
                        >
                          <span>⚡ {tc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.pendingConfirmation && (
                    <div className="mt-2 p-2 rounded-lg bg-destructive/15 border border-destructive/30 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-destructive font-semibold text-[10px]">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Xác nhận xóa:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmAction(m.id, m.pendingConfirmation!.toolCall)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-destructive text-white rounded hover:opacity-90 transition-opacity"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelAction(m.id)}
                          className="px-2 py-0.5 text-[10px] font-medium bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}

                  {m.actionId && (
                    <div className="mt-1.5 pt-1 border-t border-border/40 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleUndo(m.actionId!, m.id)}
                        className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-background hover:bg-secondary text-primary border border-border transition-all shadow-xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Hoàn tác</span>
                      </button>
                    </div>
                  )}
                </div>

                <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                  {new Date(m.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-2 rounded-lg bg-secondary/50 border border-border/50 w-fit animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Đang xử lý yêu cầu...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Ribbon */}
      <div className="px-2 py-1.5 border-t border-border/50 bg-secondary/25 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {quickPills.map((pill, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(pill.prompt)}
            className="whitespace-nowrap px-2.5 py-1 text-[10px] font-medium rounded-full bg-card/90 hover:bg-secondary text-foreground border border-border/60 hover:border-primary/40 transition-all shadow-xs active:scale-95 shrink-0"
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Capsule Input Bar */}
      <div className="p-2 sm:p-2.5 border-t border-border/60 bg-card/85 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5 bg-secondary/70 border border-border/80 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 rounded-full px-3 py-1 transition-all"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Hỏi lịch, việc ưu tiên..."
            className="flex-1 bg-transparent py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none min-w-0"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="w-6 h-6 rounded-full bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-95"
            title="Gửi"
          >
            <Send className="w-3 h-3 ml-0.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
