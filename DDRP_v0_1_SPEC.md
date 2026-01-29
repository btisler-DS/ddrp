# DDRP v0.1 Specification

**Deterministic Document Review Protocol**
Version: 0.1.0
Status: Frozen

---

## Version Lock Notice

> **DDRP v0.1 behavior is frozen.**
> Future versions will extend scope, not reinterpret v0.1 outputs.
> Any behavioral change requires a version increment and updated documentation.

---

## 1. Purpose

### What DDRP Is

DDRP is a **deterministic protocol** for structurally reviewing documents. It detects linguistic operators that create obligations (requirements, definitions, causality claims, scope constraints) and evaluates whether those obligations are structurally resolved within the document.

DDRP produces **inspectable artifacts**:
- A list of detected operators with their locations
- A list of instantiated obligations with their status
- Reproducible, hashable output

### What DDRP Is Not

DDRP does not:
- Interpret meaning or intent
- Make truth claims about document content
- Provide compliance certification
- Offer recommendations or advice
- Summarize, explain, or judge documents
- Enforce any standard or regulation

DDRP **records structural state**. Human judgment is always required for interpretation.

---

## 2. Determinism Guarantees

DDRP v0.1 provides the following determinism guarantees:

| Guarantee | Description |
|-----------|-------------|
| **Reproducibility** | Identical input + identical ruleset = identical output (byte-for-byte) |
| **No stochastic components** | No randomness in detection or evaluation |
| **No LLM in decision path** | Operator detection and obligation evaluation use only deterministic pattern matching |
| **Stable ordering** | Matches ordered by character position, then pattern ID |
| **Versioned patterns** | Each pattern has a unique, versioned identifier |

### Verification

Run the operator detector N times on the same input. All N outputs must be identical. The verification script (`src/verify_checkpoint.ts`) confirms this property.

---

## 3. Operator Taxonomy

DDRP v0.1 detects six operator classes. These are **structural triggers**, not semantic categories.

### REQ (Requirement / Deontic)

Operators that create obligations or prohibitions.

- **Hard requirements**: must, shall, required, prohibited, may not
- **Soft requirements**: should, recommended

Tracked metadata: strength (hard/soft), negation

### DEF (Definition / Binding)

Operators that bind terms to meanings within the document's scope.

- Quoted term definitions: `"X" means...`
- Explicit definitions: `X is defined as...`
- Scoped definitions: `For purposes of this document, X means...`

Tracked capture: the term being defined

### CAUSE (Causality / Justification)

Operators that assert causal or justificatory relationships.

- Causal connectives: because, therefore, thus, hence, consequently
- Purpose phrases: in order to, due to, as a result

Note: DDRP detects the **presence** of a justification link, not its validity.

### SCOPE (Applicability / Context Gating)

Operators that constrain where, when, or to whom obligations apply.

- Document scope: in this document, under this policy
- Actor scope: for users, for customers, for minors
- Jurisdiction scope: in the EU, in California
- Temporal scope: within 30 days
- Exception markers: unless, except

### UNIV (Universals / Quantifiers)

Operators that create universal or existential scope boundaries.

- Universal: all, always, every, only
- Negative universal: never, none, no
- Existential: any

These modify the scope of nearby obligations.

### ANCHOR (External Reference / Authority)

Operators that reference external sources or authorities.

- Reference phrases: according to, per, pursuant to, as defined in
- Citations: [1], (ISO 27001), RFC 2119
- URLs

DDRP detects **presence** of external references, not their validity or content.

---

## 4. Obligation Model

### Obligation Types (v0.1)

| Type | Triggered By | Required Fields |
|------|--------------|-----------------|
| REQ_APPLICABILITY | REQ operators | what, who |
| DEF_CONSISTENCY | DEF operators | what |
| CAUSE_SUPPORT | CAUSE operators | why |
| SCOPE_BOUNDING | SCOPE operators | scope |

### Field Model (WWWWHW)

Obligations track six fields as **presence/absence signals**:

- **what**: the subject of the obligation
- **who**: the actor or affected party
- **where**: jurisdiction or location constraint
- **when**: temporal constraint
- **why**: justification or rationale
- **scope**: explicit applicability boundary

Not every obligation requires all fields. Each obligation type declares its required fields.

### Status Values

| Status | Meaning |
|--------|---------|
| SATISFIED | All required fields are present |
| OPEN | One or more required fields are missing |
| CONTRADICTED | Reserved for future: conflicting obligations detected |
| AMBIGUOUS | Reserved for future: field detection inconclusive |

**v0.1 Contradiction Behavior:** Contradiction detection is deferred; conflicting requirements may remain OPEN in v0.1. For example, if a document contains both "must do X" and "must not do X", v0.1 will create two separate obligations, both with status OPEN. Cross-obligation semantic comparison is not performed.

### Field Resolution (v0.1)

v0.1 uses a **proximity heuristic** for field resolution:
- Direct evidence from the triggering operator's captures
- Evidence from nearby operators within a character window

This is intentionally naive. Sentence-level and section-level binding are deferred.

---

## 5. Explicit Non-Goals

DDRP v0.1 explicitly does **not** attempt:

| Non-Goal | Rationale |
|----------|-----------|
| Semantic understanding | Requires interpretation beyond structural detection |
| Truth claims | DDRP detects structure, not validity |
| Compliance certification | Compliance requires domain expertise and legal authority |
| Enforcement | DDRP is a review aid, not an enforcement mechanism |
| Sentence parsing | Introduces complexity and potential non-determinism |
| Dependency parsing | Requires NLP tooling with probabilistic components |
| Confidence scoring | Implies probabilistic reasoning |
| Contradiction detection | Requires semantic comparison (deferred) |
| Cross-document analysis | v0.1 is single-document only |

---

## 6. Rebuild Instructions

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Steps

```bash
# Clone the repository
git clone <repository-url>
cd project_3

# Install dependencies
npm install

# Verify TypeScript compilation
npx tsc --noEmit

# Run checkpoint verification
npx ts-node src/verify_checkpoint.ts
```

### Expected Verification Output

```
=== DDRP v0.1 CHECKPOINT VERIFICATION ===

1. DETERMINISM TEST
   Runs: 10
   All identical: YES ✓

2. OPERATOR DETECTION
   Version: 0.1.0
   ...

3. OBLIGATION INSTANTIATION
   Version: 0.1.0
   ...

=== CHECKPOINT COMPLETE ===
```

If the determinism test reports `YES ✓`, the build is correct.

### Project Structure

```
project_3/
├── src/
│   ├── operators_v0_1.ts      # Operator detection engine
│   ├── obligations_v0_1.ts    # Obligation instantiation
│   └── verify_checkpoint.ts   # Verification script
├── tsconfig.json
├── package.json
└── DDRP_v0_1_SPEC.md          # This document
```

---

## 7. API Reference (Brief)

### Operator Detection

```typescript
import { createOperatorDetector } from './operators_v0_1';

const detector = createOperatorDetector();
const result = detector.detect(documentText);

// result.matches: OperatorMatch[]
// result.version: string
// result.input_hash: string
```

### Obligation Instantiation

```typescript
import { instantiateObligations } from './obligations_v0_1';

const obligations = instantiateObligations(operatorMatches);

// obligations.obligations: ObligationInstance[]
// obligations.status_summary: { SATISFIED, OPEN, CONTRADICTED, AMBIGUOUS }
```

---

## 8. Licensing and Attribution

DDRP is derived from PhiSeal's development history, extracted for clarity, safety, and regulatory compatibility.

This reference implementation is released as a non-commercial open-source protocol.

---

## Document History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-01-29 | Initial frozen release |
