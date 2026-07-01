import { useState } from 'react';
import type { View, PolicyConfig } from '../lib/types';
import { RULE_META } from '../lib/policy';

const CRUMB: Record<View, string> = { lake: 'data-lake', recon: 'reconciliation', linkage: 'linkage', insights: 'insights', architecture: 'architecture', pitch: 'pitch-deck' };

interface Props {
  view: View;
  onReset: () => void;
  reviewThreshold: number;
  onReviewThresholdChange: (v: number) => void;
  policyConfig: PolicyConfig;
  onPolicyConfigChange: (cfg: PolicyConfig) => void;
}

export default function Header({ view, onReset, reviewThreshold, onReviewThresholdChange, policyConfig, onPolicyConfigChange }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(reviewThreshold);
  const [draftPolicy, setDraftPolicy] = useState<PolicyConfig>(policyConfig);
  function openSettings() {
    setDraft(reviewThreshold);
    setDraftPolicy(policyConfig);
    setSettingsOpen(true);
  }

  function save() {
    onReviewThresholdChange(draft);
    onPolicyConfigChange(draftPolicy);
    setSettingsOpen(false);
  }

  function toggleRule(id: string) {
    setDraftPolicy((prev) => ({ ...prev, [id]: { ...prev[id], enabled: !prev[id]?.enabled } }));
  }

  function setThreshold(id: string, value: number) {
    setDraftPolicy((prev) => ({ ...prev, [id]: { ...prev[id], threshold: value } }));
  }

  return (
    <>
      <header className="h-[62px] flex-shrink-0 border-b border-border-soft flex items-center justify-between px-[30px]">
        <div className="flex items-center gap-3 font-mono text-[13px] text-text-2">
          <span className="text-text-3">tessera</span>
          <span className="text-idle-dot">/</span>
          <span className="text-text">{CRUMB[view]}</span>
        </div>
        <div className="flex items-center gap-[14px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald" style={{ boxShadow: '0 0 0 4px rgba(47,208,138,0.15)' }} />
            <span className="font-mono text-[12px] tracking-[0.08em] text-text-2">LIVE</span>
          </div>
          <button
            onClick={openSettings}
            title="Settings"
            className="bg-transparent border border-white/14 text-text-2 font-mono text-[13px] px-[10px] py-[7px] rounded-[7px] cursor-pointer hover:text-text transition-colors"
          >⚙</button>
          <button
            onClick={onReset}
            className="bg-transparent border border-white/14 text-text-2 font-mono text-[12px] tracking-[0.05em] px-[14px] py-2 rounded-[7px] cursor-pointer"
          >RESET</button>
        </div>
      </header>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setSettingsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border-soft rounded-[16px] w-[500px] max-h-[85vh] overflow-y-auto p-[28px]"
            style={{ animation: 'ts-rise 0.15s ease' }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-mono text-[11px] tracking-[0.1em] text-text-3 mb-1">TESSERA</div>
                <div className="text-[20px] font-semibold">Settings</div>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="bg-transparent border-none text-text-2 text-[18px] cursor-pointer">✕</button>
            </div>

            <div className="flex flex-col gap-6">
              {/* Review threshold */}
              <div>
                <div className="font-mono text-[11px] tracking-[0.1em] text-emerald mb-2">CLASSIFICATION</div>
                <div className="bg-raised border border-border-soft rounded-[10px] p-[16px_18px]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[14px] font-medium">Review threshold</div>
                      <div className="text-[12px] text-text-2 mt-[3px]">Docs below this confidence are flagged for human review</div>
                    </div>
                    <div className="font-mono text-[18px] font-semibold" style={{ color: 'var(--color-amber)' }}>
                      {Math.round(draft * 100)}%
                    </div>
                  </div>
                  <input
                    type="range" min={0.5} max={0.99} step={0.01}
                    value={draft}
                    onChange={(e) => setDraft(Number(e.target.value))}
                    className="w-full accent-amber cursor-pointer"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-text-3 mt-1">
                    <span>50% — review almost nothing</span>
                    <span>99% — review almost everything</span>
                  </div>
                </div>
              </div>

              {/* Policy rules */}
              <div>
                <div className="font-mono text-[11px] tracking-[0.1em] text-coral mb-2">COMPLIANCE POLICY</div>
                <div className="flex flex-col gap-2">
                  {RULE_META.map((rule) => {
                    const cfg = draftPolicy[rule.id] ?? { enabled: rule.defaultEnabled, threshold: rule.defaultThreshold };
                    return (
                      <div
                        key={rule.id}
                        className="bg-raised border border-border-soft rounded-[10px] p-[14px_16px]"
                        style={{ borderColor: cfg.enabled ? 'var(--color-border-soft)' : 'transparent' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-[13px] font-medium">{rule.label}</div>
                            <div className="text-[12px] text-text-2 mt-[3px]">{rule.description}</div>
                          </div>
                          <button
                            onClick={() => toggleRule(rule.id)}
                            className="flex-shrink-0 font-mono text-[11px] tracking-[0.06em] px-[10px] py-[5px] rounded-[6px] border cursor-pointer transition-colors"
                            style={{
                              background: cfg.enabled ? 'rgba(47,208,138,0.12)' : 'transparent',
                              borderColor: cfg.enabled ? 'rgba(47,208,138,0.3)' : 'var(--color-border-soft)',
                              color: cfg.enabled ? 'var(--color-emerald)' : 'var(--color-text-3)',
                            }}
                          >{cfg.enabled ? 'ON' : 'OFF'}</button>
                        </div>
                        {rule.hasThreshold && cfg.enabled && (
                          <div className="mt-3 flex items-center gap-3">
                            <span className="font-mono text-[11px] text-text-3">{rule.thresholdLabel}</span>
                            <span className="font-mono text-[11px] text-text-3">{rule.thresholdPrefix}</span>
                            <input
                              type="number"
                              min={1000}
                              step={1000}
                              value={cfg.threshold ?? rule.defaultThreshold}
                              onChange={(e) => setThreshold(rule.id, Number(e.target.value))}
                              className="w-[110px] bg-cell border border-border-soft rounded-[6px] px-[10px] py-[5px] font-mono text-[12px] text-text outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LLM info */}
              <div>
                <div className="font-mono text-[11px] tracking-[0.1em] text-text-3 mb-2">LOCAL LLM</div>
                <div className="bg-raised border border-border-soft rounded-[10px] p-[14px_18px] text-[12px] text-text-2 leading-[1.6]">
                  Switch models from the <span className="text-text">LOCAL MODEL</span> dropdown in the sidebar. To use a custom endpoint, set <code className="font-mono text-[11px] text-emerald/80 bg-cell px-1 rounded">tessera_llm_endpoint</code> in localStorage.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-7">
              <button
                onClick={() => setSettingsOpen(false)}
                className="font-mono text-[12px] tracking-[0.04em] px-[18px] py-[10px] rounded-[8px] border border-border-soft bg-transparent text-text-2 cursor-pointer"
              >CANCEL</button>
              <button
                onClick={save}
                className="font-mono text-[12px] tracking-[0.04em] px-[18px] py-[10px] rounded-[8px] border-none bg-emerald text-emerald-ink cursor-pointer"
              >SAVE</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
