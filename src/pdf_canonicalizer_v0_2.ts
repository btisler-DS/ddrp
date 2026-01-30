/**
 * DDRP v0.2 PDF Text Canonicalizer
 *
 * Normalizes extracted PDF text into canonical form.
 * All rules are deterministic, versioned, and documented.
 *
 * This module does NOT interpret text semantically.
 * It only applies structural normalization for consistent analysis.
 */

import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface CanonRule {
  id: string;
  description: string;
  apply: (text: string) => string;
}

export interface CanonConfig {
  version: string;
  rules: CanonRule[];
}

export interface CanonResult {
  version: string;
  rule_count: number;
  applied_rules: string[];
  original_length: number;
  canonical_length: number;
  canonical_text: string;
  canonical_hash: string;
}

// ============================================================================
// Hashing (SHA-256 for archival traceability)
// ============================================================================

/**
 * Compute SHA-256 hash of text for archival traceability.
 * Returns first 16 hex characters (64 bits) for display.
 */
export function sha256Hash(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').substring(0, 16);
}

// ============================================================================
// Canonicalization Rules (v0.2.0)
// ============================================================================

const CANON_RULES_V0_2: CanonRule[] = [
  {
    id: 'CANON_NORMALIZE_NEWLINES_001',
    description: 'Normalize line endings to LF',
    apply: (text: string): string => text.replace(/\r\n?/g, '\n'),
  },
  {
    id: 'CANON_COLLAPSE_WHITESPACE_001',
    description: 'Collapse multiple spaces/tabs to single space',
    apply: (text: string): string => text.replace(/[ \t]+/g, ' '),
  },
  {
    id: 'CANON_TRIM_LINES_001',
    description: 'Trim leading/trailing whitespace from each line',
    apply: (text: string): string => text.split('\n').map(line => line.trim()).join('\n'),
  },
  {
    id: 'CANON_PRESERVE_PARAGRAPHS_001',
    description: 'Preserve paragraph breaks (3+ newlines → double newline)',
    apply: (text: string): string => text.replace(/\n{3,}/g, '\n\n'),
  },
  {
    id: 'CANON_REMOVE_PAGE_NUMBERS_001',
    description: 'Remove standalone page numbers (digits only on a line)',
    apply: (text: string): string => text.replace(/^\d+$/gm, ''),
  },
  {
    id: 'CANON_COLLAPSE_EMPTY_LINES_001',
    description: 'Collapse consecutive empty lines after page number removal',
    apply: (text: string): string => text.replace(/\n{3,}/g, '\n\n'),
  },
  {
    id: 'CANON_TRIM_DOCUMENT_001',
    description: 'Trim leading/trailing whitespace from entire document',
    apply: (text: string): string => text.trim(),
  },
];

// ============================================================================
// Version & Registry Exports
// ============================================================================

export const CANON_VERSION = '0.2.0';
export const CANON_RULE_REGISTRY_V0_2 = CANON_RULES_V0_2;

// ============================================================================
// Main Canonicalization Function
// ============================================================================

/**
 * Canonicalize text using versioned rules.
 * Rules are applied in fixed order for determinism.
 *
 * @param rawText - Raw extracted text from PDF
 * @param config - Optional configuration override
 * @returns CanonResult with canonical text and metadata
 */
export function canonicalize(
  rawText: string,
  config?: Partial<CanonConfig>
): CanonResult {
  const rules = config?.rules ?? CANON_RULES_V0_2;
  const version = config?.version ?? CANON_VERSION;

  const appliedRules: string[] = [];
  let text = rawText;

  for (const rule of rules) {
    text = rule.apply(text);
    appliedRules.push(rule.id);
  }

  return {
    version,
    rule_count: rules.length,
    applied_rules: appliedRules,
    original_length: rawText.length,
    canonical_length: text.length,
    canonical_text: text,
    canonical_hash: sha256Hash(text),
  };
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCanonicalizer(): {
  process: (rawText: string) => CanonResult;
  getVersion: () => string;
  getRuleCount: () => number;
} {
  return {
    process: (rawText: string) => canonicalize(rawText),
    getVersion: () => CANON_VERSION,
    getRuleCount: () => CANON_RULES_V0_2.length,
  };
}
