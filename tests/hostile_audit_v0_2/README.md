# DDRP v0.2 Hostile Audit

This directory contains the hostile audit test suite for DDRP v0.2, focusing on PDF ingestion and text canonicalization.

## Structure

```
hostile_audit_v0_2/
├── inputs/           # Test input files (text and PDF)
├── expected/         # Expected outputs for comparison
├── artifacts/        # Generated test artifacts
├── run_audit.ts      # Test runner
├── README.md         # This file
└── RUN.md           # Pass/fail criteria
```

## Test Categories

### v0.1 Regression Tests (01-02)

Re-run core v0.1 tests to ensure backward compatibility.

### Canonicalization Tests (11-15)

Test the text canonicalization pipeline:
- Determinism across multiple runs
- Rule application order
- Whitespace normalization
- Paragraph preservation
- SHA-256 hash format

### PDF Tests (21-25)

Test PDF ingestion (require actual PDF files):
- PDF determinism
- Encrypted PDF rejection
- Scanned PDF rejection
- Text parity (PDF vs paste)
- PDF mutation detection

## Running the Audit

```bash
npm run hostile-audit-v02
```

Or run both v0.1 and v0.2:

```bash
npm run hostile-audit
```

## PDF Test Files

PDF tests are skipped if test files are not present. To run PDF tests, add:

- `inputs/21_pdf_determinism.pdf` - Any text-based PDF
- `inputs/22_pdf_encrypted.pdf` - Password-protected PDF
- `inputs/23_pdf_scanned.pdf` - Image-only/scanned PDF
- `inputs/24_pdf_parity.pdf` + `inputs/24_pdf_parity.txt` - Matching content
- `inputs/25_pdf_mutation_a.pdf` + `inputs/25_pdf_mutation_b.pdf` - Different PDFs

## Artifacts

Test artifacts are written to `artifacts/`:

- `AUDIT_SUMMARY_V02.json` - Complete audit results
- Individual test outputs

## Non-Goals

This audit does NOT test:
- Network connectivity (offline only)
- UI functionality
- Performance benchmarks
