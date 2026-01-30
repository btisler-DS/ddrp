# DDRP v0.1 UI User Guide

## Overview

The DDRP UI is a minimal, offline-capable viewer for the Deterministic Document Review Protocol. It provides a browser interface to the same detection and obligation logic as the command-line tool.

**Key Properties:**
- Runs entirely in-browser (no server calls)
- Deterministic: identical input always produces identical output
- Lexical only: no semantic inference or interpretation

---

## Getting Started

### Running the UI

**Development mode:**
```bash
npm run ui
```
Opens at http://localhost:3000

**Production build:**
```bash
npm run ui:build
```
Outputs to `ui/dist/` for static hosting.

---

## Interface Panels

### 1. Document Input Panel

The large text area where you enter or load document text.

**Options:**
- **Type directly** - Paste or type document text
- **Load File** - Click to load a `.txt` file from disk
- **Known Samples** - Click any "Known:" button to load a test input

The character count updates as you type.

### 2. Review Controls

- **Run Review** - Executes DDRP detection and obligation instantiation on the current text
- **Self-Test** - Runs determinism verification (10 identical runs must produce identical output)

### 3. Operators Panel

After running a review, displays all detected operators in a table:

| Column | Description |
|--------|-------------|
| Type | Operator class (REQ, DEF, CAUSE, SCOPE, UNIV, ANCHOR) |
| Matched Text | The exact text that triggered the pattern |
| Pattern ID | Internal pattern identifier (e.g., REQ_MUST_001) |
| Position | Character range in source document (start-end) |

### 4. Obligations Panel

Displays instantiated obligations derived from detected operators:

| Column | Description |
|--------|-------------|
| ID | Unique obligation identifier |
| Type | Obligation class (REQ_APPLICABILITY, DEF_CONSISTENCY, etc.) |
| Status | SATISFIED, OPEN, CONTRADICTED, or AMBIGUOUS |
| Required Fields | WWWWHW fields this obligation type requires |
| Present Fields | Fields detected in proximity to the operator |
| Missing Fields | Fields required but not found |

### 5. Export Panel

Export results as JSON files:

- **Export Operators** - Detection results only
- **Export Obligations** - Obligation analysis only
- **Export Bundle** - Complete artifact (detection + obligations + metadata)

Filenames include version, input hash, and timestamp for traceability.

---

## Operator Types

| Type | Meaning | Example Lexemes |
|------|---------|-----------------|
| REQ | Requirement/mandate | must, shall, required |
| DEF | Definition | means, defined as, refers to |
| CAUSE | Causal relationship | because, therefore, due to |
| SCOPE | Applicability boundary | applies to, for users in, except |
| UNIV | Universal quantifier | all, every, any, no |
| ANCHOR | External reference | pursuant to, under, per |

---

## Obligation Statuses

| Status | Meaning |
|--------|---------|
| SATISFIED | All required WWWWHW fields are present |
| OPEN | One or more required fields are missing |
| CONTRADICTED | Conflicting operators detected (e.g., must + must not) |
| AMBIGUOUS | Cannot determine status due to structural issues |

---

## WWWWHW Field Model

Obligations track six field types:

- **WHO** - Actor/subject (users, customers, the company)
- **WHAT** - Action/object (submit, identification, data)
- **WHERE** - Location (in the EU, on the platform)
- **WHEN** - Temporal constraint (within 30 days, annually)
- **WHY** - Rationale (for compliance, to ensure)
- **HOW** - Method/manner (electronically, in writing)

Fields are detected by proximity heuristic (within 500 characters of operator).

---

## Self-Test

The self-test verifies:

1. **Determinism** - 10 consecutive runs produce byte-identical output
2. **Pattern count** - Confirms expected number of patterns loaded
3. **Sample coverage** - Runs all known test inputs

A passing self-test confirms the UI core matches protocol specification.

---

## Known Test Inputs

The UI includes 8 known inputs from the hostile audit:

| Name | Purpose |
|------|---------|
| Semantic A | Baseline requirement statement |
| Semantic B | Semantically equivalent, lexically different |
| Rhetoric | Tests immunity to persuasive language |
| Missing Info | Requirement with incomplete fields |
| Contradiction | Conflicting must/must-not statements |
| Scope | Jurisdictional boundary statement |
| Anchor | External standard reference |
| Garbage | Non-language input (should produce no operators) |

---

## Important Limitations

1. **No interpretation** - DDRP reports structure, not meaning
2. **No recommendations** - Results are descriptive artifacts only
3. **No compliance claims** - See WARRANTY.md
4. **Lexical only** - Semantically equivalent text may produce different results

---

## File Formats

### Operators JSON
```json
{
  "ddrp_version": "0.1",
  "input_hash": "abc123...",
  "match_count": 2,
  "matches": [
    {
      "op_type": "REQ",
      "matched_text": "must submit",
      "pattern_id": "REQ_MUST_001",
      "char_start": 6,
      "char_end": 17
    }
  ]
}
```

### Obligations JSON
```json
{
  "ddrp_version": "0.1",
  "obligation_count": 1,
  "status_summary": { "SATISFIED": 0, "OPEN": 1 },
  "obligations": [
    {
      "obl_id": "OBL_001",
      "obl_type": "REQ_APPLICABILITY",
      "status": "OPEN",
      "required_fields": ["WHO", "WHAT", "WHEN"],
      "present_fields": ["WHO", "WHAT"],
      "missing_fields": ["WHEN"]
    }
  ]
}
```

---

## Keyboard Shortcuts

None. The UI is intentionally minimal with no hidden functionality.

---

## Offline Use

Once loaded, the UI works entirely offline. No network requests are made during operation. All processing occurs in-browser using the bundled DDRP core.

---

## Troubleshooting

**"No document text provided"**
- Enter or load text before clicking Run Review

**Self-test shows FAIL**
- Browser may have modified JavaScript execution
- Try a different browser or clear cache

**Export not working**
- Run a review first to generate results
- Check browser download permissions

---

## Further Reading

- `WARRANTY.md` - Warranty and non-reliance disclaimer
- `ORG_EXPANSION.md` - Guidance for organizational deployment
- `DDRP_v0_1_SPEC.md` - Full protocol specification (in repository root)

---

**DDRP is a protocol. This UI is a viewer. Humans interpret results.**
