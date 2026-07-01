import type { ClassifyResult } from '../types';
import type { Agent, AgentContext, PipelineResult, PipelineStep } from './types';
import { triageAgent } from './triageAgent';
import { ocrAgent } from './ocrAgent';
import { extractorAgent } from './extractorAgent';

// Default pipeline order: fast junk pre-filter → OCR enrichment for sparse
// text → LLM classification. Each agent is independently swappable via
// setPipeline() without touching the orchestrator or any other agent.
let pipeline: Agent[] = [triageAgent, ocrAgent, extractorAgent];

export function getPipeline(): Agent[] {
  return pipeline;
}

export function setPipeline(agents: Agent[]): void {
  if (!agents.length) throw new Error('Pipeline must have at least one agent');
  pipeline = agents;
}

const FALLBACK_RESULT: ClassifyResult = { type: 'junk', confidence: 0.4, fields: { summary: 'Could not read file' } };

export async function runPipeline(name: string, text: string, file?: File): Promise<PipelineResult> {
  const ctx: AgentContext = { name, text, file };
  const log: PipelineStep[] = [];

  for (const agent of pipeline) {
    const start = performance.now();
    try {
      const result = await agent.run(ctx);
      const durationMs = performance.now() - start;
      if (result) {
        log.push({ agent: agent.id, outcome: 'used', durationMs, detail: `type=${result.type} conf=${result.confidence.toFixed(2)}` });
        return { result, log, enrichedText: ctx.text };
      }
      log.push({ agent: agent.id, outcome: 'deferred', durationMs });
    } catch (e) {
      log.push({ agent: agent.id, outcome: 'error', durationMs: performance.now() - start, detail: e instanceof Error ? e.message : String(e) });
    }
  }

  return { result: FALLBACK_RESULT, log, enrichedText: ctx.text };
}

/** Runs `task` over `items` with at most `concurrency` in flight at once —
 * the "independent scaling" knob. Each item's pipeline run is fully
 * independent of the others, so raising concurrency parallelizes ingestion
 * without any shared state between runs. */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
  onItemDone?: (item: T, index: number, result: R) => void,
  shouldContinue?: () => boolean,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      if (shouldContinue && !shouldContinue()) return;
      const i = cursor++;
      const r = await task(items[i], i);
      results[i] = r;
      onItemDone?.(items[i], i, r);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker);
  await Promise.all(workers);
  return results;
}

export function pipelineConcurrency(): number {
  try {
    const n = parseInt(localStorage.getItem('tessera_pipeline_concurrency') || '', 10);
    return Number.isFinite(n) && n > 0 ? n : 4;
  } catch {
    return 4;
  }
}
