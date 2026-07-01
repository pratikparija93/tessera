import type { View } from '../lib/types';

interface NavItem {
  key: View;
  label: string;
  done: boolean;
}

const THEMES = [
  { key: 'dark',  label: 'Dark',  bg: '#0b1410', accent: '#2fd08a' },
  { key: 'slate', label: 'Slate', bg: '#0d1117', accent: '#2fd08a' },
  { key: 'light', label: 'Light', bg: '#f2f5f3', accent: '#16a066' },
];

interface Props {
  view: View;
  lakeDone: boolean;
  reconcileDone: boolean;
  llmName: string;
  llmWarning: string | null;
  availableModels: string[];
  onModelChange: (name: string) => void;
  onSetView: (v: View) => void;
  theme: string;
  onThemeChange: (t: string) => void;
}

export default function Sidebar({ view, lakeDone, reconcileDone, llmName, llmWarning, availableModels, onModelChange, onSetView, theme, onThemeChange }: Props) {
  const navDef: NavItem[] = [
    { key: 'lake', label: 'Data lake', done: lakeDone },
    { key: 'recon', label: 'Reconciliation', done: reconcileDone },
    { key: 'linkage', label: 'Linkage', done: reconcileDone },
    { key: 'insights', label: 'Insights', done: reconcileDone },
    { key: 'architecture', label: 'Architecture', done: false },
    { key: 'pitch', label: 'Pitch deck', done: false },
  ];

  return (
    <aside className="w-[252px] flex-shrink-0 bg-sidebar border-r border-border-soft flex flex-col p-[24px_18px]">
      <div className="flex items-center gap-[11px] px-2 pb-7 pt-1">
        <div className="grid grid-cols-2 grid-rows-2 gap-[3px] w-[21px] h-[21px]">
          <div className="bg-emerald" />
          <div className="border border-outline-tile" />
          <div className="border border-outline-tile" />
          <div className="bg-emerald" />
        </div>
        <span className="text-[19px] font-semibold tracking-[-0.01em]">Tessera</span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-text-3 border border-white/12 rounded px-[5px] py-[2px] ml-[2px]">
          CONSOLE
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {navDef.map((n) => {
          const active = view === n.key;
          return (
            <button
              key={n.key}
              onClick={() => onSetView(n.key)}
              className="flex items-center gap-[11px] w-full text-left px-[13px] py-[11px] rounded-[9px] border-none cursor-pointer transition-colors"
              style={{ background: active ? 'var(--color-raised)' : 'transparent' }}
            >
              <span
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{ background: active ? 'var(--color-emerald)' : 'var(--color-idle-dot)' }}
              />
              <span
                className="text-[15px]"
                style={{ fontWeight: active ? 600 : 500, color: active ? 'var(--color-text)' : 'var(--color-text-2)' }}
              >
                {n.label}
              </span>
              {n.done && <span className="ml-auto text-emerald text-[13px] font-mono">&#10003;</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div
          className="p-[14px] bg-surface border rounded-[10px]"
          style={{ borderColor: llmWarning ? 'var(--color-coral)' : 'var(--color-border-soft)' }}
        >
          <div className="font-mono text-[10px] tracking-[0.1em] text-text-3 mb-[8px]">LOCAL MODEL</div>
          {availableModels.length > 0 ? (
            <select
              value={llmName}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full font-mono text-[13px] bg-raised border border-border-soft rounded-[6px] px-[8px] py-[6px] text-text cursor-pointer"
              style={{ appearance: 'auto' }}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              {!availableModels.includes(llmName) && (
                <option value={llmName}>{llmName}</option>
              )}
            </select>
          ) : (
            <div className="font-mono text-[13px] text-text-soft">{llmName}</div>
          )}
          {llmWarning && (
            <div className="mt-[8px] text-[12px] leading-[1.4]" style={{ color: 'var(--color-coral)' }}>
              ⚠ {llmWarning}
            </div>
          )}
          {availableModels.length > 0 && !llmWarning && (
            <div className="mt-[6px] font-mono text-[11px] text-text-3">running locally · ollama</div>
          )}
          {availableModels.length === 0 && (
            <div className="mt-[6px] font-mono text-[11px] text-text-3">keyword fallback active</div>
          )}
        </div>

        <div className="px-1">
          <div className="font-mono text-[10px] tracking-[0.1em] text-text-3 mb-[10px]">THEME</div>
          <div className="flex justify-start gap-[8px]">
            {THEMES.map((t) => {
              const active = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onThemeChange(t.key)}
                  title={t.label}
                  className="flex flex-col items-center gap-[5px] border-none bg-transparent cursor-pointer p-0"
                >
                  <span
                    className="w-[34px] h-[22px] rounded-[5px] flex items-center justify-center transition-all"
                    style={{
                      background: t.bg,
                      outline: active ? `2px solid ${t.accent}` : '1.5px solid rgba(255,255,255,0.12)',
                      outlineOffset: active ? '2px' : '0px',
                    }}
                  >
                    <span className="w-[10px] h-[10px] rounded-full" style={{ background: t.accent }} />
                  </span>
                  <span className="font-mono text-[10px] transition-colors" style={{ color: active ? 'var(--color-text)' : 'var(--color-text-3)' }}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
