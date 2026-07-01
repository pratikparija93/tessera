import { Fragment, type CSSProperties, type ReactNode } from 'react';

export interface SlideContext {
  onOpenConsole: () => void;
}

export interface Slide {
  label: string;
  screenLabel: string;
  render: (ctx: SlideContext) => ReactNode;
}

const base: CSSProperties = {
  background: '#0b1410',
  color: '#eaf2ee',
  fontFamily: "'Schibsted Grotesk', sans-serif",
  width: 1920,
  height: 1080,
  padding: '88px 110px',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  overflow: 'hidden',
  position: 'relative',
};

const eyebrow: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 24,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: '#2fd08a',
  margin: '0 0 24px',
};

const card: CSSProperties = {
  background: '#122019',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
};

const pipeArrow: CSSProperties = {
  color: '#2fd08a',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 34,
  lineHeight: 1,
};

function Logo4() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,16px)', gridTemplateRows: 'repeat(4,16px)', gap: 6 }}>
      {[1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0].map((on, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} style={on ? { background: '#2fd08a' } : { border: '1.5px solid #2c4a3c' }} />
      ))}
    </div>
  );
}

export const SLIDES: Slide[] = [
  {
    label: 'Cover',
    screenLabel: '01 Cover',
    render: () => (
      <div style={{ ...base, justifyContent: 'space-between' }}>
        <Logo4 />
        <div>
          <h1 style={{ fontSize: 128, lineHeight: 0.96, fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 28px' }}>Tessera</h1>
          <p style={{ fontSize: 46, fontWeight: 500, color: '#eaf2ee', margin: '0 0 14px', letterSpacing: '-0.01em' }}>Order from the data lake.</p>
          <p style={{ fontSize: 30, color: '#9fb3a9', margin: 0, maxWidth: 900 }}>
            Document intelligence for procurement &amp; finance — we don't just store documents, we understand and reconcile them.
          </p>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6f8a7e' }}>
          Vendor capability briefing · Public-data demonstration
        </div>
      </div>
    ),
  },
  {
    label: 'The situation',
    screenLabel: '02 Situation',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>02 — The situation</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 28px', maxWidth: 1300 }}>
          A global procurement engine, running with the lights off
        </h2>
        <p style={{ fontSize: 30, lineHeight: 1.5, color: '#9fb3a9', margin: '0 0 auto', maxWidth: 1180 }}>
          Purchase orders, invoices, and goods-received notes flow across a sprawling vendor network and a web of cross-border dependencies. The volume isn't the problem. The lack of a single, trustworthy view of it is.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, marginTop: 56 }}>
          {[
            ['40+', '#eaf2ee', 'countries & tax regimes'],
            ['1,200+', '#eaf2ee', 'active vendors'],
            ['10k+', '#2fd08a', 'documents dumped per day'],
            ['5', '#eaf2ee', 'disconnected source systems'],
          ].map(([num, color, label]) => (
            <div key={label} style={{ ...card, padding: 34 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 66, fontWeight: 500, color, letterSpacing: '-0.02em' }}>{num}</div>
              <div style={{ fontSize: 24, color: '#9fb3a9', marginTop: 10 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'Four problems',
    screenLabel: '03 Problems',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>03 — The problem</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 44px' }}>Four problems, one root cause</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
            ['A', '#2fd08a', 'Volume & complexity', 'Large transaction counts tangled in cross-country dependencies and currencies.'],
            ['B', '#2fd08a', 'Disparate systems', 'Data scattered across five platforms means no one holds the whole picture.'],
            ['C', '#2fd08a', 'An unstructured data lake', 'The last vendor pooled every system into a lake — and left it raw and unsorted.'],
            ['D', '#f2685f', 'Eroded trust', "A failed engagement means the next approach has to prove itself before it's believed."],
          ].map(([letter, color, title, body]) => (
            <div key={title} style={{ ...card, padding: '34px 36px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color, paddingTop: 6 }}>{letter}</span>
              <div>
                <div style={{ fontSize: 30, fontWeight: 600, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 24, color: '#9fb3a9', lineHeight: 1.45 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, fontSize: 30, color: '#eaf2ee' }}>
          <span style={{ color: '#9fb3a9' }}>Root cause — </span>the documents were never understood, only stored.
        </div>
      </div>
    ),
  },
  {
    label: 'Why it failed',
    screenLabel: '04 Why failed',
    render: () => (
      <div style={{ ...base, justifyContent: 'center' }}>
        <p style={{ ...eyebrow, margin: '0 0 36px' }}>04 — Why the last approach failed</p>
        <h2 style={{ fontSize: 88, lineHeight: 1.05, fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 56px', maxWidth: 1500 }}>
          A data lake without structure is just a bigger pile.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28, maxWidth: 1560 }}>
          {[
            ['No classification', 'Every file lands in the same undifferentiated pool — PO, invoice, or junk.'],
            ['No linkage', "Nothing connects an invoice back to its order or its goods receipt."],
            ['No reconciliation', 'Discrepancies surface only when money has already gone out the door.'],
          ].map(([title, body]) => (
            <div key={title}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6f8a7e', marginBottom: 14 }}>{title}</div>
              <div style={{ fontSize: 26, color: '#cdddd4', lineHeight: 1.45 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'Cost of chaos',
    screenLabel: '05 Cost',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>05 — The cost of chaos</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 48px' }}>What poor visibility quietly costs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 24, flex: 1 }}>
          {[
            ['1–2%', '#f2685f', 'of spend lost to duplicate & erroneous payments'],
            ['Missed', '#f5b942', 'early-payment discounts left on the table'],
            ['Audit', '#f5b942', '& compliance exposure across tax regimes'],
            ['Trapped', '#f5b942', 'working capital from slow, manual matching'],
          ].map(([num, color, body]) => (
            <div key={body} style={{ ...card, padding: '38px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 52, fontWeight: 500, color, letterSpacing: '-0.02em' }}>{num}</div>
              <div style={{ fontSize: 26, color: '#cdddd4', marginTop: 12 }}>{body}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#6f8a7e' }}>
          Industry benchmarks shown for illustration — we baseline against your data in Phase 1.
        </div>
      </div>
    ),
  },
  {
    label: 'Our thesis',
    screenLabel: '06 Thesis',
    render: () => (
      <div style={{ ...base, justifyContent: 'center' }}>
        <p style={{ ...eyebrow, margin: '0 0 36px' }}>06 — Our thesis</p>
        <h2 style={{ fontSize: 96, lineHeight: 1.02, fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 64px' }}>
          Structure first.<br />Insight follows.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32, maxWidth: 1560 }}>
          {[
            ['Understand every document', 'Classify and extract on arrival — no document stays anonymous.'],
            ['Link the lifecycle', 'Connect each PO to its goods receipt and its invoice automatically.'],
            ['Reconcile continuously', "Catch discrepancies before payment, not in next quarter's audit."],
          ].map(([title, body]) => (
            <div key={title} style={{ borderTop: '2px solid #2fd08a', paddingTop: 24 }}>
              <div style={{ fontSize: 30, fontWeight: 600, marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: 24, color: '#9fb3a9', lineHeight: 1.45 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'How it works',
    screenLabel: '07 Pipeline',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>07 — How Tessera works</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 56px' }}>From raw dump to reconciled ledger</h2>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 18, flex: 1, maxHeight: 420 }}>
          {[
            ['01', 'Ingest', 'Pull from the lake — any format, any source, at any volume.', false],
            ['02', 'Classify', 'PO, invoice, GRN, customs — or junk. Quarantine the noise.', false],
            ['03', 'Extract', 'Lift line items, amounts, vendors and dates into a common schema.', false],
            ['04', 'Reconcile', 'Three-way match the lifecycle and flag every exception.', false],
            ['05', 'Insight', 'Live reports for procurement and finance, evidence attached.', true],
          ].map(([n, title, body, highlight], i) => (
            <Fragment key={n as string}>
              {i > 0 && <div style={{ display: 'flex', alignItems: 'center' }}><span style={pipeArrow}>&rarr;</span></div>}
              <div
                style={{
                  ...card, flex: 1, padding: '32px 26px', display: 'flex', flexDirection: 'column',
                  ...(highlight ? { background: '#16291f', borderColor: 'rgba(47,208,138,0.35)' } : {}),
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#2fd08a', marginBottom: 'auto' }}>{n}</div>
                <div style={{ fontSize: 30, fontWeight: 600, margin: '18px 0 10px' }}>{title}</div>
                <div style={{ fontSize: 24, color: '#9fb3a9', lineHeight: 1.4 }}>{body}</div>
              </div>
            </Fragment>
          ))}
        </div>
        <div style={{ marginTop: 36, fontSize: 26, color: '#cdddd4' }}>
          <span style={{ color: '#2fd08a' }}>&bull;</span> &nbsp;Confidence-gated: every low-certainty decision is routed to a human reviewer.
        </div>
      </div>
    ),
  },
  {
    label: 'Three-way match',
    screenLabel: '08 3-way match',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>08 — The core mechanism</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 48px' }}>The three-way match</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36, flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 380 }}>
            {[
              ['PURCHASE ORDER', 'What we agreed to buy'],
              ['GOODS RECEIVED', 'What actually arrived'],
              ['INVOICE', "What we're billed for"],
            ].map(([title, body]) => (
              <div key={title} style={{ ...card, padding: '26px 30px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#6f8a7e', letterSpacing: '0.1em' }}>{title}</div>
                <div style={{ fontSize: 24, color: '#cdddd4', marginTop: 6 }}>{body}</div>
              </div>
            ))}
          </div>
          <span style={{ ...pipeArrow, fontSize: 44 }}>&rarr;</span>
          <div style={{ ...card, padding: 40, width: 300, textAlign: 'center', background: '#16291f', borderColor: 'rgba(47,208,138,0.4)' }}>
            <div style={{ fontSize: 34, fontWeight: 600, color: '#2fd08a' }}>Match engine</div>
            <div style={{ fontSize: 24, color: '#9fb3a9', marginTop: 12, lineHeight: 1.4 }}>Aligns line items, quantities, prices, currency &amp; tax</div>
          </div>
          <span style={{ ...pipeArrow, fontSize: 44 }}>&rarr;</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
            <div style={{ border: '1px solid rgba(47,208,138,0.4)', background: 'rgba(47,208,138,0.08)', borderRadius: 14, padding: '24px 28px' }}>
              <div style={{ fontSize: 26, fontWeight: 600, color: '#2fd08a' }}>Matched &rarr; auto-approve</div>
            </div>
            <div style={{ border: '1px solid rgba(242,104,95,0.4)', background: 'rgba(242,104,95,0.07)', borderRadius: 14, padding: '24px 28px' }}>
              <div style={{ fontSize: 26, fontWeight: 600, color: '#f2685f', marginBottom: 10 }}>Exception &rarr; route &amp; resolve</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#cdddd4', lineHeight: 1.7 }}>
                price variance · short delivery<br />missing GRN · duplicate invoice<br />currency / customs mismatch
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'Where we differ',
    screenLabel: '09 Differentiation',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>09 — Differentiation</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 44px' }}>Where we differ from the last vendor</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, flex: 1 }}>
          <div style={{ ...card, padding: '38px 40px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f2685f' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9fb3a9' }}>Previous vendor</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 24, color: '#9fb3a9', lineHeight: 1.35 }}>
              <div>Pooled raw documents into a lake</div>
              <div>No classification on ingest</div>
              <div>No PO &rarr; GRN &rarr; invoice linkage</div>
              <div>Black-box, unexplained outputs</div>
              <div>Big-bang integration, all at once</div>
            </div>
          </div>
          <div style={{ ...card, padding: '38px 40px', display: 'flex', flexDirection: 'column', background: '#16291f', borderColor: 'rgba(47,208,138,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2fd08a' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2fd08a' }}>Tessera</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 24, color: '#eaf2ee', lineHeight: 1.35 }}>
              <div>Classifies &amp; extracts at ingestion</div>
              <div>Structured, searchable, deduplicated</div>
              <div>Full lifecycle linkage, automatically</div>
              <div>Evidence-backed, explainable decisions</div>
              <div>Prove on public data, scale in phases</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'Live demo',
    screenLabel: '10 Demo',
    render: ({ onOpenConsole }) => (
      <div style={{ ...base, background: '#2fd08a', color: '#06140e', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0a3324', margin: '0 0 32px' }}>10 — Live demo</p>
        <h2 style={{ fontSize: 104, lineHeight: 1.0, fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 28px' }}>See it on public data.</h2>
        <p style={{ fontSize: 36, color: '#0a3324', margin: '0 0 56px', maxWidth: 1300 }}>
          A simulated data lake — purchase orders, invoices, goods receipts, customs docs, and junk — ingested, classified, and reconciled live.
        </p>
        <button
          onClick={onOpenConsole}
          style={{
            alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 14, background: '#06140e', color: '#2fd08a',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 24, letterSpacing: '0.04em', padding: '24px 40px', borderRadius: 12,
            border: 'none', cursor: 'pointer',
          }}
        >
          Open the Tessera Console &nbsp;&rarr;
        </button>
      </div>
    ),
  },
  {
    label: 'Insights',
    screenLabel: '11 Insights',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>11 — Insights</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 44px' }}>Insights for procurement and finance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22, marginBottom: 30 }}>
          {[
            ['24,318', '#eaf2ee', 'documents processed'],
            ['92.4%', '#2fd08a', 'auto-match rate'],
            ['$48.2M', '#eaf2ee', 'spend reconciled'],
            ['$1.6M', '#f5b942', 'value at risk, flagged'],
          ].map(([num, color, label]) => (
            <div key={label} style={{ ...card, padding: 30 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 48, fontWeight: 500, color }}>{num}</div>
              <div style={{ fontSize: 24, color: '#9fb3a9', marginTop: 8 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, flex: 1 }}>
          <div style={{ ...card, padding: '32px 36px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Exceptions by type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#cdddd4' }}>
              {[
                ['Price variance', '46%', '#f2685f', '418'],
                ['Duplicate invoice', '34%', '#f5b942', '307'],
                ['Short delivery', '27%', '#f5b942', '241'],
                ['Missing GRN', '19%', '#2fd08a', '166'],
                ['FX / customs', '12%', '#2fd08a', '98'],
              ].map(([label, width, color, val]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 170 }}>{label}</span>
                  <span style={{ height: 18, width, background: color, borderRadius: 4 }} />
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...card, padding: '32px 36px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Value at risk by country</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#cdddd4' }}>
              {[
                ['Germany', '52%', '$430k'],
                ['Brazil', '41%', '$362k'],
                ['India', '33%', '$295k'],
                ['USA', '26%', '$268k'],
                ['Singapore', '18%', '$201k'],
              ].map(([label, width, val]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 120 }}>{label}</span>
                  <span style={{ height: 18, width, background: '#2c6b52', borderRadius: 4 }} />
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'Built to scale',
    screenLabel: '12 Scale',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>12 — Scalability &amp; reliability</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 48px' }}>Built to absorb the daily dump</h2>
        <div style={{ display: 'flex', gap: 48, flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40, width: 520 }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 72, fontWeight: 500, color: '#2fd08a', letterSpacing: '-0.02em' }}>50k+</div>
              <div style={{ fontSize: 24, color: '#9fb3a9', marginTop: 8 }}>documents/day, headroom to spare</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 72, fontWeight: 500, color: '#eaf2ee', letterSpacing: '-0.02em' }}>&lt; 2s</div>
              <div style={{ fontSize: 24, color: '#9fb3a9', marginTop: 8 }}>median classify + extract per document</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26 }}>
            {[
              ['Horizontally scalable ingestion', "Queue-based workers scale out with volume — spikes drain, they don't break."],
              ['Backfill without re-integration', "Reprocess years of history through the same pipeline as today's arrivals."],
              ['Humans only on exceptions', 'Confidence gates keep review effort flat as volume grows.'],
            ].map(([title, body]) => (
              <div key={title} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 22 }}>
                <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 24, color: '#9fb3a9', lineHeight: 1.4 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    label: 'Trust before access',
    screenLabel: '13 Trust',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>13 — Trust</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 22px' }}>We earn access — we don't ask for it on faith</h2>
        <p style={{ fontSize: 30, color: '#9fb3a9', margin: '0 0 auto', maxWidth: 1200 }}>The last vendor got the keys to the lake up front. We flip that order entirely.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 24, marginTop: 52 }}>
          {[
            ['Prove on public data first', 'This demo runs entirely on public documents — zero access to your systems.'],
            ['No credentials until value is shown', 'Access is granted in stages, each gated on a result you can verify.'],
            ['Every decision is auditable', 'Each match and exception links back to the source documents behind it.'],
            ['Enterprise security posture', 'SOC 2 Type II, encryption in transit & at rest, least-privilege, data residency.'],
          ].map(([title, body]) => (
            <div key={title} style={{ ...card, padding: '34px 38px' }}>
              <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: 24, color: '#9fb3a9', lineHeight: 1.4 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: 'The rollout',
    screenLabel: '14 Rollout',
    render: () => (
      <div style={base}>
        <p style={eyebrow}>14 — The rollout</p>
        <h2 style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 56px' }}>A path that earns each step</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22, flex: 1 }}>
          {[
            ['PHASE 0 · NOW', 'Public-data proof', 'Demonstrate ingest, classify & reconcile on open data.', 'This session', true],
            ['PHASE 1', 'Sandbox slice', 'One country, read-only sample. Baseline against your data.', '2–3 weeks', false],
            ['PHASE 2', 'Production reconciliation', 'Live three-way matching with humans on exceptions.', '4–8 weeks', false],
            ['PHASE 3', 'Scale & automate', 'All countries, backfill history, raise automation thresholds.', 'Ongoing', false],
          ].map(([tag, title, body, when, highlight]) => (
            <div
              key={tag as string}
              style={{
                ...card, padding: '32px 30px', display: 'flex', flexDirection: 'column',
                ...(highlight ? { background: '#16291f', borderColor: 'rgba(47,208,138,0.35)' } : {}),
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#2fd08a', letterSpacing: '0.08em' }}>{tag}</div>
              <div style={{ fontSize: 30, fontWeight: 600, margin: '18px 0 12px' }}>{title}</div>
              <div style={{ fontSize: 24, color: '#9fb3a9', lineHeight: 1.4, marginBottom: 'auto' }}>{body}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#6f8a7e', marginTop: 18 }}>{when}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: "What's next",
    screenLabel: '15 Next',
    render: () => (
      <div style={{ ...base, justifyContent: 'center' }}>
        <p style={{ ...eyebrow, margin: '0 0 32px' }}>15 — What happens next</p>
        <h2 style={{ fontSize: 84, lineHeight: 1.03, fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 56px', maxWidth: 1400 }}>
          Structure the chaos — starting with a slice, not your whole lake.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32, maxWidth: 1560 }}>
          {[
            ['01', 'Pick a country slice', 'Read-only, lowest-risk, highest-signal.'],
            ['02', 'Baseline in two weeks', 'Match rate and value-at-risk on your own data.'],
            ['03', 'Decide on the evidence', 'Scale only if the numbers earn it.'],
          ].map(([n, title, body]) => (
            <div key={n} style={{ borderTop: '2px solid #2fd08a', paddingTop: 22 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#6f8a7e', marginBottom: 12 }}>{n}</div>
              <div style={{ fontSize: 27, fontWeight: 600, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 24, color: '#9fb3a9', lineHeight: 1.4 }}>{body}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 72, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,11px)', gridTemplateRows: 'repeat(2,11px)', gap: 4 }}>
            <div style={{ background: '#2fd08a' }} />
            <div style={{ border: '1px solid #2c4a3c' }} />
            <div style={{ border: '1px solid #2c4a3c' }} />
            <div style={{ background: '#2fd08a' }} />
          </div>
          <span style={{ fontSize: 28, fontWeight: 600 }}>Tessera</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: '#6f8a7e', marginLeft: 8 }}>Order from the data lake.</span>
        </div>
      </div>
    ),
  },
];
