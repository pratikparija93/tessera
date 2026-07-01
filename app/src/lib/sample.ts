import type { DocFields, DocType } from './types';

interface SampleDoc {
  name: string;
  source: string;
  type: DocType;
  conf: number;
  fields: DocFields;
  scanned?: boolean;
}

interface SampleTxn {
  ref: string;
  vendor: string;
  country: string;
  cur: string;
  po: number | null;
  qty: number | null;
  recv?: number;
  inv: number;
  invno: string;
  grn: 'full' | 'short' | 'missing' | 'none';
  dup?: boolean;
  customs?: boolean;
  result: string;
}

export function buildSample(): SampleDoc[] {
  const T: SampleTxn[] = [
    // ── Matched ───────────────────────────────────────────────────────────
    { ref: '4471', vendor: 'Rhein Components GmbH',    country: 'Germany',      cur: 'EUR', po:  84200, qty: 4000, inv:  84200, invno: '77310',    grn: 'full',    result: 'matched' },
    { ref: '4477', vendor: 'Rhein Components GmbH',    country: 'Germany',      cur: 'EUR', po:  19750, qty:  500, inv:  19750, invno: '77410',    grn: 'full',    result: 'matched' },
    { ref: '4478', vendor: 'Andes Mining Supply',      country: 'Chile',        cur: 'USD', po: 204000, qty: 1500, inv: 204000, invno: 'CL-3390',  grn: 'full',    customs: true, result: 'matched' },
    { ref: '4479', vendor: 'Nakamura Electronics',     country: 'Japan',        cur: 'JPY', po: 9800000,qty: 800, inv: 9800000, invno: 'JP-1144',  grn: 'full',    customs: true, result: 'matched' },
    { ref: '4482', vendor: 'Seoul Precision Co',       country: 'South Korea',  cur: 'USD', po:  67300, qty: 2200, inv:  67300, invno: 'KR-8821',  grn: 'full',    customs: true, result: 'matched' },
    { ref: '4485', vendor: 'Warsaw Bearings Sp. z oo', country: 'Poland',       cur: 'EUR', po:  31600, qty: 3000, inv:  31600, invno: 'PL-0044',  grn: 'full',    result: 'matched' },
    { ref: '4486', vendor: 'Guadalajara Auto Parts',   country: 'Mexico',       cur: 'USD', po:  92100, qty: 1800, inv:  92100, invno: 'MX-5501',  grn: 'full',    customs: true, result: 'matched' },
    { ref: '4489', vendor: 'Toronto Packaging Ltd',    country: 'Canada',       cur: 'CAD', po:  48300, qty:  900, inv:  48300, invno: 'CA-2290',  grn: 'full',    result: 'matched' },
    { ref: '4491', vendor: 'Amsterdam Chemicals BV',   country: 'Netherlands',  cur: 'EUR', po: 156400, qty:  600, inv: 156400, invno: 'NL-7714',  grn: 'full',    result: 'matched' },
    { ref: '4493', vendor: 'KL Freight Solutions',     country: 'Malaysia',     cur: 'USD', po:  38900, qty: 4400, inv:  38900, invno: 'MY-6632',  grn: 'full',    customs: true, result: 'matched' },
    { ref: '4494', vendor: 'Vienna Precision Tools',   country: 'Austria',      cur: 'EUR', po:  71200, qty: 1100, inv:  71200, invno: 'AT-3309',  grn: 'full',    result: 'matched' },
    { ref: '4497', vendor: 'Dubai Logistics FZE',      country: 'UAE',          cur: 'USD', po: 118500, qty: 3600, inv: 118500, invno: 'AE-9920',  grn: 'full',    customs: true, result: 'matched' },
    { ref: '4499', vendor: 'Melbourne Resources Pty',  country: 'Australia',    cur: 'AUD', po:  87600, qty: 2700, inv:  87600, invno: 'AU-1155',  grn: 'full',    customs: true, result: 'matched' },
    { ref: '4501', vendor: 'Madrid Castings SL',       country: 'Spain',        cur: 'EUR', po:  43100, qty: 1400, inv:  43100, invno: 'ES-8802',  grn: 'full',    result: 'matched' },
    { ref: '4502', vendor: 'Rome Specialty Alloys',    country: 'Italy',        cur: 'EUR', po:  66700, qty: 2000, inv:  66700, invno: 'IT-4410',  grn: 'full',    result: 'matched' },
    { ref: '4503', vendor: 'Helsinki Seals Oy',        country: 'Finland',      cur: 'EUR', po:  28900, qty:  700, inv:  28900, invno: 'FI-3301',  grn: 'full',    result: 'matched' },
    { ref: '4504', vendor: 'Lisbon Cork & Composites', country: 'Portugal',     cur: 'EUR', po:  17400, qty: 5000, inv:  17400, invno: 'PT-2280',  grn: 'full',    result: 'matched' },
    { ref: '4505', vendor: 'Zurich Micro AG',          country: 'Switzerland',  cur: 'EUR', po: 209000, qty:  300, inv: 209000, invno: 'CH-6643',  grn: 'full',    result: 'matched' },

    // ── Price variance ────────────────────────────────────────────────────
    { ref: '4472', vendor: 'Aurora Logistics',         country: 'Brazil',       cur: 'BRL', po: 312000, qty:  600, inv: 343200, invno: '5521-BR',  grn: 'full',    customs: true, result: 'price' },
    { ref: '4480', vendor: 'Nordic Plastics AB',       country: 'Sweden',       cur: 'EUR', po:  54800, qty: 1200, inv:  60200, invno: 'SE-9910',  grn: 'full',    result: 'price' },
    { ref: '4488', vendor: 'Istanbul Cables AS',       country: 'Turkey',       cur: 'EUR', po:  79400, qty: 2500, inv:  87800, invno: 'TR-4417',  grn: 'full',    customs: true, result: 'price' },
    { ref: '4498', vendor: 'Taipei Semiconductors',    country: 'Taiwan',       cur: 'USD', po: 431000, qty:  400, inv: 472600, invno: 'TW-0088',  grn: 'full',    customs: true, result: 'price' },
    { ref: '4506', vendor: 'Casablanca Textiles',      country: 'Morocco',      cur: 'USD', po:  22600, qty: 8000, inv:  25100, invno: 'MA-1190',  grn: 'full',    customs: true, result: 'price' },

    // ── Short delivery ────────────────────────────────────────────────────
    { ref: '4473', vendor: 'Bharat Steelworks',        country: 'India',        cur: 'USD', po: 128400, qty: 4000, recv: 3600, inv: 128400, invno: '90244',  grn: 'short',  customs: true, result: 'short' },
    { ref: '4483', vendor: 'Mumbai Pharma Supplies',   country: 'India',        cur: 'USD', po:  96200, qty: 2000, recv: 1700, inv:  96200, invno: 'IN-5510', grn: 'short',  customs: true, result: 'short' },
    { ref: '4487', vendor: 'Bangkok Components Co',    country: 'Thailand',     cur: 'USD', po:  58700, qty: 3200, recv: 2800, inv:  58700, invno: 'TH-7723', grn: 'short',  customs: true, result: 'short' },
    { ref: '4507', vendor: 'Lagos Industrial Co',      country: 'Nigeria',      cur: 'USD', po:  41300, qty: 1600, recv: 1100, inv:  41300, invno: 'NG-2241', grn: 'short',  customs: true, result: 'short' },

    // ── Missing GRN ───────────────────────────────────────────────────────
    { ref: '4475', vendor: 'Continental Tooling',      country: 'United States',cur: 'USD', po:  73500, qty:  300, inv:  73500, invno: '10567',    grn: 'missing', result: 'missing_grn' },
    { ref: '4481', vendor: 'Cairo Textiles Ltd',       country: 'Egypt',        cur: 'USD', po:  34200, qty: 6000, inv:  34200, invno: 'EG-8831',  grn: 'missing', customs: true, result: 'missing_grn' },
    { ref: '4492', vendor: 'Buenos Aires Steel',       country: 'Argentina',    cur: 'USD', po: 187000, qty:  900, inv: 187000, invno: 'AR-3320',  grn: 'missing', customs: true, result: 'missing_grn' },

    // ── Missing PO ────────────────────────────────────────────────────────
    { ref: '4476', vendor: 'Lyon Métaux SA',           country: 'France',       cur: 'EUR', po: null, qty: null, inv:  45900, invno: 'FR-2208',  grn: 'none',    result: 'missing_po' },
    { ref: '4495', vendor: 'Nairobi Agri Supplies',    country: 'Kenya',        cur: 'USD', po: null, qty: null, inv:  18700, invno: 'KE-1102',  grn: 'none',    customs: true, result: 'missing_po' },
    { ref: '4508', vendor: 'Karachi Textiles',         country: 'Pakistan',     cur: 'USD', po: null, qty: null, inv:  29400, invno: 'PK-4490',  grn: 'none',    customs: true, result: 'missing_po' },

    // ── Duplicate invoice ─────────────────────────────────────────────────
    { ref: '4474', vendor: 'Pacific Freight Co',       country: 'Singapore',    cur: 'SGD', po:  56800, qty:  120, inv:  56800, invno: '88231',    grn: 'full',    dup: true, customs: true, result: 'duplicate' },
    { ref: '4490', vendor: 'Cape Town Mining Corp',    country: 'South Africa', cur: 'USD', po: 143600, qty:  750, inv: 143600, invno: 'ZA-6650',  grn: 'full',    dup: true, result: 'duplicate' },

    // ── Awaiting invoice ──────────────────────────────────────────────────
    { ref: '4496', vendor: 'Copenhagen Pharma A/S',    country: 'Denmark',      cur: 'EUR', po:  88400, qty:  450, inv:      0, invno: 'PENDING',  grn: 'full',    result: 'await_invoice' },
    { ref: '4500', vendor: 'Accra Gold Traders',       country: 'Ghana',        cur: 'USD', po:  61200, qty: 2100, inv:      0, invno: 'PENDING',  grn: 'full',    customs: true, result: 'await_invoice' },
  ];

  const docs: SampleDoc[] = [];
  const mk = (name: string, source: string, type: DocType, conf: number, fields: DocFields, scanned?: boolean) =>
    docs.push({ name, source, type, conf, fields, scanned });

  T.forEach((t) => {
    const isAwait = t.result === 'await_invoice';
    const isMissingPo = t.result === 'missing_po';
    // Warehouse GRNs with an even ref are phone-photographed and dropped in as images —
    // these route through the OCR enricher before extraction.
    const scannedGrn = parseInt(t.ref, 10) % 2 === 0;

    if (!isMissingPo) {
      mk(`PO-${t.ref}.pdf`, 'edi-feed', 'po', 0.97, {
        vendor: t.vendor, country: t.country, currency: t.cur,
        docId: 'PO-' + t.ref, poRef: 'PO-' + t.ref,
        total: t.po, qty: t.qty, summary: 'Purchase order',
      });
    }

    if (!isAwait) {
      if (t.grn === 'full') {
        mk(scannedGrn ? `GRN-${t.ref}.jpg` : `GRN-${t.ref}.pdf`, scannedGrn ? 'scan-batch' : 'sftp-drop', 'grn', scannedGrn ? 0.78 : 0.95, {
          vendor: t.vendor, country: t.country, currency: t.cur,
          docId: 'GRN-' + t.ref, poRef: 'PO-' + t.ref,
          total: null, qty: t.qty, summary: 'Goods received in full',
        }, scannedGrn);
      }
      if (t.grn === 'short') {
        mk(`GRN-${t.ref}.pdf`, 'sftp-drop', 'grn', 0.9, {
          vendor: t.vendor, country: t.country, currency: t.cur,
          docId: 'GRN-' + t.ref, poRef: 'PO-' + t.ref,
          total: null, qty: t.recv ?? null, summary: 'Short delivery — qty mismatch',
        });
      }
    }

    if (!isAwait) {
      mk(`INV-${t.invno}.pdf`, 'email-gateway', 'invoice', 0.96, {
        vendor: t.vendor, country: t.country, currency: t.cur,
        docId: 'INV-' + t.invno, poRef: 'PO-' + t.ref,
        total: t.inv, qty: null, summary: 'Supplier invoice',
      });
    }

    if (t.dup) {
      mk(`INV-${t.invno}_copy.pdf`, 'scan-batch', 'invoice', 0.93, {
        vendor: t.vendor, country: t.country, currency: t.cur,
        docId: 'INV-' + t.invno, poRef: 'PO-' + t.ref,
        total: t.inv, qty: null, summary: 'Duplicate submission',
      }, true);
    }

    if (t.customs) {
      mk(`CUST-${t.ref}.pdf`, 'sftp-drop', 'customs', 0.81, {
        vendor: null, country: t.country, currency: null,
        docId: 'CUS-' + t.ref, poRef: 'PO-' + t.ref,
        total: null, qty: null, summary: 'Customs declaration',
      });
    }
  });

  // Junk — variety of real-world noise
  ([
    ['RE_ payment_query.eml',        'email-gateway'],
    ['out_of_office_auto_reply.eml', 'email-gateway'],
    ['logistics_weekly_digest.html', 'email-gateway'],
    ['verify_account_login.eml',     'email-gateway'],
    ['holiday_closure_notice.pdf',   'sftp-drop'],
    ['DSC_4419.jpg',                 'scan-batch'],
    ['IMG_7823.jpg',                 'scan-batch'],
    ['newsletter_march_2025.html',   'email-gateway'],
    ['meeting_notes_q1.docx',        'email-gateway'],
    ['unsubscribe_confirm.eml',      'email-gateway'],
    ['system_alert_backup.eml',      'email-gateway'],
    ['fw_team_lunch.eml',            'email-gateway'],
    ['reset_password.eml',           'email-gateway'],
    ['scan_doc_001.jpg',             'scan-batch'],
    ['re_re_re_intro_call.eml',      'email-gateway'],
  ] as const).forEach(([name, source]) =>
    mk(name, source, 'junk', 0.97, { summary: 'Not a procurement document' }, source === 'scan-batch')
  );

  return docs;
}
