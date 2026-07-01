import type { Agent, AgentContext } from './types';

const TEXT_FLOOR = 150;
const IMAGE_EXT = /\.(png|jpe?g|webp|bmp|tiff?|gif|heic)$/i;
const PDF_EXT = /\.pdf$/i;

/** Renders the first page of a PDF to a canvas at 2× scale for OCR. */
async function renderPdfToCanvas(file: File): Promise<HTMLCanvasElement | null> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas;
  } catch {
    return null;
  }
}

/** Context-enrichment agent — does NOT classify. Runs after triage, before
 * extractor. If the document text is sparse (scanned PDF or image file), it
 * runs Tesseract OCR and writes the result back into ctx.text so the extractor
 * receives real content instead of an empty string.
 *
 * Returns null always — its job is enrichment, not classification. */
export const ocrAgent: Agent = {
  id: 'ocr',
  label: 'OCR Scanner',
  async run(ctx: AgentContext) {
    const existing = (ctx.text || '').trim();
    if (existing.length >= TEXT_FLOOR) return null;

    const file = ctx.file;
    if (!file) return null;

    let source: HTMLCanvasElement | File | null = null;

    if (IMAGE_EXT.test(ctx.name)) {
      source = file;
    } else if (PDF_EXT.test(ctx.name)) {
      source = await renderPdfToCanvas(file);
    }

    if (!source) return null;

    try {
      const { recognize } = await import('tesseract.js');
      const { data: { text } } = await recognize(source, 'eng', { logger: () => {} });
      const cleaned = text.replace(/\f/g, '\n').trim();
      if (cleaned.length > existing.length) {
        ctx.text = cleaned;
      }
    } catch (e) {
      console.warn('[Tessera] OCR agent failed:', e instanceof Error ? e.message : e);
    }

    return null;
  },
};
