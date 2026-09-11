import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, RotateCcw, AlertTriangle, Check, Loader2, Bot, User } from 'lucide-react';
import { ChatMessage, ToolCall } from '../../ai/types';
import { AgentExecutor } from '../../ai/agent-executor';
import { AuditService } from '../../services/audit.service';
import { cn } from '../../lib/utils';

interface AgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataMutated: () => void;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  isOpen,
  onClose,
  onDataMutated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Xin chào! Tôi là **Personal Productivity Agent** của bạn. 
Tôi có thể hỗ trợ bạn:
- Tra cứu lịch ngày hoặc tuần (vd: *"Mai tôi có gì?"*)
- Tìm khoảng thời gian trống (vd: *"Tối mai tôi rảnh lúc nào?"*)
- Sắp xếp công việc vào lịch theo sở thích cá nhân
- Tạo công việc mới nhanh chóng

Hãy hỏi tôi bất kỳ điều gì!`,
      timestamp: new Date().toISOString(),
    },
  ]);

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
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `❌ Gặp sự cố khi xử lý: ${err.message || 'Lỗi không xác định'}`,
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
          m.id === msgId ? { ...m, content: `${m.content}\n\n*(Đã hoàn tác [Undo] thành công)*`, actionId: undefined } : m
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
        prev.map((m) => (m.id === msgId ? { ...m, pendingConfirmation: undefined } : m)).concat(response)
      );
      onDataMutated();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, pendingConfirmation: undefined, content: `${m.content}\n\n*(Người dùng đã hủy thao tác)*` }
          : m
      )
    );
  };

  const quickSuggestions = [
    'Mai tôi có gì phải làm?',
    'Tối mai tôi rảnh lúc nào?',
    'Xếp piano lúc 19:00 tối mai',
    'Các dự án hiện tại',
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-84 md:w-96 border-l border-border bg-card/95 backdrop-blur-xl flex flex-col h-[calc(100vh-3.5rem)] z-20 shadow-2xl transition-all select-none">
      {/* Drawer Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-card/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-neon-purple to-neon-pink flex items-center justify-center text-white shadow-neon-glow">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs tracking-tight text-foreground">
              AI Productivity Agent
            </h3>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tool Calling Ready
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          title="Đóng (Esc / Ctrl + J)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestion Chips */}
      <div className="p-2 border-b border-border/60 bg-secondary/30 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
        {quickSuggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(s)}
            className="px-2.5 py-1 rounded-full bg-card hover:bg-secondary border border-border shrink-0 text-muted-foreground hover:text-foreground transition-all shadow-xs"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {messages.map((m) => {
          const isUser = m.role === 'user';

          return (
            <div
              key={m.id}
              className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs transition-all',
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-xs'
                    : 'bg-secondary/70 text-foreground border border-border/80 rounded-tl-xs'
                )}
              >
                {/* Header Icon */}
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] opacity-70 font-semibold">
                  {isUser ? (
                    <>
                      <User className="w-3 h-3" />
                      <span>Bạn</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-primary" />
                      <span>Agent</span>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="whitespace-pre-line select-text">
                  {m.content}
                </div>

                {/* Tool Pills */}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                    {m.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-background/50 border border-border flex items-center gap-1 text-primary"
                      >
                        <span>⚡ Tool: {tc.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Confirmation Dialog */}
                {m.pendingConfirmation && (
                  <div className="mt-3 p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-destructive font-semibold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Hành động cần xác nhận</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConfirmAction(m.id, m.pendingConfirmation!.toolCall)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Xác nhận xóa
                      </button>
                      <button
                        onClick={() => handleCancelAction(m.id)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {/* Instant Undo Button */}
                {m.actionId && (
                  <div className="mt-2.5 pt-2 border-t border-border/50 flex justify-end">
                    <button
                      onClick={() => handleUndo(m.actionId!, m.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-background/80 hover:bg-background text-primary border border-border shadow-xs hover:shadow transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Hoàn tác (Undo)</span>
                    </button>
                  </div>
                )}
              </div>

              <span className="text-[9px] text-muted-foreground mt-1 px-1">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-secondary/40 border border-border/40 w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>Agent đang phân tích & chạy tools...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-border bg-card/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Hỏi lịch, nhờ xếp việc, tìm slot trống..."
            className="w-full pl-3 pr-10 py-2 text-xs rounded-xl bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 transition-all"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="absolute right-1.5 p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
