# DDRP v0.2 Hostile Audit - Pass/Fail Criteria

## Execution

```bash
npm run hostile-audit-v02
```

## Pass Criteria

### v0.1 Regression Tests

| Test | Pass Condition |
|------|----------------|
| 01_v01_regression_environment | Detects operators including REQ and SCOPE |
| 02_v01_regression_determinism | 50 runs produce byte-identical JSON |

### Canonicalization Tests

| Test | Pass Condition |
|------|----------------|
| 11_canon_determinism | 50 runs produce byte-identical result |
| 12_canon_rules_applied | All rules applied in correct order |
| 13_canon_whitespace_collapse | No double spaces, content preserved |
| 14_canon_paragraph_preservation | Double newlines preserved, excess collapsed |
| 15_canon_sha256_format | Hash is 16 hex characters |

### PDF Tests (skipped if files not present)

| Test | Pass Condition |
|------|----------------|
| 21_pdf_determinism | 10 runs produce identical pdf_hash and canonical_hash |
| 22_pdf_encrypted_rejection | Returns error code ENCRYPTED |
| 23_pdf_scanned_rejection | Returns error code SCANNED_SUSPECT or EMPTY |
| 24_pdf_text_parity | PDF canonical_hash matches text canonical_hash |
| 25_pdf_mutation | Different PDF bytes produce different pdf_hash |

## Fail Conditions

- Any test returns FAIL status
- Test runner crashes
- Artifacts not written

## Skip Behavior

PDF tests are skipped (not failed) if test files are not present. This allows the audit to pass without PDF test files while indicating which tests were not run.

## Output

- Exit code 0: All tests passed (skips allowed)
- Exit code 1: One or more tests failed

## Artifacts

Audit writes to `artifacts/AUDIT_SUMMARY_V02.json`:

```json
{
  "timestamp": "...",
  "canonicalizer_version": "0.2.0",
  "pdf_ingest_version": "0.2.0",
  "total": 12,
  "passed": 7,
  "failed": 0,
  "skipped": 5,
  "results": [...]
}
```
