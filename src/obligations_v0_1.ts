/**
 * DDRP Obligation Engine v0.1
 *
 * Converts operator matches into structural obligations.
 * No semantic inference. No LLM. Pure function.
 *
 * Obligation classes (v0.1):
 * - REQ_APPLICABILITY: requirement has identifiable what + who
 * - DEF_CONSISTENCY: definition binds a term
 * - CAUSE_SUPPORT: causality link is present
 * - SCOPE_BOUNDING: scope constraint is explicit
 *
 * NOTE: v0.1 does not perform cross-obligation contradiction detection.
 * Contradictions require semantic understanding deferred to future versions.
 */

import { OperatorMatch, OperatorType } from './operators_v0_1';

// ============================================================================
// Types
// ============================================================================

export type ObligationType =
  | 'REQ_APPLICABILITY'
  | 'DEF_CONSISTENCY'
  | 'CAUSE_SUPPORT'
  | 'SCOPE_BOUNDING';

export type ObligationStatus = 'SATISFIED' | 'OPEN' | 'CONTRADICTED' | 'AMBIGUOUS';

export type FieldName = 'what' | 'who' | 'where' | 'when' | 'why' | 'scope';

export interface FieldEvidence {
  field: FieldName;
  source_op_id: string;
  char_start: number;
  char_end: number;
  value: string;
}

export interface ObligationInstance {
  obl_id: string;
  obl_type: ObligationType;
  trigger_op_id: string;
  trigger_char_start: number;
  trigger_char_end: number;
  required_fields: FieldName[];
  present_fields: FieldName[];
  missing_fields: FieldName[];
  status: ObligationStatus;
  evidence: FieldEvidence[];
}

export interface ObligationResult {
  version: string;
  obligation_count: number;
  obligations: ObligationInstance[];
  status_summary: Record<ObligationStatus, number>;
}

// ============================================================================
// Required Fields per Obligation Type (v0.1 Authoritative)
// ============================================================================

const REQUIRED_FIELDS: Record<ObligationType, FieldName[]> = {
  REQ_APPLICABILITY: ['what', 'who'],
  DEF_CONSISTENCY: ['what'],
  CAUSE_SUPPORT: ['why'],
  SCOPE_BOUNDING: ['scope'],
};

// ============================================================================
// Operator Type to Obligation Type Mapping
// ============================================================================

/**
 * Maps operator types to the obligation types they can trigger.
 * Not all operators trigger obligations directly.
 */
const OPERATOR_TO_OBLIGATION: Partial<Record<OperatorType, ObligationType>> = {
  REQ: 'REQ_APPLICABILITY',
  DEF: 'DEF_CONSISTENCY',
  CAUSE: 'CAUSE_SUPPORT',
  SCOPE: 'SCOPE_BOUNDING',
};

// Operators that provide field evidence but don't create obligations directly
const FIELD_PROVIDER_OPS: OperatorType[] = ['SCOPE', 'UNIV', 'ANCHOR'];

// ============================================================================
// Field Extraction Logic (Deterministic)
// ============================================================================

/**
 * Extract field evidence from an operator match.
 * Returns fields that can be deterministically inferred from the match.
 *
 * NOTE: This is conservative. We only mark a field as present
 * if we have explicit evidence from the operator match itself.
 */
function extractFieldsFromMatch(match: OperatorMatch): FieldEvidence[] {
  const evidence: FieldEvidence[] = [];

  switch (match.op_type) {
    case 'DEF':
      // DEF operators capture 'what' (the term being defined)
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
      // CAUSE operators establish 'why' (justification link exists)
      evidence.push({
        field: 'why',
        source_op_id: match.pattern_id,
        char_start: match.char_start,
        char_end: match.char_end,
        value: match.matched_text,
      });
      break;

    case 'SCOPE':
      // SCOPE operators can provide 'who', 'where', 'when', or 'scope'
      const scopePhrase = match.captures['scope_phrase'] || match.matched_text;

      // Detect 'who' from user-targeting scope patterns
      if (/\b(?:for\s+(?:all\s+)?(?:users|customers|clients|employees|members|participants|minors|children))\b/i.test(scopePhrase)) {
        evidence.push({
          field: 'who',
          source_op_id: match.pattern_id,
          char_start: match.char_start,
          char_end: match.char_end,
          value: scopePhrase,
        });
      }

      // Detect 'where' from jurisdiction patterns
      if (/\b(?:in\s+(?:the\s+)?(?:EU|US|UK|United\s+States|European\s+Union|California|Delaware))\b/i.test(scopePhrase)) {
        evidence.push({
          field: 'where',
          source_op_id: match.pattern_id,
          char_start: match.char_start,
          char_end: match.char_end,
          value: scopePhrase,
        });
      }

      // Detect 'when' from time-bound patterns
      if (/\b(?:within\s+\d+\s+(?:days?|weeks?|months?|years?|hours?|minutes?|business\s+days?))\b/i.test(scopePhrase)) {
        evidence.push({
          field: 'when',
          source_op_id: match.pattern_id,
          char_start: match.char_start,
          char_end: match.char_end,
          value: scopePhrase,
        });
      }

      // Always provide 'scope' for SCOPE operators
      evidence.push({
        field: 'scope',
        source_op_id: match.pattern_id,
        char_start: match.char_start,
        char_end: match.char_end,
        value: scopePhrase,
      });
      break;

    case 'REQ':
      // REQ operators alone don't provide field evidence
      // They require nearby SCOPE operators for 'who'
      // 'what' requires sentence parsing (deferred)
      break;

    case 'UNIV':
      // UNIV operators modify scope but don't provide WWWWHW fields directly
      break;

    case 'ANCHOR':
      // ANCHOR operators provide external reference but not WWWWHW fields
      break;
  }

  return evidence;
}

