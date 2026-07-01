import { heuristicClassify } from '../classify';
import type { Agent, AgentContext } from './types';

const JUNK_CONFIDENCE_FLOOR = 0.85;

/** Fast, local, no network call. Cheap keyword pass that short-circuits the
 * pipeline only when it's confident a document is junk (spam, out-of-office,
 * newsletters) — saving an LLM round-trip on the obvious cases. Anything
 * less than confidently-junk defers to the next agent (the deep extractor). */
export const triageAgent: Agent = {
  id: 'triage',
  label: 'Triage Clerk',
  async run(ctx: AgentContext) {
    const guess = heuristicClassify(ctx.name, ctx.text);
    if (guess.type === 'junk' && guess.confidence >= JUNK_CONFIDENCE_FLOOR) {
      return guess;
    }
    return null;
  },
};
