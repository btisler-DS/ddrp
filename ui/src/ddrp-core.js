/**
 * DDRP Core v0.2 - Browser Bundle
 *
 * This is a browser-compatible bundle of the DDRP v0.2 core.
 * It contains the exact same logic as the Node.js version.
 *
 * v0.2 additions:
 * - PDF ingestion (via pdfjs-dist)
 * - Text canonicalization
 * - SHA-256 hashing for archival traceability
 * - Protocol metadata with DOI support
 *
 * No semantic interpretation. Lexical only.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ============================================================================
// Utility: SHA-256 Hash (for archival traceability)
// ============================================================================

/**
 * Compute SHA-256 hash using SubtleCrypto (browser).
 * Returns first 16 hex characters (64 bits) for display.
 */
export async function sha256Hash(data) {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16);
}

/**
 * Synchronous non-cryptographic hash for backward compatibility.
 * Use sha256Hash for anything that will be archived.
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// Protocol Metadata (v0.2)
// ============================================================================

export const PROTOCOL_META = {
  name: 'DDRP',
  version: '0.2.0',
  doi: '10.5281/zenodo.18427220',
  doi_status: 'assigned',
  spec_url: 'https://github.com/btisler-DS/ddrp',
};

export function formatDOI(meta = PROTOCOL_META) {
  if (meta.doi_status === 'assigned' && meta.doi) {
    return `DOI: ${meta.doi}`;
  }
  return 'DOI: unassigned (preprint planned)';
}

export function createTextProvenance(canonicalHash, inputHash) {
  return {
    input_format: 'text',
    canonical_hash: canonicalHash,
    input_hash: inputHash,
  };
}

export function createPDFProvenance(pdfHash, canonicalHash, inputHash) {
  return {
    input_format: 'pdf',
    pdf_hash: pdfHash,
    canonical_hash: canonicalHash,
    input_hash: inputHash,
  };
}

export function wrapWithProtocol(data, provenance) {
  return {
    protocol: { ...PROTOCOL_META },
    provenance,
    timestamp: new Date().toISOString(),
    data,
  };
}

// ============================================================================
// PDF Canonicalization Rules (v0.2)
// ============================================================================

const CANON_RULES_V0_2 = [
  {
    id: 'CANON_NORMALIZE_NEWLINES_001',
    apply: (text) => text.replace(/\r\n?/g, '\n'),
  },
  {
    id: 'CANON_COLLAPSE_WHITESPACE_001',
    apply: (text) => text.replace(/[ \t]+/g, ' '),
  },
  {
    id: 'CANON_TRIM_LINES_001',
    apply: (text) => text.split('\n').map(line => line.trim()).join('\n'),
  },
  {
    id: 'CANON_PRESERVE_PARAGRAPHS_001',
    apply: (text) => text.replace(/\n{3,}/g, '\n\n'),
  },
  {
    id: 'CANON_REMOVE_PAGE_NUMBERS_001',
    apply: (text) => text.replace(/^\d+$/gm, ''),
  },
  {
    id: 'CANON_COLLAPSE_EMPTY_LINES_001',
    apply: (text) => text.replace(/\n{3,}/g, '\n\n'),
  },
  {
    id: 'CANON_TRIM_DOCUMENT_001',
    apply: (text) => text.trim(),
  },
];

export const CANON_VERSION = '0.2.0';
export const CANON_RULE_COUNT = CANON_RULES_V0_2.length;

/**
 * Canonicalize text using versioned rules.
 * Returns result with applied_rules for traceability.
 */
export async function canonicalizeText(rawText) {
  const appliedRules = [];
  let text = rawText;

  for (const rule of CANON_RULES_V0_2) {
    text = rule.apply(text);
    appliedRules.push(rule.id);
  }

  const canonicalHash = await sha256Hash(text);

  return {
    version: CANON_VERSION,
    rule_count: CANON_RULES_V0_2.length,
    applied_rules: appliedRules,
    original_length: rawText.length,
    canonical_length: text.length,
    canonical_text: text,
    canonical_hash: canonicalHash,
  };
}

