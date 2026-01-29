# DDRP v0.1 Hostile Audit

## Purpose

Falsification attempt, not validation.
Assumption: The system is suspected of hidden interpretation, nondeterminism, or influence.

## Prerequisites

```
Node.js v18+
npm
```

## Commands

### Run Full Audit

```bash
npm run hostile-audit
```

### Manual Execution

```bash
npx ts-node tests/hostile_audit_v0_1/run_audit.ts
```

## Pass Criteria

| Test | ID | Pass Condition |
|------|----|----------------|
| Environment Integrity | 01 | Operators detected from valid input |
| Determinism | 02 | 50 runs produce byte-identical output |
| Semantic Equivalence Rejection | 03 | Semantically similar inputs produce different outputs |
| Rhetoric Immunity | 04 | No REQ operators or obligations from rhetorical language |
| Missing Information Discipline | 05 | Status OPEN, missing fields explicitly listed |
| Contradiction Handling | 06 | Both REQ operators detected (one negated, one not); v0.1 does not resolve contradictions |
| Scope Non-Inference | 07 | SCOPE detected, no jurisdiction expansion |
| Anchor Neutrality | 08 | ANCHOR detected, no external content imported |
| Garbage Input | 09 | Zero operators, zero obligations |
| Rule Mutability | 10 | Removing pattern removes detection |

## Test 6 Expected Behavior (v0.1)

Contradiction detection is deferred; conflicting requirements may remain OPEN in v0.1.

Expected output:
- 2 REQ operators (1 negated, 1 non-negated)
- 2 obligations with status OPEN
- No CONTRADICTED status (reserved for future versions)

## Outputs

All outputs written to: `artifacts/hostile_audit_v0_1/`

| File | Contents |
|------|----------|
| `AUDIT_SUMMARY.json` | Pass/fail summary with timestamp |
| `*_detection.json` | Raw operator detection output |
| `*_obligations.json` | Raw obligation instantiation output |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |

## Reproducibility Claim

Running this audit on the same codebase with the same Node.js version MUST produce:
- Identical detection outputs
- Identical obligation outputs
- Identical pass/fail results

Any deviation indicates either:
- Environment difference
- Codebase modification
- Non-determinism (which would be a critical failure)
