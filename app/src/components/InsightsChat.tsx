import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReconGroup, TessDoc } from '../lib/types';
import { streamChatMessage, type ChatMessage } from '../lib/insightsChat';

const SUGGESTIONS = [
  'Which vendor has the highest value at risk?',
  'What exceptions should I prioritise today?',
  'Are there any duplicate invoices?',
  'Summarise the batch for me.',
];

interface Props {
  docs: TessDoc[];
  groups: ReconGroup[];
}

export default function InsightsChat({ docs, groups }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQuestionRef = useRef<string>('');

  // Auto-scroll only when user is already at the bottom
  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, atBottom]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  }

  const submit = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || streaming) return;
    setInput('');
    setError(null);
    setStreamingText('');
    setAtBottom(true);
    lastQuestionRef.current = q;

    const userMsg: ChatMessage = { role: 'user', text: q };
    const historySnapshot = messages;
    setMessages((m) => [...m, userMsg]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = '';

    try {
      await streamChatMessage(q, historySnapshot, docs, groups, (token) => {
        if (controller.signal.aborted) return;
        accumulated += token;
        setStreamingText(accumulated);
      }, controller.signal);

      if (!controller.signal.aborted) {
        setMessages((m) => [...m, { role: 'assistant', text: accumulated || 'No response from model.' }]);
      } else {
        // Partial response — keep what arrived
        if (accumulated.trim()) {
          setMessages((m) => [...m, { role: 'assistant', text: accumulated.trimEnd() + ' ·· cancelled' }]);
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Model unreachable — is Ollama running?');
      }
    } finally {
      setStreaming(false);
      setStreamingText('');
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [streaming, messages, docs, groups]);

  function cancel() {
    abortRef.current?.abort();
  }

  function retry() {
    if (streaming || !lastQuestionRef.current) return;
    submit(lastQuestionRef.current);
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingText('');
    setError(null);
    setInput('');
    lastQuestionRef.current = '';
  }

  async function copyMessage(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(idx);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* clipboard not available */ }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input); }
  }

  const lastAssistantIdx = messages.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).at(-1) ?? -1;

  return (
    <div className="bg-surface border border-border-soft rounded-[14px] flex flex-col overflow-hidden" style={{ minHeight: 340 }}>

      {/* header */}
      <div className="flex items-center justify-between px-[24px] py-[18px] border-b border-border-soft flex-shrink-0">
        <div>
          <div className="text-[18px] font-semibold">Ask the data</div>
          <div className="text-[13px] text-text-2 mt-[2px]">Tessera Analyst · LLM agent with full batch context</div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[10px] tracking-[0.1em] px-[8px] py-[4px] rounded border"
            style={{ color: 'var(--color-emerald)', borderColor: 'rgba(47,208,138,0.3)', background: 'rgba(47,208,138,0.07)' }}
          >LLM AGENT</span>
          {messages.length > 0 && !streaming && (
            <button
              onClick={clearChat}
              className="font-mono text-[11px] text-text-3 hover:text-text-2 border border-border-soft rounded-[6px] px-[10px] py-[5px] bg-transparent cursor-pointer transition-colors"
              title="Clear conversation"
            >CLEAR</button>
          )}
        </div>
      </div>

      {/* message thread */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-[24px] py-[18px] flex flex-col gap-4"
        style={{ maxHeight: 380 }}
      >
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] text-text-3 mb-1">Suggestions</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="text-[13px] text-text-2 bg-raised border border-border-soft rounded-[8px] px-[12px] py-[8px] cursor-pointer hover:border-emerald/40 hover:text-text transition-colors text-left"
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
            <div className="relative max-w-[82%]">
              <div
                className="rounded-[10px] px-[14px] py-[10px] text-[14px] leading-[1.6]"
                style={m.role === 'user'
                  ? { background: 'var(--color-raised)', color: 'var(--color-text)' }
                  : { background: 'rgba(47,208,138,0.07)', border: '1px solid rgba(47,208,138,0.18)', color: 'var(--color-text-soft)' }}
              >
                {m.role === 'assistant' && (
                  <div className="font-mono text-[10px] tracking-[0.1em] text-emerald mb-[6px]">TESSERA ANALYST</div>
                )}
                {m.text}
              </div>
              {/* copy + retry actions on assistant messages */}
              {m.role === 'assistant' && (
                <div className="flex gap-2 mt-[6px] opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyMessage(m.text, i)}
                    className="font-mono text-[10px] text-text-3 hover:text-text-2 border border-border-soft rounded-[5px] px-[8px] py-[3px] bg-raised cursor-pointer transition-colors"
                  >{copied === i ? 'COPIED' : 'COPY'}</button>
                  {i === lastAssistantIdx && !streaming && (
                    <button
                      onClick={retry}
                      className="font-mono text-[10px] text-text-3 hover:text-text-2 border border-border-soft rounded-[5px] px-[8px] py-[3px] bg-raised cursor-pointer transition-colors"
                    >RETRY</button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* live streaming bubble */}
        {streaming && (
          <div className="flex justify-start">
            <div
              className="max-w-[82%] rounded-[10px] px-[14px] py-[10px] text-[14px] leading-[1.6]"
              style={{ background: 'rgba(47,208,138,0.07)', border: '1px solid rgba(47,208,138,0.18)', color: 'var(--color-text-soft)' }}
            >
              <div className="font-mono text-[10px] tracking-[0.1em] text-emerald mb-[6px]">TESSERA ANALYST</div>
              {streamingText
                ? <span>{streamingText}<span className="inline-block w-[2px] h-[14px] bg-emerald/70 ml-[2px] align-middle" style={{ animation: 'blink 1s step-end infinite' }} /></span>
                : (
                  <div className="flex gap-[5px] items-center h-[18px]">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-[6px] h-[6px] rounded-full bg-emerald/50" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                )
              }
            </div>
          </div>
        )}

        {error && (
          <div className="text-[13px] rounded-[8px] px-[14px] py-[10px]" style={{ color: 'var(--color-coral)', background: 'rgba(242,104,95,0.08)', border: '1px solid rgba(242,104,95,0.2)' }}>
            {error}
            {lastQuestionRef.current && (
              <button onClick={retry} className="ml-3 underline cursor-pointer bg-transparent border-none text-[13px]" style={{ color: 'var(--color-coral)' }}>Retry</button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* scroll-to-bottom nudge */}
      {!atBottom && (
        <div className="flex justify-center pb-1">
          <button
            onClick={() => { setAtBottom(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
            className="font-mono text-[11px] text-text-3 hover:text-text-2 border border-border-soft rounded-full px-[12px] py-[4px] bg-surface cursor-pointer transition-colors"
          >↓ scroll to latest</button>
        </div>
      )}

      {/* input */}
      <div className="px-[20px] pb-[18px] pt-[12px] border-t border-border-soft flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about the batch, or type @ to target a doc or vendor…"
            disabled={streaming}
            className="flex-1 bg-raised border border-border-soft rounded-[8px] px-[13px] py-[10px] text-[14px] text-text resize-none outline-none placeholder:text-text-3"
            style={{ fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}
          />
          {streaming ? (
            <button
              onClick={cancel}
              className="flex-shrink-0 border font-mono text-[12px] tracking-[0.06em] px-[16px] py-[10px] rounded-[8px] cursor-pointer transition-colors"
              style={{ borderColor: 'var(--color-coral)', color: 'var(--color-coral)', background: 'rgba(242,104,95,0.08)' }}
            >STOP</button>
          ) : (
            <button
              onClick={() => submit(input)}
              disabled={!input.trim()}
              className="flex-shrink-0 bg-emerald text-emerald-ink border-none font-mono text-[12px] tracking-[0.06em] px-[16px] py-[10px] rounded-[8px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >SEND</button>
          )}
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] text-text-3 mt-[8px]">
          <span>Enter to send · Shift+Enter for new line</span>
          <span className="text-text-3/60">@PO-4471 · @Rhein · @GRN-4478 to focus context</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
