import React, { useState, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  X, 
  Search, 
  Copy, 
  Check, 
  Sparkles, 
  ArrowUpRight, 
  Keyboard, 
  Hash,
  ShieldCheck
} from 'lucide-react';
import { USER_GUIDE_CONTENT } from '../../docs/user-guide.content';
import { cn } from '../../lib/utils';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsePrompt?: (prompt: string) => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onUsePrompt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('1');
  const contentRef = useRef<HTMLDivElement>(null);

  // Table of Contents
  const tocItems = [
    { id: '1-triet-ly', title: '1. Triết Lý Local-First', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: '2-quan-ly-task', title: '2. Quản Lý Công Việc', icon: <Hash className="w-3.5 h-3.5" /> },
    { id: '3-lich-bieu', title: '3. Lịch Biểu Đa Góc Nhìn', icon: <Hash className="w-3.5 h-3.5" /> },
    { id: '4-du-an-muc-tieu', title: '4. Dự Án & Mục Tiêu', icon: <Hash className="w-3.5 h-3.5" /> },
    { id: '5-tro-ly-ai', title: '5. 7 Năng Lực Trợ Lý AI', icon: <Sparkles className="w-3.5 h-3.5 text-primary" /> },
    { id: '6-briefing-review', title: '6. Bản Tin Sáng & Cuối Ngày', icon: <Hash className="w-3.5 h-3.5" /> },
    { id: '7-phim-tat', title: '7. Bảng Phím Tắt Thần Tốc', icon: <Keyboard className="w-3.5 h-3.5" /> },
    { id: '8-cai-dat-bao-mat', title: '8. Cài Đặt & Hoàn Tác (Undo)', icon: <Hash className="w-3.5 h-3.5" /> },
  ];

  const handleCopy = (text: string) => {
    const clean = text.replace(/^>\s*[*"]?|[*"]?\s*$/g, '').trim();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(clean).catch(() => fallbackCopy(clean));
      } else {
        fallbackCopy(clean);
      }
    } catch {
      fallbackCopy(clean);
    }
    setCopiedPrompt(clean);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch {}
  };

  const handleScrollTo = (sectionIdx: number) => {
    if (!contentRef.current) return;
    const headings = contentRef.current.querySelectorAll('h2');
    if (headings[sectionIdx]) {
      headings[sectionIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(String(sectionIdx + 1));
    }
  };

  // Render markdown parser
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    const flushTable = (key: string) => {
      if (tableRows.length > 0) {
        const [headers, , ...rows] = tableRows;
        elements.push(
          <div key={key} className="overflow-x-auto my-4 rounded-xl border border-border/80 bg-secondary/30">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-foreground font-semibold">
                  {headers?.map((h, i) => (
                    <th key={i} className="py-2.5 px-3.5">{renderInline(h.trim())}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3.5 text-muted-foreground">{renderInline(cell.trim())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check search query filter
      if (searchQuery && !line.toLowerCase().includes(searchQuery.toLowerCase()) && !trimmed.startsWith('#')) {
        return;
      }

      // Handle table
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cells = trimmed.split('|').slice(1, -1);
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable(`table-${idx}`);
      }

      // Handle headers
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-xl md:text-2xl font-black tracking-tight text-foreground mt-2 mb-4 bg-gradient-to-r from-primary to-neon-purple bg-clip-text text-transparent">
            {renderInline(trimmed.substring(2))}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-base md:text-lg font-bold text-foreground mt-6 mb-3 pb-1.5 border-b border-border/60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            {renderInline(trimmed.substring(3))}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-sm md:text-base font-semibold text-foreground/90 mt-4 mb-2 flex items-center gap-1.5">
            {renderInline(trimmed.substring(4))}
          </h3>
        );
      } else if (trimmed.startsWith('> *"') || trimmed.startsWith('>*"') || (trimmed.startsWith('>') && trimmed.includes('"'))) {
        // AI Prompt blockquote with 1-click Copy & Try in Chat
        const promptText = trimmed.replace(/^>\s*/, '').replace(/[*"]/g, '');
        elements.push(
          <div key={idx} className="my-2.5 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3 group hover:border-primary/60 transition-all">
            <div className="flex items-center gap-2.5 text-xs text-primary font-medium">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>"{promptText}"</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCopy(promptText)}
                className="px-2 py-1 text-[11px] font-medium rounded-md bg-background/80 hover:bg-background border border-border text-foreground flex items-center gap-1 transition-colors"
                title="Sao chép câu lệnh"
              >
                {copiedPrompt === promptText ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
              {onUsePrompt && (
                <button
                  onClick={() => {
                    onUsePrompt(promptText);
                    onClose();
                  }}
                  className="px-2 py-1 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1 transition-opacity shadow-sm"
                  title="Dán ngay vào Trợ lý AI"
                >
                  <span>Dùng ngay</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        elements.push(
          <li key={idx} className="text-xs text-muted-foreground ml-4 my-1 list-disc leading-relaxed">
            {renderInline(trimmed.substring(2))}
          </li>
        );
      } else if (trimmed === '---') {
        elements.push(<hr key={idx} className="my-5 border-border/40" />);
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={idx} className="text-xs text-muted-foreground my-2 leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      }
    });

    if (inTable) flushTable('table-end');
    return elements;
  };

  const renderInline = (text: string): React.ReactNode => {
    // Replace <kbd>TAG</kbd>
    const kbdRegex = /<kbd>(.*?)<\/kbd>/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Helper for formatting bold & inline code inside chunks
    const formatChunk = (chunk: string, baseKey: number): React.ReactNode[] => {
      const boldParts = chunk.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bp, bIdx) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={`${baseKey}-${bIdx}`} className="font-bold text-foreground">{bp.slice(2, -2)}</strong>;
        }
        const codeParts = bp.split(/(`.*?`)/g);
        return codeParts.map((cp, cIdx) => {
          if (cp.startsWith('`') && cp.endsWith('`')) {
            return (
              <code key={`${baseKey}-${bIdx}-${cIdx}`} className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-[11px] border border-border/60">
                {cp.slice(1, -1)}
              </code>
            );
          }
          return cp;
        });
      });
    };

    let count = 0;
    while ((match = kbdRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(...formatChunk(text.substring(lastIndex, match.index), count++));
      }
      parts.push(
        <kbd
          key={`kbd-${match.index}`}
          className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-foreground bg-secondary border border-border rounded shadow-[0_1px_0_1px_rgba(0,0,0,0.2)] inline-block mx-0.5 align-middle"
        >
          {match[1]}
        </kbd>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(...formatChunk(text.substring(lastIndex), count++));
    }

    return parts.length > 0 ? parts : text;
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/25 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl h-[90vh] bg-card text-foreground rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        <div className="px-5 py-3.5 border-b border-border bg-card/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-foreground">
                Cẩm Nang Sử Dụng Ứng Dụng
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Hướng dẫn chi tiết toàn bộ tính năng & câu lệnh mẫu AI
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tính năng hoặc phím tắt..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-secondary/80 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Sidebar TOC + Right Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Table of Contents Sidebar */}
          <div className="w-56 border-r border-border/80 bg-secondary/20 p-3 hidden md:flex flex-col gap-1 overflow-y-auto">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-1">
              Mục lục cẩm nang
            </span>
            {tocItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleScrollTo(idx)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors font-medium",
                  activeSection === String(idx + 1)
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {item.icon}
                <span className="truncate">{item.title}</span>
              </button>
            ))}

            <div className="mt-auto pt-3 border-t border-border/50 text-[10px] text-muted-foreground/80 px-2 space-y-1">
              <p>💡 <strong>Mẹo:</strong> Bấm <kbd className="px-1 py-0.5 rounded bg-muted border text-[9px]">F1</kbd> bất kỳ lúc nào để mở cẩm nang này.</p>
            </div>
          </div>

          {/* Markdown Content Area */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto p-5 md:p-8 space-y-2 select-text scroll-smooth"
          >
            {renderMarkdown(USER_GUIDE_CONTENT)}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Local-First SQLite • An toàn 100% dữ liệu cá nhân</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-secondary text-foreground hover:bg-secondary/80 rounded-md font-medium text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
