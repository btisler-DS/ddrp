# DDRP v0.2 Specification

**Deterministic Document Review Protocol**
Version: 0.2.0
Status: Frozen

---

## Version Lock Notice

> **DDRP v0.2 behavior is frozen.**
> Future versions will extend scope, not reinterpret v0.2 outputs.
> Any behavioral change requires a version increment and updated documentation.

---

## Changes from v0.1

| Feature | v0.1 | v0.2 |
|---------|------|------|
| PDF ingestion | Not supported | Text-based PDFs supported |
| Text canonicalization | Not applicable | 7 versioned rules |
| Hashing | simpleHash (non-cryptographic) | SHA-256 for archival |
| Protocol metadata | Not included | DOI field, provenance |
| Scanned PDFs | Not applicable | Detected and rejected |
| Encrypted PDFs | Not applicable | Detected and rejected |

### Backward Compatibility

v0.2 maintains full backward compatibility with v0.1:
- Operator detection patterns unchanged
- Obligation instantiation rules unchanged
- v0.1 hostile audit tests pass under v0.2

---

## 1. Purpose

*(Unchanged from v0.1)*

DDRP is a **deterministic protocol** for structurally reviewing documents. It detects linguistic operators that create obligations and evaluates whether those obligations are structurally resolved within the document.

### What DDRP Is Not

*(Unchanged from v0.1)*

DDRP does not interpret, certify, recommend, or judge.

---

## 2. Determinism Guarantees

*(Unchanged from v0.1, extended for PDF)*

| Guarantee | Description |
|-----------|-------------|
| **Reproducibility** | Identical input + identical ruleset = identical output |
| **PDF determinism** | Same PDF bytes → same extracted text → same output |
| **Canonicalization determinism** | Same raw text → same canonical text |
| **No stochastic components** | No randomness anywhere |
| **No LLM in decision path** | All processing is deterministic |

---

## 3. PDF Processing (v0.2)

### 3.1 Supported Formats

| PDF Type | Support | Notes |
|----------|---------|-------|
| Text-based PDFs | Yes | Primary target |
| Digitally generated | Yes | Legal/policy documents |
| Scanned PDFs | No | Rejected (OCR is nondeterministic) |
| Encrypted PDFs | No | Rejected (cannot extract) |

### 3.2 Extraction Pipeline

```
PDF_BYTES
  ↓
pdf_ingest_v0_2 (pdfjs-dist)
  ↓
RAW_TEXT
  ↓
pdf_canonicalizer_v0_2
  ↓
CANONICAL_TEXT
  ↓
operators_v0_1
  ↓
DETECTION_RESULT
```

### 3.3 Canonicalization Rules (v0.2)

| Rule ID | Description |
|---------|-------------|
| CANON_NORMALIZE_NEWLINES_001 | Convert \r\n and \r to \n |
| CANON_COLLAPSE_WHITESPACE_001 | Multiple spaces/tabs → single space |
| CANON_TRIM_LINES_001 | Trim leading/trailing whitespace per line |
| CANON_PRESERVE_PARAGRAPHS_001 | Collapse 3+ newlines → double newline |
| CANON_REMOVE_PAGE_NUMBERS_001 | Remove standalone numeric lines |
| CANON_COLLAPSE_EMPTY_LINES_001 | Post-cleanup collapse |
| CANON_TRIM_DOCUMENT_001 | Trim entire document |

Rules are applied in fixed order. All rules are pure functions.

### 3.4 Rejection Criteria

| Condition | Error Code | Behavior |
|-----------|------------|----------|
| Encrypted PDF | ENCRYPTED | Reject immediately |
| < 100 chars/page | SCANNED_SUSPECT | Reject (likely scanned) |
| Zero text extracted | EMPTY | Reject |
| Parse failure | PARSE_ERROR | Reject with message |

### 3.5 Hash Chain (SHA-256)

v0.2 provides chain-of-custody hashes:

```json
{
  "provenance": {
    "input_format": "pdf",
    "pdf_hash": "abc123...",
    "canonical_hash": "def456...",
    "input_hash": "def456..."
  }
}
```