// ============================================================================
// Obligation Instantiation (Pure Function)
// ============================================================================

/**
 * Generate a deterministic obligation ID.
 * Format: OBL_{type}_{index}
 */
function generateObligationId(type: ObligationType, index: number): string {
  return `OBL_${type}_${String(index).padStart(3, '0')}`;
}

/**
 * Determine obligation status based on field presence.
 *
 * Rules:
 * - SATISFIED: all required fields present
 * - OPEN: one or more required fields missing
 * - AMBIGUOUS: field detection was inconclusive (reserved for future)
 * - CONTRADICTED: conflicting obligations (reserved for future)
 *
 * NOTE: v0.1 does not implement CONTRADICTED or AMBIGUOUS detection.
 * These require cross-obligation analysis deferred to future versions.
 */
function determineStatus(
  required: FieldName[],
  present: FieldName[]
): ObligationStatus {
  const presentSet = new Set(present);
  const allPresent = required.every(f => presentSet.has(f));

  if (allPresent) {
    return 'SATISFIED';
  }

  return 'OPEN';
}

/**
 * Find field evidence from nearby operators within a window.
 *
 * NOTE: v0.1 uses a simple character-distance heuristic.
 * This is intentionally naive. Sentence/section binding is deferred.
 */
const FIELD_SEARCH_WINDOW = 500; // characters

function findNearbyFieldEvidence(
  triggerMatch: OperatorMatch,
  allMatches: OperatorMatch[],
  allEvidence: Map<string, FieldEvidence[]>
): FieldEvidence[] {
  const nearbyEvidence: FieldEvidence[] = [];
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

function matchKey(match: OperatorMatch): string {
  return `${match.pattern_id}:${match.char_start}`;
}

// ============================================================================
// Main Obligation Engine
// ============================================================================

/**
 * Convert operator matches to obligations.
 *
 * This is a PURE FUNCTION:
 * - Same input → Same output
 * - No global state
 * - No randomness
 * - No external dependencies
 */
export function instantiateObligations(matches: OperatorMatch[]): ObligationResult {
  const obligations: ObligationInstance[] = [];
  const counters: Record<ObligationType, number> = {
    REQ_APPLICABILITY: 0,
    DEF_CONSISTENCY: 0,
    CAUSE_SUPPORT: 0,
    SCOPE_BOUNDING: 0,
  };

  // Phase 1: Extract all field evidence from all matches
  const allEvidence = new Map<string, FieldEvidence[]>();
  for (const match of matches) {
    const evidence = extractFieldsFromMatch(match);
    allEvidence.set(matchKey(match), evidence);
  }

  // Phase 2: Create obligations from trigger operators
  for (const match of matches) {
    const oblType = OPERATOR_TO_OBLIGATION[match.op_type];
    if (!oblType) continue;

    const required = REQUIRED_FIELDS[oblType];
    const directEvidence = allEvidence.get(matchKey(match)) || [];

    // Find nearby evidence for field completion
    const nearbyEvidence = findNearbyFieldEvidence(match, matches, allEvidence);
    const combinedEvidence = [...directEvidence, ...nearbyEvidence];

    // Deduplicate evidence by field (prefer direct evidence)
    const evidenceByField = new Map<FieldName, FieldEvidence>();
    for (const ev of combinedEvidence) {
      if (!evidenceByField.has(ev.field)) {
        evidenceByField.set(ev.field, ev);
      }
    }

    const presentFields = Array.from(evidenceByField.keys());
    const missingFields = required.filter(f => !evidenceByField.has(f));
    const status = determineStatus(required, presentFields);

    counters[oblType]++;
    const oblId = generateObligationId(oblType, counters[oblType]);

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

  // Compute status summary
  const statusSummary: Record<ObligationStatus, number> = {
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
// Factory function for convenient usage
// ============================================================================

export function createObligationEngine(): {
  process: (matches: OperatorMatch[]) => ObligationResult;
} {
  return {
    process: instantiateObligations,
  };
}
