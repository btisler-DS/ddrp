# DDRP — Deterministic Document Review Protocol

**Version:** 0.2.0
**Status:** Released
**DOI:** [10.5281/zenodo.18427220](https://doi.org/10.5281/zenodo.18427220)
**Web:** [quantuminquiry.org/DDRP](https://quantuminquiry.org/DDRP/)

---

## About This Repository

**This is a reference implementation, not a product.**

If you're looking for a turnkey document review solution, this isn't it. DDRP is architectural infrastructure—a working example of how to build deterministic, auditable text analysis without semantic inference. Think of it like publishing a cryptographic library: it doesn't solve your whole problem, but if you need this specific capability (reproducible detection of obligation-creating language with full audit trails), here's a rigorously tested pattern you can adapt.

**What this demonstrates:**
- That fully deterministic document structure extraction is achievable (49 lexical patterns, zero probabilistic components)
- How to instrument it for accountability (transaction logs, hash chains, hostile audit methodology)
- How to make it adaptable (versioned specs, modifiable pattern registries, domain-specific customization)

**Who this is for:** Regulatory agencies, compliance departments, or research teams who need to process documents reproducibly and can't rely on "the AI said so" explanations. If you need to defend your analysis in court, cite it in policy, or build institutional knowledge into executable patterns, this architecture might matter to you.

**What this is not:** A compliance solution, a legal opinion, or a finished product. It detects lexical patterns and tracks structural completeness. It deliberately refuses to interpret meaning, assess correctness, or make recommendations. These limitations are design features, not bugs.

**How to evaluate this:** Don't ask "can DDRP review my documents?" Ask "do I need deterministic, falsifiable document structure extraction as a component in my system?" If yes, examine the code, run the hostile audit, and decide if this pattern fits your requirements. Fork it, adapt it, or use it as a reference for building your own. That's the point.

---

## What DDRP Is

DDRP is a procedural accountability instrument that generates deterministic,
inspectable artifacts recording whether obligation-creating language was emitted
and whether it was structurally resolved.

It is designed to support post-hoc inspection and reconstruction of epistemic
care, especially in high-stakes or AI-mediated contexts, without interpreting
meaning or making semantic judgments.

DDRP produces **inspectable, reproducible artifacts**:
- Operator detection results (REQ, DEF, CAUSE, SCOPE, UNIV, ANCHOR)
- Obligation instantiation with status (SATISFIED, OPEN)
- Cryptographically chained transaction records
- SHA-256 hashes for traceability

> **Note:** In DDRP, "obligation" refers to a structural linguistic pattern
> (e.g., requirement operators), not a legal or normative determination.

---

## What DDRP Is For

DDRP exists to make it possible to reconstruct whether procedural care was
exercised when obligation-creating language appeared in an artifact.

It answers questions such as:
- Did obligation-creating language appear?
- Were those obligations structurally resolved or left open?
- Was this detectable at the time of production?

It does not answer whether the obligation was correct, valid, legal, or intended.

---

## What DDRP Is Not

| DDRP Does NOT | Reason |
|---------------|--------|
| Interpret meaning | Lexical detection only |
| Assert compliance | No legal authority |
| Make recommendations | Structural observation only |
| Use AI/ML | Deterministic pattern matching |
| Provide risk scores | No subjective weighting |
| Assess document quality | Structural observations, not evaluations |

**Human judgment is always required.**

DDRP intentionally trades coverage and linguistic sophistication for
determinism and inspectability. This is a design constraint, not a limitation.

---

## Prerequisites

- **Node.js** v18 or later
- **npm** (included with Node.js)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/btisler-DS/ddrp.git
cd ddrp

# Install dependencies
npm install

# Install UI dependencies
npm run ui:install
```

---

## Running DDRP

### Command Line

```bash
# Verify determinism
npm run verify

# Run hostile audit (all tests)
npm run hostile-audit

# Run v0.1 audit only
npm run hostile-audit-v01

# Run v0.2 audit only
npm run hostile-audit-v02

# TypeScript type check
npm run typecheck
```

### Browser UI

```bash
# Start development server
npm run ui

# Opens at http://localhost:3000
```

### Production Build

```bash
# Build static files
npm run ui:build

# Output in ui/dist/
```

---

## Project Structure

```
ddrp/
├── src/                          # Core TypeScript modules
│   ├── operators_v0_1.ts         # Operator detection (49 patterns)
│   ├── obligations_v0_1.ts       # Obligation instantiation
│   ├── pdf_ingest_v0_2.ts        # PDF text extraction
│   ├── pdf_canonicalizer_v0_2.ts # Text canonicalization (7 rules)
│   ├── protocol_meta_v0_2.ts     # DOI/provenance metadata
│   ├── transaction_log_v0_2.ts   # Transaction records (DTR)
│   └── verify_checkpoint.ts      # Verification script
├── ui/                           # Browser UI
│   ├── src/
│   │   ├── ddrp-core.js          # Browser bundle
│   │   ├── main.js               # UI application
│   │   └── style.css             # Styling
│   └── public/
│       ├── WARRANTY.md           # Warranty & non-reliance
│       ├── USER_GUIDE.md         # User guide
│       └── ORG_EXPANSION.md      # Organization expansion
├── tests/
│   ├── hostile_audit_v0_1/       # v0.1 hostile audit (10 tests)
│   └── hostile_audit_v0_2/       # v0.2 hostile audit (16 tests)
├── transactions/                 # Transaction records (created at runtime)
├── DDRP_v0_1_SPEC.md             # v0.1 specification (frozen)
├── DDRP_v0_2_SPEC.md             # v0.2 specification
└── package.json
```

---

## Example Run

### 1. Start the UI

```bash
npm run ui
```

### 2. Enter or Load Text

Paste document text or click "Load PDF" to extract text from a PDF.

### 3. Run Deterministic Review

Click "Run Deterministic Review" to:
- Detect operators
- Instantiate obligations
- Generate hashes

### 4. Export Results

Export as JSON:
- Operators only
- Obligations only
- Full bundle (with provenance)
- Transaction record (if enabled)

### Example Output (Bundle)

```json
{
  "protocol": {
    "name": "DDRP",
    "version": "0.2.0",
    "doi": "10.5281/zenodo.18427220",
    "doi_status": "assigned"
  },
  "provenance": {
    "input_format": "text",
    "canonical_hash": "a1b2c3d4e5f67890",
    "input_hash": "a1b2c3d4"
  },
  "timestamp": "2026-01-30T12:00:00.000Z",
  "data": {
    "detection": { ... },
    "obligations": { ... },
    "transaction_record": { ... }
  }
}
```

---

## Determinism Guarantee

> **Identical input + identical ruleset = identical output (byte-for-byte)**

Run `npm run hostile-audit` to verify. All tests must pass.

---

## Hostile Audit Tests

### v0.1 Tests (10)

| Test | Purpose |
|------|---------|
| 01_environment | Operators detected from valid input |
| 02_determinism | 50 runs produce identical output |
| 03_semantic | Semantically equivalent text produces different output |
| 04_rhetoric | Rhetoric-only text produces no REQ operators |
| 05_missing_info | Incomplete requirements have OPEN status |
| 06_contradiction | Conflicting requirements detected separately |
| 07_scope | Scope operators detected, no inference |
| 08_anchor | External references detected, no content imported |
| 09_garbage | Non-language input produces no operators |
| 10_mutability | Pattern changes affect detection |

### v0.2 Tests (16)

Includes all v0.1 tests plus:

| Test | Purpose |
|------|---------|
| 11_canon_determinism | Canonicalization is deterministic |
| 12-15 | Canonicalization rule verification |
| 21-25 | PDF tests (skipped without PDF files) |
| 31-34 | Transaction record tests |

---

## Explicit Non-Claims

DDRP **does not**:

1. **Interpret meaning** — Detection is lexical, not semantic
2. **Assert compliance** — No legal or regulatory authority
3. **Certify correctness** — Structural observation only
4. **Provide recommendations** — No advisory function
5. **Seal documents legally** — Transaction records are for traceability only
6. **Assess document quality, completeness, or correctness** — Outputs are structural observations, not evaluations

---

## Documentation

### Walkthroughs

| Document | Description |
|----------|-------------|
| [DDRP_Walk_Through.pdf](./DDRP_Walk_Through.pdf) | Guided introduction to the protocol |
| [DDRP_Walk_Through_Run_Review.pdf](./DDRP_Walk_Through_Run_Review.pdf) | Step-by-step review execution guide |

### Specifications & Guides

| Document | Description |
|----------|-------------|
| [DDRP_v0_1_SPEC.md](./DDRP_v0_1_SPEC.md) | v0.1 specification (frozen) |
| [DDRP_v0_2_SPEC.md](./DDRP_v0_2_SPEC.md) | v0.2 specification (current) |
| [ui/public/USER_GUIDE.md](./ui/public/USER_GUIDE.md) | UI user guide |
| [ui/public/WARRANTY.md](./ui/public/WARRANTY.md) | Warranty & non-reliance |
| [tests/hostile_audit_v0_1/RUN.md](./tests/hostile_audit_v0_1/RUN.md) | v0.1 audit criteria |
| [tests/hostile_audit_v0_2/RUN.md](./tests/hostile_audit_v0_2/RUN.md) | v0.2 audit criteria |

---

## Citation

```bibtex
@software{ddrp2026,
  title = {DDRP: Deterministic Document Review Protocol},
  version = {0.2.0},
  year = {2026},
  doi = {10.5281/zenodo.18427220},
  url = {https://github.com/btisler-DS/ddrp}
}
```

---

## License

Released under [CC BY-NC 4.0](./LICENSE).

Non-commercial use only. See LICENSE for full terms.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01-29 | Initial release |
| 0.2.0 | 2026-01-30 | PDF support, canonicalization, SHA-256, transaction records, DOI |
