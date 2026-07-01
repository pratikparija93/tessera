import type { ClassifyResult, DocType, PipelineStep } from '../types';

export interface AgentContext {
  name: string;
  text: string;
  /** Raw file — available for real uploads, absent for synthetic sample docs.
   * Agents that need the binary (e.g. OCR) check for this before acting. */
  file?: File;
}

/** A pipeline stage. Agents run in order; the first to return a confident
 * result short-circuits the rest. Each agent is independently swappable —
 * register a different one via setPipeline() without touching the
 * orchestrator or any other agent. */
export interface Agent {
  id: string;
  label: string;
  /** Return null to defer to the next agent in the pipeline (not "doesn't apply": "isn't confident enough"). */
  run(ctx: AgentContext): Promise<ClassifyResult | null>;
}

export interface PipelineResult {
  result: ClassifyResult;
  log: PipelineStep[];
  /** Final ctx.text after all agents ran — may differ from the input if an
   * enrichment agent (e.g. OCR) rewrote it. */
  enrichedText: string;
}

export type { ClassifyResult, DocType, PipelineStep };
