import { useEffect, useRef, useState } from 'react';
import { SLIDES } from '../lib/slides';

const SLIDE_W = 1920;
const SLIDE_H = 1080;

interface Props {
  onOpenConsole: () => void;
}

export default function Pitch({ onOpenConsole }: Props) {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [showNotes, setShowNotes] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setScale(Math.min(w / SLIDE_W, h / SLIDE_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const slide = SLIDES[index];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-end justify-between gap-6 mb-5">
        <div>
          <h1 className="text-[34px] font-semibold tracking-[-0.02em] mb-[6px]">Pitch deck</h1>
          <p className="text-[16px] text-text-2">{slide.screenLabel} · {slide.label}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotes((v) => !v)}
            className="font-mono text-[11px] tracking-[0.06em] px-[10px] py-[7px] rounded-[2px] cursor-pointer transition-colors"
            style={showNotes
              ? { color: 'var(--color-emerald)', border: '1.5px solid rgba(47,208,138,0.45)', background: 'rgba(47,208,138,0.07)' }
              : { color: 'var(--color-text-3)', border: '1.5px solid rgba(255,255,255,0.1)', background: 'transparent' }
            }
          >NOTES</button>
          <button
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="font-mono text-[13px] font-medium tracking-[0.05em] px-[18px] py-[12px] rounded-[9px] cursor-pointer bg-transparent text-text-2 border border-white/16 disabled:opacity-30 disabled:cursor-default"
          >
            &larr;  PREV
          </button>
          <span className="font-mono text-[13px] text-text-3 px-2">{index + 1} / {SLIDES.length}</span>
          <button
            onClick={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))}
            disabled={index === SLIDES.length - 1}
            className="font-mono text-[13px] font-medium tracking-[0.05em] px-[18px] py-[12px] rounded-[9px] cursor-pointer bg-emerald text-emerald-ink border-none disabled:opacity-30 disabled:cursor-default"
          >
            NEXT  &rarr;
          </button>
        </div>
      </div>

      <div ref={stageRef} className="flex-1 min-h-0 bg-surface border border-border-soft rounded-[14px] overflow-hidden flex items-center justify-center">
        <div style={{ width: SLIDE_W * scale, height: SLIDE_H * scale, position: 'relative' }}>
          <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {slide.render({ onOpenConsole })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-[6px] mt-4">
        {SLIDES.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setIndex(i)}
            title={s.label}
            className="font-mono text-[11px] px-[10px] py-[6px] rounded-[2px] cursor-pointer whitespace-nowrap"
            style={
              i === index
                ? { border: '1px solid rgba(47,208,138,0.5)', background: 'rgba(47,208,138,0.1)', color: 'var(--color-emerald)' }
                : { border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--color-text-2)' }
            }
          >
            {String(i + 1).padStart(2, '0')} {s.label}
          </button>
        ))}
      </div>

      {showNotes && slide.notes && (
        <div className="mt-3 bg-surface border border-border-soft rounded-[8px] p-[14px_18px]">
          <div className="font-mono text-[10px] tracking-[0.12em] text-text-3 mb-[8px]">SPEAKER NOTES</div>
          <p className="text-[14px] text-text-2 leading-[1.65] m-0">{slide.notes}</p>
        </div>
      )}
    </div>
  );
}