- `pdf_hash`: SHA-256 of original PDF bytes (truncated to 16 hex)
- `canonical_hash`: SHA-256 of canonicalized text
- `input_hash`: Hash used by detector (for text, same as canonical)

---

## 4. Protocol Metadata (v0.2)

### 4.1 Metadata Structure

```json
{
  "protocol": {
    "name": "DDRP",
    "version": "0.2.0",
    "doi": null,
    "doi_status": "unassigned"
  }
}
```

### 4.2 DOI Status

| Status | Meaning |
|--------|---------|
| unassigned | No DOI yet (preprint planned) |
| assigned | DOI has been assigned |

When `doi_status` is `"unassigned"`, display: `DOI: unassigned (preprint planned)`

When `doi_status` is `"assigned"`, display: `DOI: {doi}`

---

## 5. Operator Taxonomy

*(Unchanged from v0.1)*

Six operator classes: REQ, DEF, CAUSE, SCOPE, UNIV, ANCHOR.

See DDRP_v0_1_SPEC.md Section 3 for full details.

---

## 6. Obligation Model

*(Unchanged from v0.1)*

Four obligation types: REQ_APPLICABILITY, DEF_CONSISTENCY, CAUSE_SUPPORT, SCOPE_BOUNDING.

See DDRP_v0_1_SPEC.md Section 4 for full details.

---

## 7. Explicit Non-Goals

*(Extended from v0.1)*

| Non-Goal | Rationale |
|----------|-----------|
| OCR | Introduces nondeterminism |
| Image analysis | Not lexical |
| Form field extraction | Deferred to future version |
| PDF annotation processing | Deferred to future version |
| Complex layout handling | Text order may not match visual order |

---

## 8. Rebuild Instructions

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Steps

```bash
# Clone the repository
git clone https://github.com/btisler-DS/ddrp.git
cd ddrp

# Install dependencies
npm install
npm run ui:install

# Verify TypeScript compilation
npm run typecheck

# Run hostile audits
npm run hostile-audit

# Build UI
npm run ui:build
```

### Expected Audit Output

```
=== DDRP v0.1 HOSTILE AUDIT ===
...
AUDIT PASSED: All tests passed

=== DDRP v0.2 HOSTILE AUDIT ===
...
AUDIT PASSED: All tests passed (skipped tests require PDF files)
```

### Project Structure (v0.2)

```
ddrp/
├── src/
│   ├── operators_v0_1.ts         # Operator detection (v0.1, unchanged)
│   ├── obligations_v0_1.ts       # Obligation engine (v0.1, unchanged)
│   ├── pdf_ingest_v0_2.ts        # PDF text extraction
│   ├── pdf_canonicalizer_v0_2.ts # Text canonicalization
│   ├── protocol_meta_v0_2.ts     # Protocol metadata
│   └── verify_checkpoint.ts      # Verification script
├── ui/
│   ├── src/
│   │   ├── ddrp-core.js          # Browser bundle
│   │   ├── main.js               # UI application
│   │   └── style.css             # Styling
│   └── public/
│       ├── WARRANTY.md           # Warranty & non-reliance
│       ├── USER_GUIDE.md         # User guide
│       └── ORG_EXPANSION.md      # Organization expansion
├── tests/
│   ├── hostile_audit_v0_1/       # v0.1 hostile audit
│   └── hostile_audit_v0_2/       # v0.2 hostile audit
├── DDRP_v0_1_SPEC.md             # v0.1 specification
├── DDRP_v0_2_SPEC.md             # This document
└── package.json
```

---

## 9. Citation

If you use DDRP in academic work, please cite:

```bibtex
@software{ddrp2026,
  title = {DDRP: Deterministic Document Review Protocol},
  version = {0.2.0},
  year = {2026},
  url = {https://github.com/btisler-DS/ddrp},
  note = {DOI pending}
}
```

Plain text:

> DDRP: Deterministic Document Review Protocol, v0.2.0 (2026). https://github.com/btisler-DS/ddrp

---

## 10. Licensing and Attribution

DDRP is released as a non-commercial open-source protocol under CC-BY-NC-4.0.

---

## Document History

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-01-29 | Initial frozen release |
| 0.2.0 | 2026-01-30 | PDF support, canonicalization, SHA-256, protocol metadata |
