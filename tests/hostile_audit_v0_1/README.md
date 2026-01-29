# DDRP v0.1 Hostile Audit

This directory contains the reproducible hostile audit test suite for DDRP v0.1.

## Purpose

Falsification attempt, not validation. The system is tested for hidden interpretation, nondeterminism, or influence.

## Contents

- `inputs/` — Test input files (one per test case)
- `expected/` — Expected JSON outputs for key tests
- `run_audit.ts` — Audit runner script
- `RUN.md` — Execution instructions and pass criteria

## Running the Audit

From repository root:

```bash
npm run hostile-audit
```

## Pass Criteria

See [RUN.md](./RUN.md) for detailed pass/fail conditions per test.

## Outputs

Results are written to `artifacts/hostile_audit_v0_1/` including:

- Detection outputs per test
- Obligation outputs per test
- `AUDIT_SUMMARY.json` with pass/fail status
