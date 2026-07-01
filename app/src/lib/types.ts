export type DocType = 'po' | 'invoice' | 'grn' | 'customs' | 'junk';
export type DocStatus = 'queued' | 'classifying' | 'done';

export interface DocFields {
  vendor?: string | null;
  country?: string | null;
  currency?: string | null;
  docId?: string | null;
  poRef?: string | null;
  total?: number | null;
  qty?: number | null;
  summary?: string | null;
}

export interface PipelineStep {
  agent: string;
  outcome: 'used' | 'deferred' | 'error';
  durationMs: number;
  detail?: string;
}

export interface PolicyFlag {
  ruleId: string;
  severity: 'block' | 'warn';
  message: string;
}

export interface PolicyRuleConfig {
  enabled: boolean;
  threshold?: number;
}

export type PolicyConfig = Record<string, PolicyRuleConfig>;

export interface TessDoc {
  id: number;
  name: string;
  source: string;
  synthetic: boolean;
  sampleType?: DocType;
  sampleConf?: number;
  sampleFields?: DocFields;
  sampleScanned?: boolean;
  status: DocStatus;
  type: DocType | null;
  confidence: number;
  fields: DocFields;
  isJunk: boolean;
  needsReview: boolean;
  reasoning?: string;
  signals?: string[];
  excerpt?: string;
  pipelineLog?: PipelineStep[];
  previewUrl?: string;
  previewIsRealFile?: boolean;
  reviewStatus?: 'approved' | 'rejected';
  reviewNote?: string;
  policyFlags?: PolicyFlag[];
}

export interface ClassifyResult {
  type: DocType;
  confidence: number;
  fields: DocFields;
  reasoning?: string | null;
  signals?: string[] | null;
}

export type View = 'lake' | 'recon' | 'insights' | 'linkage' | 'architecture' | 'pitch';

export type GroupStatus =
  | 'matched'
  | 'price'
  | 'short'
  | 'duplicate'
  | 'missing_grn'
  | 'missing_po'
  | 'await_invoice'
  | 'orphan';

export interface ReconGroup {
  key: string;
  ref: string;
  vendor: string;
  country: string;
  cur: string;
  po: TessDoc | undefined;
  grns: TessDoc[];
  invs: TessDoc[];
  inv: TessDoc | undefined;
  poTotal: number | null;
  invTotal: number | null;
  poQty: number | null;
  recvQty: number | null;
  status: GroupStatus;
  risk: number;
  isEx: boolean;
  docNames: string[];
  all: TessDoc[];
}