// ============================================================================
// PDF Ingestion (v0.2)
// ============================================================================

export const PDF_INGEST_VERSION = '0.2.0';
const MIN_CHARS_PER_PAGE = 100;

/**
 * Ingest PDF and extract text.
 * Rejects encrypted and scanned PDFs.
 */
export async function ingestPDF(pdfArrayBuffer) {
  const pdfHash = await sha256Hash(pdfArrayBuffer);

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfArrayBuffer),
      useSystemFonts: false,
      disableFontFace: true,
    });

    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;

    const pageTexts = [];
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map(item => item.str || '')
        .join(' ');

      pageTexts.push(pageText);
      totalChars += pageText.length;
    }

    const rawText = pageTexts.join('\n\n');

    // Check for scanned PDF
    const avgCharsPerPage = totalChars / pageCount;
    if (avgCharsPerPage < MIN_CHARS_PER_PAGE) {
      return {
        version: PDF_INGEST_VERSION,
        success: false,
        error: {
          code: 'SCANNED_SUSPECT',
          message: `PDF appears to be scanned (${Math.round(avgCharsPerPage)} chars/page). OCR is not supported.`,
        },
        page_count: pageCount,
        raw_text: '',
        pdf_hash: pdfHash,
        metadata: { is_encrypted: false, is_scanned: true },
      };
    }

    // Check for empty
    if (rawText.trim().length === 0) {
      return {
        version: PDF_INGEST_VERSION,
        success: false,
        error: {
          code: 'EMPTY',
          message: 'No text could be extracted from this PDF.',
        },
        page_count: pageCount,
        raw_text: '',
        pdf_hash: pdfHash,
        metadata: { is_encrypted: false, is_scanned: false },
      };
    }

    // Get metadata
    let producer, creationDate;
    try {
      const info = await pdfDocument.getMetadata();
      producer = info?.info?.Producer;
      creationDate = info?.info?.CreationDate;
    } catch {
      // Metadata not available
    }

    return {
      version: PDF_INGEST_VERSION,
      success: true,
      page_count: pageCount,
      raw_text: rawText,
      pdf_hash: pdfHash,
      metadata: {
        is_encrypted: false,
        is_scanned: false,
        producer,
        creation_date: creationDate,
      },
    };
  } catch (err) {
    // Check for encryption
    if (err.name === 'PasswordException' || err.message?.includes('password')) {
      return {
        version: PDF_INGEST_VERSION,
        success: false,
        error: {
          code: 'ENCRYPTED',
          message: 'This PDF is encrypted. DDRP cannot process encrypted PDFs.',
        },
        page_count: 0,
        raw_text: '',
        pdf_hash: pdfHash,
        metadata: { is_encrypted: true, is_scanned: false },
      };
    }

    return {
      version: PDF_INGEST_VERSION,
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Failed to parse PDF: ${err.message}`,
      },
      page_count: 0,
      raw_text: '',
      pdf_hash: pdfHash,
      metadata: { is_encrypted: false, is_scanned: false },
    };
  }
}

// ============================================================================
// Pattern Registry v0.1 (unchanged)
// ============================================================================

const PATTERNS_V0_1 = [
  // REQ (Requirement / Deontic) - Hard requirements
  {
    id: 'REQ_MUST_001',
    op_type: 'REQ',
    pattern: /\b(must)\b(?!\s+not)/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'hard', negated: false }),
  },
  {
    id: 'REQ_MUST_NOT_001',
    op_type: 'REQ',
    pattern: /\b(must\s+not|mustn't)\b/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'hard', negated: true }),
  },
  {
    id: 'REQ_SHALL_001',
    op_type: 'REQ',
    pattern: /\b(shall)\b(?!\s+not)/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'hard', negated: false }),
  },
  {
    id: 'REQ_SHALL_NOT_001',
    op_type: 'REQ',
    pattern: /\b(shall\s+not|shan't)\b/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'hard', negated: true }),
  },
  {
    id: 'REQ_REQUIRED_001',
    op_type: 'REQ',
    pattern: /\b(required|is\s+required|are\s+required)\b/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'hard', negated: false }),
  },
  {
    id: 'REQ_PROHIBITED_001',
    op_type: 'REQ',
    pattern: /\b(prohibited|is\s+prohibited|are\s+prohibited)\b/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'hard', negated: true }),
  },
  {
    id: 'REQ_MAY_NOT_001',
    op_type: 'REQ',
    pattern: /\b(may\s+not)\b/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'hard', negated: true }),
  },
  // REQ - Soft requirements
  {
    id: 'REQ_SHOULD_001',
    op_type: 'REQ',
    pattern: /\b(should)\b(?!\s+not)/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'soft', negated: false }),
  },
  {
    id: 'REQ_SHOULD_NOT_001',
    op_type: 'REQ',
    pattern: /\b(should\s+not|shouldn't)\b/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'soft', negated: true }),
  },
  {
    id: 'REQ_RECOMMENDED_001',
    op_type: 'REQ',
    pattern: /\b(recommended|is\s+recommended|are\s+recommended)\b/gi,
    capture_names: ['keyword'],
    metadata_extractor: () => ({ strength: 'soft', negated: false }),
  },
  // DEF (Definition / Binding)
  {
    id: 'DEF_QUOTED_MEANS_001',
    op_type: 'DEF',
    pattern: /"([^"]+)"\s+means\b/gi,
    capture_names: ['term'],
  },
  {
    id: 'DEF_QUOTED_MEANS_002',
    op_type: 'DEF',
    pattern: /'([^']+)'\s+means\b/gi,
    capture_names: ['term'],
  },
  {
    id: 'DEF_TERM_MEANS_001',
    op_type: 'DEF',
    pattern: /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+means\b/g,
    capture_names: ['term'],
  },
  {
    id: 'DEF_DEFINED_AS_001',
    op_type: 'DEF',
    pattern: /\b([A-Za-z][a-zA-Z\s]*?)\s+(?:is|are)\s+defined\s+as\b/gi,
    capture_names: ['term'],
  },
  {
    id: 'DEF_FOR_PURPOSES_001',
    op_type: 'DEF',
    pattern: /\bfor\s+(?:the\s+)?purposes?\s+of\s+this\s+(?:document|policy|agreement|section|article)\s*,?\s*(?:the\s+term\s+)?["']?([^"',]+?)["']?\s+(?:means|refers?\s+to|shall\s+mean)\b/gi,
    capture_names: ['term'],
  },
  // CAUSE (Causality / Justification)
  {
    id: 'CAUSE_BECAUSE_001',
    op_type: 'CAUSE',
    pattern: /\b(because)\b/gi,
    capture_names: ['keyword'],
  },
  {
    id: 'CAUSE_THEREFORE_001',
    op_type: 'CAUSE',
    pattern: /\b(therefore)\b/gi,
    capture_names: ['keyword'],
  },
  {
    id: 'CAUSE_THUS_001',
    op_type: 'CAUSE',
    pattern: /\b(thus)\b/gi,
    capture_names: ['keyword'],
  },
  {
    id: 'CAUSE_HENCE_001',
    op_type: 'CAUSE',
    pattern: /\b(hence)\b/gi,
    capture_names: ['keyword'],
  },
  {
    id: 'CAUSE_AS_RESULT_001',
    op_type: 'CAUSE',
    pattern: /\b(as\s+a\s+result)\b/gi,
    capture_names: ['keyword'],
  },
  {
    id: 'CAUSE_IN_ORDER_TO_001',
    op_type: 'CAUSE',
    pattern: /\b(in\s+order\s+to)\b/gi,
    capture_names: ['keyword'],
  },
  {
    id: 'CAUSE_DUE_TO_001',
    op_type: 'CAUSE',
    pattern: /\b(due\s+to)\b/gi,
    capture_names: ['keyword'],
  },
  {
    id: 'CAUSE_CONSEQUENTLY_001',
    op_type: 'CAUSE',
    pattern: /\b(consequently)\b/gi,
    capture_names: ['keyword'],
  },
  // SCOPE (Applicability / Context gating)
  {
    id: 'SCOPE_IN_THIS_DOC_001',
    op_type: 'SCOPE',
    pattern: /\b(in\s+this\s+(?:document|agreement|policy|section|article|chapter))\b/gi,
    capture_names: ['scope_phrase'],
  },
  {
    id: 'SCOPE_FOR_PURPOSES_001',
    op_type: 'SCOPE',
    pattern: /\b(for\s+(?:the\s+)?purposes?\s+of)\b/gi,
    capture_names: ['scope_phrase'],
  },
  {
    id: 'SCOPE_UNDER_THIS_001',
    op_type: 'SCOPE',
    pattern: /\b(under\s+this\s+(?:policy|agreement|section|contract))\b/gi,
    capture_names: ['scope_phrase'],
  },
  {
    id: 'SCOPE_FOR_USERS_001',
    op_type: 'SCOPE',
    pattern: /\b(for\s+(?:all\s+)?(?:users|customers|clients|employees|members|participants))\b/gi,
    capture_names: ['scope_phrase'],
  },
  {
    id: 'SCOPE_FOR_MINORS_001',
    op_type: 'SCOPE',
    pattern: /\b(for\s+(?:minors|children|individuals\s+under\s+\d+))\b/gi,
    capture_names: ['scope_phrase'],
  },
  {
    id: 'SCOPE_WITHIN_TIME_001',
    op_type: 'SCOPE',
    pattern: /\b(within\s+\d+\s+(?:days?|weeks?|months?|years?|hours?|minutes?|business\s+days?))\b/gi,
    capture_names: ['scope_phrase'],
  },
  {
    id: 'SCOPE_UNLESS_001',
    op_type: 'SCOPE',
    pattern: /\b(unless)\b/gi,
    capture_names: ['scope_phrase'],
  },
  {
    id: 'SCOPE_EXCEPT_001',
    op_type: 'SCOPE',
    pattern: /\b(except\s+(?:for|when|where|as|if)?)\b/gi,
    capture_names: ['scope_phrase'],
  },
  {
    id: 'SCOPE_IN_JURISDICTION_001',
    op_type: 'SCOPE',
    pattern: /\b(in\s+(?:the\s+)?(?:EU|US|UK|United\s+States|European\s+Union|California|Delaware|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?))\b/g,
    capture_names: ['scope_phrase'],
  },
  // UNIV (Universals / Quantifiers)
  {
    id: 'UNIV_ALL_001',
    op_type: 'UNIV',
    pattern: /\b(all)\b/gi,
    capture_names: ['quantifier'],
  },
  {
    id: 'UNIV_ALWAYS_001',
    op_type: 'UNIV',
    pattern: /\b(always)\b/gi,
    capture_names: ['quantifier'],
  },
  {
    id: 'UNIV_NEVER_001',
    op_type: 'UNIV',
    pattern: /\b(never)\b/gi,
    capture_names: ['quantifier'],
  },
  {
    id: 'UNIV_NONE_001',
    op_type: 'UNIV',
    pattern: /\b(none)\b/gi,
    capture_names: ['quantifier'],
  },
  {
    id: 'UNIV_EVERY_001',
    op_type: 'UNIV',
    pattern: /\b(every)\b/gi,
    capture_names: ['quantifier'],
  },
  {
    id: 'UNIV_ONLY_001',
    op_type: 'UNIV',
    pattern: /\b(only)\b/gi,
    capture_names: ['quantifier'],
  },
  {
    id: 'UNIV_ANY_001',
    op_type: 'UNIV',
    pattern: /\b(any)\b/gi,
    capture_names: ['quantifier'],
  },
  {
    id: 'UNIV_NO_001',
    op_type: 'UNIV',
    pattern: /\b(no)\b(?!\s+(?:one|body|thing|where))/gi,
    capture_names: ['quantifier'],
  },
  // ANCHOR (External reference / authority)
  {
    id: 'ANCHOR_ACCORDING_TO_001',
    op_type: 'ANCHOR',
    pattern: /\b(according\s+to)\b/gi,
    capture_names: ['anchor_phrase'],
  },
  {
    id: 'ANCHOR_PER_001',
    op_type: 'ANCHOR',
    pattern: /\b(per)\b(?=\s+(?:the|this|[A-Z]))/gi,
    capture_names: ['anchor_phrase'],
  },
  {
    id: 'ANCHOR_PURSUANT_TO_001',
    op_type: 'ANCHOR',
    pattern: /\b(pursuant\s+to)\b/gi,
    capture_names: ['anchor_phrase'],
  },
  {
    id: 'ANCHOR_AS_DEFINED_IN_001',
    op_type: 'ANCHOR',
    pattern: /\b(as\s+(?:defined|specified|described|set\s+forth)\s+in)\b/gi,
    capture_names: ['anchor_phrase'],
  },
  {
    id: 'ANCHOR_CITATION_BRACKET_001',
    op_type: 'ANCHOR',
    pattern: /(\[\d+\])/g,
    capture_names: ['citation'],
  },
  {
    id: 'ANCHOR_CITATION_PAREN_001',
    op_type: 'ANCHOR',
    pattern: /(\([A-Z]{2,}[\s\-]?\d*[^)]*\))/g,
    capture_names: ['citation'],
  },
  {
    id: 'ANCHOR_URL_001',
    op_type: 'ANCHOR',
    pattern: /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi,
    capture_names: ['url'],
  },
  {
    id: 'ANCHOR_ISO_001',
    op_type: 'ANCHOR',
    pattern: /\b(ISO\s*\d{4,5}(?:[-:]\d+)?)\b/gi,
    capture_names: ['standard'],
  },
  {
    id: 'ANCHOR_RFC_001',
    op_type: 'ANCHOR',
    pattern: /\b(RFC\s*\d{3,5})\b/gi,
    capture_names: ['standard'],
  },
];

// ============================================================================
// Operator Detector
// ============================================================================

export function detectOperators(text) {
  const matches = [];
  const inputHash = simpleHash(text);

  for (const patternDef of PATTERNS_V0_1) {
    patternDef.pattern.lastIndex = 0;

    let match;
    while ((match = patternDef.pattern.exec(text)) !== null) {
      const captures = {};

      for (let i = 0; i < patternDef.capture_names.length; i++) {
        if (match[i + 1] !== undefined) {
          captures[patternDef.capture_names[i]] = match[i + 1];
        }
      }

      const metadata = patternDef.metadata_extractor
        ? patternDef.metadata_extractor(match)
        : {};

      matches.push({
        op_type: patternDef.op_type,
        pattern_id: patternDef.id,
        char_start: match.index,
        char_end: match.index + match[0].length,
        matched_text: match[0],
        captures,
        metadata,
      });
    }
  }

  matches.sort((a, b) => {
    if (a.char_start !== b.char_start) {
      return a.char_start - b.char_start;
    }
    return a.pattern_id.localeCompare(b.pattern_id);
  });

  return {
    version: '0.1.0',
    pattern_count: PATTERNS_V0_1.length,
    matches,
    input_hash: inputHash,
  };
}

// ============================================================================
// Obligation Engine
// ============================================================================

const REQUIRED_FIELDS = {
  REQ_APPLICABILITY: ['what', 'who'],
  DEF_CONSISTENCY: ['what'],
  CAUSE_SUPPORT: ['why'],
  SCOPE_BOUNDING: ['scope'],
};

const OPERATOR_TO_OBLIGATION = {
  REQ: 'REQ_APPLICABILITY',
  DEF: 'DEF_CONSISTENCY',
  CAUSE: 'CAUSE_SUPPORT',
  SCOPE: 'SCOPE_BOUNDING',
};

const FIELD_SEARCH_WINDOW = 500;

function extractFieldsFromMatch(match) {
  const evidence = [];

  switch (match.op_type) {
    case 'DEF':
      if (match.captures['term']) {
        evidence.push({
          field: 'what',
          source_op_id: match.pattern_id,
          char_start: match.char_start,
          char_end: match.char_end,
          value: match.captures['term'],
        });
      }
      break;

    case 'CAUSE':
      evidence.push({
        field: 'why',
        source_op_id: match.pattern_id,
        char_start: match.char_start,
        char_end: match.char_end,
        value: match.matched_text,
      });
      break;

    case 'SCOPE':
      const scopePhrase = match.captures['scope_phrase'] || match.matched_text;

      if (/\b(?:for\s+(?:all\s+)?(?:users|customers|clients|employees|members|participants|minors|children))\b/i.test(scopePhrase)) {
        evidence.push({
          field: 'who',
          source_op_id: match.pattern_id,
          char_start: match.char_start,
          char_end: match.char_end,
          value: scopePhrase,
        });
      }

      if (/\b(?:in\s+(?:the\s+)?(?:EU|US|UK|United\s+States|European\s+Union|California|Delaware))\b/i.test(scopePhrase)) {
        evidence.push({
          field: 'where',
          source_op_id: match.pattern_id,
          char_start: match.char_start,
          char_end: match.char_end,
          value: scopePhrase,
        });
      }

      if (/\b(?:within\s+\d+\s+(?:days?|weeks?|months?|years?|hours?|minutes?|business\s+days?))\b/i.test(scopePhrase)) {
        evidence.push({
          field: 'when',
          source_op_id: match.pattern_id,
          char_start: match.char_start,
          char_end: match.char_end,
          value: scopePhrase,
        });
      }

      evidence.push({
        field: 'scope',
        source_op_id: match.pattern_id,
        char_start: match.char_start,
        char_end: match.char_end,
        value: scopePhrase,
      });
      break;
  }

  return evidence;
}

function matchKey(match) {
  return `${match.pattern_id}:${match.char_start}`;
}

function findNearbyFieldEvidence(triggerMatch, allMatches, allEvidence) {
  const nearbyEvidence = [];
  const triggerMid = (triggerMatch.char_start + triggerMatch.char_end) / 2;

  for (const match of allMatches) {
    if (match === triggerMatch) continue;

    const matchMid = (match.char_start + match.char_end) / 2;
    const distance = Math.abs(matchMid - triggerMid);

    if (distance <= FIELD_SEARCH_WINDOW) {
      const matchEvidence = allEvidence.get(matchKey(match));
      if (matchEvidence) {
        nearbyEvidence.push(...matchEvidence);
      }
    }
  }

  return nearbyEvidence;
}

function determineStatus(required, present) {
  const presentSet = new Set(present);
  const allPresent = required.every(f => presentSet.has(f));
  return allPresent ? 'SATISFIED' : 'OPEN';
}

export function instantiateObligations(matches) {
  const obligations = [];
  const counters = {
    REQ_APPLICABILITY: 0,
    DEF_CONSISTENCY: 0,
    CAUSE_SUPPORT: 0,
    SCOPE_BOUNDING: 0,
  };

  const allEvidence = new Map();
  for (const match of matches) {
    const evidence = extractFieldsFromMatch(match);
    allEvidence.set(matchKey(match), evidence);
  }

  for (const match of matches) {
    const oblType = OPERATOR_TO_OBLIGATION[match.op_type];
    if (!oblType) continue;

    const required = REQUIRED_FIELDS[oblType];
    const directEvidence = allEvidence.get(matchKey(match)) || [];
    const nearbyEvidence = findNearbyFieldEvidence(match, matches, allEvidence);
    const combinedEvidence = [...directEvidence, ...nearbyEvidence];

    const evidenceByField = new Map();
    for (const ev of combinedEvidence) {
      if (!evidenceByField.has(ev.field)) {
        evidenceByField.set(ev.field, ev);
      }
    }

    const presentFields = Array.from(evidenceByField.keys());
    const missingFields = required.filter(f => !evidenceByField.has(f));
    const status = determineStatus(required, presentFields);

    counters[oblType]++;
    const oblId = `OBL_${oblType}_${String(counters[oblType]).padStart(3, '0')}`;

    obligations.push({
      obl_id: oblId,
      obl_type: oblType,
      trigger_op_id: match.pattern_id,
      trigger_char_start: match.char_start,
      trigger_char_end: match.char_end,
      required_fields: required,
      present_fields: presentFields,
      missing_fields: missingFields,
      status,
      evidence: Array.from(evidenceByField.values()),
    });
  }

  const statusSummary = {
    SATISFIED: 0,
    OPEN: 0,
    CONTRADICTED: 0,
    AMBIGUOUS: 0,
  };

  for (const obl of obligations) {
    statusSummary[obl.status]++;
  }

  return {
    version: '0.1.0',
    obligation_count: obligations.length,
    obligations,
    status_summary: statusSummary,
  };
}

// ============================================================================
// Transaction Record (DTR) - Browser Version
// ============================================================================

export const TRANSACTION_VERSION = '0.2.0';
const GENESIS_HASH = '0000000000000000';
const DTR_DISCLAIMER = 'This record documents execution continuity only. It does not assert compliance, correctness, or legal validity.';

/**
 * Generate UUID v4 for transaction ID.
 */
function generateTransactionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create a transaction record for browser use.
 * Note: Browser version does not chain to previous transactions (no local storage).
 * For full chaining, use the Node.js transaction_log_v0_2.ts module.
 */
export async function createTransactionRecord(options) {
  const {
    inputHash,
    inputLength,
    inputFormat,
    detectionHash,
    obligationsHash,
    previousTransactionHash = GENESIS_HASH,
  } = options;

  const partialRecord = {
    ddrp_version: DDRP_VERSION,
    transaction_version: TRANSACTION_VERSION,
    transaction_id: generateTransactionId(),
    timestamp_local: new Date().toISOString(),
    timezone: 'UTC',
    input: {
      input_hash: inputHash,
      input_length: inputLength,
      input_format: inputFormat,
    },
    outputs: {
      detection_hash: detectionHash,
      obligations_hash: obligationsHash,
    },
    environment: {
      browser: navigator.userAgent.substring(0, 100),
      ddrp_version: DDRP_VERSION,
    },
    chain: {
      previous_transaction_hash: previousTransactionHash,
    },
    disclaimer: DTR_DISCLAIMER,
  };

  // Hash the transaction content
  const contentToHash = JSON.stringify({
    ddrp_version: partialRecord.ddrp_version,
    transaction_version: partialRecord.transaction_version,
    transaction_id: partialRecord.transaction_id,
    timestamp_local: partialRecord.timestamp_local,
    timezone: partialRecord.timezone,
    input: partialRecord.input,
    outputs: partialRecord.outputs,
    environment: partialRecord.environment,
    previous_transaction_hash: partialRecord.chain.previous_transaction_hash,
  });

  const transactionHash = await sha256Hash(contentToHash);

  return {
    ...partialRecord,
    chain: {
      previous_transaction_hash: previousTransactionHash,
      transaction_hash: transactionHash,
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export const DDRP_VERSION = '0.2.0';
export const PATTERN_COUNT = PATTERNS_V0_1.length;
