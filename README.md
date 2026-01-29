# DDRP — Deterministic Document Review Protocol

**Version:** 0.1.0
**Status:** Released

---

## What DDRP Is

DDRP is a deterministic protocol for structurally reviewing documents. It detects linguistic operators that create obligations and evaluates whether those obligations are structurally resolved.

DDRP produces inspectable, reproducible artifacts. It makes no claims of truth, compliance, or correctness.

## What DDRP Is Not

- Not an AI/ML system
- Not a compliance tool
- Not a recommendation engine
- Not a semantic analyzer

Human judgment is always required.

## Quick Start

```bash
git clone https://github.com/btisler-DS/ddrp.git
cd ddrp
npm install
npm run verify
npm run hostile-audit
```

## Documentation

- [DDRP_v0_1_SPEC.md](./DDRP_v0_1_SPEC.md) — Full protocol specification
- [tests/hostile_audit_v0_1/RUN.md](./tests/hostile_audit_v0_1/RUN.md) — Audit protocol

## Determinism Guarantee

Identical input + identical ruleset = identical output (byte-for-byte).

Run `npm run hostile-audit` to verify.

## License

Released under [CC BY-NC 4.0](./LICENSE).

Non-commercial use only. See LICENSE for full terms.
