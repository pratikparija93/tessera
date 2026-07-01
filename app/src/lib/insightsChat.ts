import { llmEndpoint, llmModel } from './classify';
import type { ReconGroup, TessDoc } from './types';
import { k, money } from './format';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** Parse @mentions from a question — returns lower-cased tokens without the @ */
export function parseMentions(question: string): string[] {
  return (question.match(/@[\w.-]+/g) || []).map((m) => m.slice(1).toLowerCase());
}

function buildContext(docs: TessDoc[], groups: ReconGroup[], mentions: string[] = []): string {
  const done = docs.filter((d) => d.status === 'done');
  const routed = done.filter((d) => !d.isJunk);
  const quarantined = done.filter((d) => d.isJunk);
  const allExceptions = groups.filter((g) => g.isEx);
  const riskTotal = groups.reduce((a, g) => a + (g.risk || 0), 0);
  const avgConf = routed.length
    ? Math.round((routed.reduce((a, d) => a + (d.confidence || 0), 0) / routed.length) * 100)
    : 0;

  // If @mentions present, build a focused context scoped to matching docs/groups
  if (mentions.length > 0) {
    const matchDoc = (d: TessDoc) => mentions.some((m) =>
      d.name.toLowerCase().includes(m) ||
      (d.fields.vendor || '').toLowerCase().includes(m) ||
      (d.fields.poRef || '').toLowerCase().includes(m) ||
      (d.fields.docId || '').toLowerCase().includes(m)
    );
    const matchGroup = (g: ReconGroup) => mentions.some((m) =>
      g.vendor.toLowerCase().includes(m) ||
      g.ref.toLowerCase().includes(m) ||
      g.key.toLowerCase().includes(m)
    );

    const focusDocs = done.filter(matchDoc);
    const focusGroups = groups.filter(matchGroup);
    const focusExceptions = focusGroups.filter((g) => g.isEx);

    const docLines = focusDocs.map((d) =>
      `- ${d.name} | ${d.type || 'unknown'} | ${Math.round((d.confidence || 0) * 100)}% | ${d.fields.vendor || '—'} | ${d.fields.total != null ? money(d.fields.currency, d.fields.total) : '—'}`
    ).join('\n');

    const groupLines = focusGroups.map((g) =>
      `- ${g.vendor} | PO ${g.ref} | ${g.status.replace(/_/g, ' ')} | risk: ${money(g.cur, g.risk)}`
    ).join('\n');

    return [
      `FOCUSED CONTEXT — query targets: ${mentions.map((m) => '@' + m).join(', ')}`,
      '',
      focusDocs.length ? `MATCHING DOCUMENTS (${focusDocs.length})\n${docLines}` : 'No matching documents found.',
      '',
      focusGroups.length ? `MATCHING GROUPS (${focusGroups.length})\n${groupLines}` : '',
      focusExceptions.length ? `\nEXCEPTIONS IN SCOPE\n${focusExceptions.map((g) => `- ${g.vendor} | ${g.status.replace(/_/g, ' ')} | ${money(g.cur, g.risk)} at risk`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
  }

  const exLines = allExceptions
    .sort((a, b) => (b.risk || 0) - (a.risk || 0))
    .map((g) => `- ${g.vendor} | ${g.status.replace(/_/g, ' ')} | ${money(g.cur, g.risk)} at risk | PO ref: ${g.ref}`)
    .join('\n');

  const vendors = [...new Set(routed.map((d) => d.fields.vendor).filter(Boolean))].slice(0, 10).join(', ');

  return [
    'BATCH SUMMARY',
    `Total documents ingested: ${done.length}`,
    `Routed to AP: ${routed.length}`,
    `Quarantined as junk: ${quarantined.length}`,
    `Exceptions found: ${allExceptions.length}`,
    `Total value at risk: ${k(riskTotal)}`,
    `Average classification confidence: ${avgConf}%`,
    `Matched groups (clean): ${groups.filter((g) => g.status === 'matched').length}`,
    '',
    allExceptions.length ? `EXCEPTIONS (sorted by risk)\n${exLines}` : 'No exceptions — all documents reconciled cleanly.',
    '',
    vendors ? `VENDORS IN BATCH: ${vendors}` : '',
  ].filter(Boolean).join('\n');
}

function buildPrompt(question: string, history: ChatMessage[], context: string): string {
  const systemPrompt =
    'You are Tessera Analyst, an AP and procurement analyst assistant embedded in Tessera. ' +
    'Answer questions about the current document batch using only the data provided. ' +
    'Be concise (2-4 sentences). If something cannot be answered from the data, say so plainly. ' +
    'Never make up vendor names, amounts, or document details not present in the context.\n\n' +
    'CURRENT BATCH DATA:\n' + context;

  const historyLines = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');

  return systemPrompt +
    (historyLines ? '\n\nCONVERSATION HISTORY:\n' + historyLines : '') +
    '\n\nUser: ' + question +
    '\nAssistant:';
}

/** Streams the response token-by-token, calling onToken for each chunk.
 * Resolves when the stream is complete. */
export async function streamChatMessage(
  question: string,
  history: ChatMessage[],
  docs: TessDoc[],
  groups: ReconGroup[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const mentions = parseMentions(question);
  const context = buildContext(docs, groups, mentions);
  const fullPrompt = buildPrompt(question, history, context);
  const endpoint = llmEndpoint();
  const isOpenAI = /\/(chat\/)?completions$/.test(endpoint) || /\/v1\b/.test(endpoint);

  const payload = isOpenAI
    ? { model: llmModel(), messages: [{ role: 'user', content: fullPrompt }], temperature: 0.3, stream: true }
    : { model: llmModel(), prompt: fullPrompt, stream: true, options: { temperature: 0.3 } };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!resp.ok) throw new Error('HTTP ' + resp.status + ' from ' + endpoint);
  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // Process all complete newline-delimited JSON chunks in the buffer
    const lines = buf.split('\n');
    buf = lines.pop() ?? ''; // last element may be incomplete

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (isOpenAI) {
        // SSE format: "data: {...}" or "data: [DONE]"
        const data = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
        if (data === '[DONE]') return;
        try {
          const j = JSON.parse(data);
          const token = j?.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch { /* partial chunk, skip */ }
      } else {
        // Ollama NDJSON format: {"response":"token","done":false}
        try {
          const j = JSON.parse(trimmed);
          if (j?.response) onToken(j.response);
          if (j?.done) return;
        } catch { /* partial chunk, skip */ }
      }
    }
  }
}
