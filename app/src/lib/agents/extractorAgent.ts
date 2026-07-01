import { modelClassify, heuristicClassify } from '../classify';
import type { Agent, AgentContext } from './types';

/** The deep-extraction stage — calls the local Gemma model via Ollama. Falls
 * back to the keyword classifier internally if the model is unreachable, so
 * the pipeline always produces a result even with no agent after this one. */
export const extractorAgent: Agent = {
  id: 'extractor',
  label: 'Deep Extractor',
  async run(ctx: AgentContext) {
    try {
      return await modelClassify(ctx.name, ctx.text);
    } catch (e) {
      console.warn('[Tessera] extractor agent: local model unreachable, falling back to keywords. ' + (e instanceof Error ? e.message : e));
      return heuristicClassify(ctx.name, ctx.text);
    }
  },
};
