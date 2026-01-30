/**
 * DDRP Core Taxonomy v0.1 - Deterministic Operator Detector
 *
 * Detects six operator classes via deterministic pattern matching:
 * - REQ (Requirement / Deontic)
 * - DEF (Definition / Binding)
 * - CAUSE (Causality / Justification)
 * - SCOPE (Applicability / Context gating)
 * - UNIV (Universals / Quantifiers)
 * - ANCHOR (External reference / authority)
 *
 * No LLM. No probabilistic components. No semantic inference.
 * Identical input + identical ruleset = identical output.
 *
 * NOTE: v0.1 scope resolution is sentence-agnostic.
 * All operators are treated as document-scoped.
 * Finer scope binding (sentence/section) is deferred.
 */

// DDRP is intentionally deterministic and non-semantic.
// It functions as a governance primitive for procedural reconstruction,
// not as a document analysis or language understanding system.

// ============================================================================
// Types
// ============================================================================

export type OperatorType = 'REQ' | 'DEF' | 'CAUSE' | 'SCOPE' | 'UNIV' | 'ANCHOR';

export type RequirementStrength = 'hard' | 'soft';

export interface OperatorMatch {
  op_type: OperatorType;
  pattern_id: string;
  char_start: number;
  char_end: number;
  matched_text: string;
  captures: Record<string, string>;
  metadata: {
    strength?: RequirementStrength;
    negated?: boolean;
  };
}

export interface PatternDefinition {
  id: string;
  op_type: OperatorType;
  pattern: RegExp;
  capture_names: string[];
  metadata_extractor?: (match: RegExpExecArray) => Record<string, unknown>;
}

export interface OperatorDetectorConfig {
  version: string;
  patterns: PatternDefinition[];
}

export interface DetectionResult {
  version: string;
  pattern_count: number;
  matches: OperatorMatch[];
  input_hash: string;
}

// ============================================================================
// Pattern Registry v0.1
// ============================================================================

const PATTERNS_V0_1: PatternDefinition[] = [
  // -------------------------------------------------------------------------
  // REQ (Requirement / Deontic) - Hard requirements
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // DEF (Definition / Binding)
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // CAUSE (Causality / Justification)
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // SCOPE (Applicability / Context gating)
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // UNIV (Universals / Quantifiers)
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // ANCHOR (External reference / authority)
  // -------------------------------------------------------------------------
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
// Utility: Deterministic hash
// ============================================================================

/**
 * NOTE: Deterministic non-cryptographic hash.
 * Acceptable for v0.1 change detection / traceability only.
 * Replace with SHA-256 before any evidentiary or sealing use.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// Operator Detector
// ============================================================================

/**
 * NOTE: Operator detection is purely lexical and deterministic.
 * No sentence parsing, dependency parsing, or semantic resolution is performed in v0.1.
 */
export class OperatorDetector {
  private config: OperatorDetectorConfig;

  constructor(config?: OperatorDetectorConfig) {
    this.config = config ?? {
      version: '0.1.0',
      patterns: PATTERNS_V0_1,
    };
  }

  /**
   * Detect all operators in the given text.
   * Returns matches in document order (by char_start).
   *
   * NOTE: v0.1 scope resolution is sentence-agnostic.
   * All operators are treated as document-scoped.
   * Finer scope binding (sentence/section) is deferred.
   */
  detect(text: string): DetectionResult {
    const matches: OperatorMatch[] = [];
    const inputHash = simpleHash(text);

    for (const patternDef of this.config.patterns) {
      // Reset regex lastIndex for global patterns
      patternDef.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = patternDef.pattern.exec(text)) !== null) {
        const captures: Record<string, string> = {};

        // Extract named captures based on capture_names
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
          metadata: metadata as OperatorMatch['metadata'],
        });
      }
    }

    // Sort by char_start for document order, then by pattern_id for determinism
    matches.sort((a, b) => {
      if (a.char_start !== b.char_start) {
        return a.char_start - b.char_start;
      }
      return a.pattern_id.localeCompare(b.pattern_id);
    });

    return {
      version: this.config.version,
      pattern_count: this.config.patterns.length,
      matches,
      input_hash: inputHash,
    };
  }

  /**
   * Get the current configuration version.
   */
  getVersion(): string {
    return this.config.version;
  }

  /**
   * Get pattern count by operator type.
   */
  getPatternStats(): Record<OperatorType, number> {
    const stats: Record<OperatorType, number> = {
      REQ: 0,
      DEF: 0,
      CAUSE: 0,
      SCOPE: 0,
      UNIV: 0,
      ANCHOR: 0,
    };

    for (const pattern of this.config.patterns) {
      stats[pattern.op_type]++;
    }

    return stats;
  }
}

// ============================================================================
// Factory function for default detector
// ============================================================================

export function createOperatorDetector(): OperatorDetector {
  return new OperatorDetector();
}

// ============================================================================
// Export pattern registry for inspection/testing
// ============================================================================

export const PATTERN_REGISTRY_V0_1 = PATTERNS_V0_1;
