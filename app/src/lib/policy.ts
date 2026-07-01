import type { TessDoc, PolicyFlag, PolicyConfig, PolicyRuleConfig } from './types';

const STORAGE_KEY = 'tessera_policy_config';

export interface RuleMeta {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  hasThreshold: boolean;
  defaultThreshold?: number;
  thresholdLabel?: string;
  thresholdPrefix?: string;
}

export const RULE_META: RuleMeta[] = [
  {
    id: 'large_invoice',
    label: 'High-value approval gate',
    description: 'Warn when a document total exceeds a threshold — requires dual approval.',
    defaultEnabled: true,
    hasThreshold: true,
    defaultThreshold: 50000,
    thresholdLabel: 'Warn above',
    thresholdPrefix: '$',
  },
  {
    id: 'hard_block',
    label: 'Hard block above amount',
    description: 'Block (not just warn) documents that exceed a higher amount — stops auto-processing.',
    defaultEnabled: true,
    hasThreshold: true,
    defaultThreshold: 100000,
    thresholdLabel: 'Block above',
    thresholdPrefix: '$',
  },
  {
    id: 'missing_po_ref',
    label: 'Invoice missing PO reference',
    description: 'Flag invoices that have no associated PO reference number.',
    defaultEnabled: true,
    hasThreshold: false,
  },
  {
    id: 'new_vendor',
    label: 'First-time vendor',
    description: 'Warn when an invoice arrives from a vendor with no matching PO in the batch.',
    defaultEnabled: true,
    hasThreshold: false,
  },
  {
    id: 'currency_mismatch',
    label: 'Currency mismatch',
    description: 'Block when a PO and its invoice use different currencies — reconciliation impossible.',
    defaultEnabled: true,
    hasThreshold: false,
  },
];

export function defaultPolicyConfig(): PolicyConfig {
  const cfg: PolicyConfig = {};
  for (const r of RULE_META) {
    cfg[r.id] = { enabled: r.defaultEnabled, threshold: r.defaultThreshold };
  }
  return cfg;
}

export function loadPolicyConfig(): PolicyConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PolicyConfig;
      // Merge with defaults so newly added rules always appear
      const defaults = defaultPolicyConfig();
      for (const id of Object.keys(defaults)) {
        if (!parsed[id]) parsed[id] = defaults[id];
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return defaultPolicyConfig();
}

export function savePolicyConfig(cfg: PolicyConfig): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

function ruleCfg(cfg: PolicyConfig, id: string): PolicyRuleConfig {
  return cfg[id] ?? { enabled: false };
}

export function runPolicyCheck(doc: TessDoc, allDocs: TessDoc[], cfg: PolicyConfig): PolicyFlag[] {
  if (doc.isJunk || doc.status !== 'done') return [];
  const flags: PolicyFlag[] = [];
  const total = doc.fields.total ?? 0;
  const type = doc.type;

  // Rule: large_invoice
  const largeCfg = ruleCfg(cfg, 'large_invoice');
  if (largeCfg.enabled && (type === 'invoice' || type === 'po') && total > (largeCfg.threshold ?? 50000)) {
    flags.push({
      ruleId: 'large_invoice',
      severity: 'warn',
      message: `Total ${total.toLocaleString(undefined, { style: 'currency', currency: doc.fields.currency || 'USD', maximumFractionDigits: 0 })} exceeds $${(largeCfg.threshold ?? 50000).toLocaleString()} — dual approval required`,
    });
  }

  // Rule: hard_block
  const blockCfg = ruleCfg(cfg, 'hard_block');
  if (blockCfg.enabled && (type === 'invoice' || type === 'po') && total > (blockCfg.threshold ?? 100000)) {
    flags.push({
      ruleId: 'hard_block',
      severity: 'block',
      message: `Total exceeds $${(blockCfg.threshold ?? 100000).toLocaleString()} — automatic processing blocked`,
    });
  }

  // Rule: missing_po_ref
  const missingPoCfg = ruleCfg(cfg, 'missing_po_ref');
  if (missingPoCfg.enabled && type === 'invoice' && !doc.fields.poRef) {
    flags.push({
      ruleId: 'missing_po_ref',
      severity: 'warn',
      message: 'Invoice submitted without a PO reference — verify with requester',
    });
  }

  // Rule: new_vendor — invoice from a vendor that has no PO anywhere in the batch
  const newVendorCfg = ruleCfg(cfg, 'new_vendor');
  if (newVendorCfg.enabled && type === 'invoice' && doc.fields.vendor) {
    const vendor = doc.fields.vendor.toLowerCase();
    const hasPO = allDocs.some(
      (d) => d.id !== doc.id && d.type === 'po' && (d.fields.vendor || '').toLowerCase() === vendor
    );
    if (!hasPO) {
      flags.push({
        ruleId: 'new_vendor',
        severity: 'warn',
        message: `No matching PO found for vendor "${doc.fields.vendor}" — verify supplier credentials`,
      });
    }
  }

  // Rule: currency_mismatch — invoice currency differs from a PO for the same vendor/ref
  const currencyCfg = ruleCfg(cfg, 'currency_mismatch');
  if (currencyCfg.enabled && type === 'invoice' && doc.fields.currency && doc.fields.poRef) {
    const matchingPO = allDocs.find(
      (d) => d.type === 'po' && d.fields.docId === doc.fields.poRef
    );
    if (matchingPO && matchingPO.fields.currency && matchingPO.fields.currency !== doc.fields.currency) {
      flags.push({
        ruleId: 'currency_mismatch',
        severity: 'block',
        message: `Invoice currency ${doc.fields.currency} does not match PO currency ${matchingPO.fields.currency} — reconciliation blocked`,
      });
    }
  }

  return flags;
}
