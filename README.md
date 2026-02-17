# DDRP — Deterministic Document Review Protocol

**Version:** 0.2.0
**Status:** Released
**DOI:** [10.5281/zenodo.18427220](https://doi.org/10.5281/zenodo.18427220)
**Web:** [quantuminquiry.org/DDRP](https://quantuminquiry.org/DDRP/)

---

## About This Repository

**This is a reference implementation, not a product.**

If you're looking for a turnkey document review solution, this isn't it. DDRP is architectural infrastructure—a working example of how to build deterministic, auditable text analysis without semantic inference. Think of it like publishing a cryptographic library: it doesn't solve your whole problem, but if you need this specific capability (reproducible detection of obligation-creating language with full audit trails), here's a rigorously tested pattern you can adapt.


## The Problem

When documents contain obligation-creating language—requirements, definitions, commitments, specifications—how do you verify those obligations were actually addressed?

**In high-stakes contexts, this matters:**
- Regulatory submissions that must demonstrate compliance
- Technical specifications where missing requirements cause failures  
- Legal documents where unresolved obligations create liability
- AI-generated content where you need to audit what was promised

**Current approaches fail at scale:**
- **Manual review** doesn't scale and isn't consistent
- **Keyword search** misses context and relationships
- **AI/ML systems** work but can't explain decisions or guarantee reproducibility
- **Semantic analysis** is subjective and not auditable

When you need to defend your analysis in court, cite it in policy, or build institutional processes around it, "the AI said so" isn't sufficient.

## DDRP's Approach

DDRP detects obligation-creating language using **49 deterministic lexical patterns** and tracks whether those obligations get structurally resolved within the document.

**Key design principles:**
- **No AI/ML** — Pure pattern matching, no probabilistic components
- **No interpretation** — Detects linguistic structures, doesn't assess meaning
- **Fully deterministic** — Identical input always produces identical output
- **Auditable** — Every decision traceable to specific patterns and rules

**What DDRP detects:**
- **REQ operators**: "must", "shall", "required to"
- **DEF operators**: "defined as", "means", "refers to"  
- **CAUSE operators**: "because", "due to", "results in"
- **SCOPE operators**: "applies to", "limited to", "excludes"
- **UNIV operators**: "all", "every", "none"
- **ANCHOR operators**: "see section", "defined above", "per attachment"

**What DDRP tracks:**
- Whether requirements have corresponding definitions
- Whether scope is specified for obligations
- Whether external references are anchored
- **Obligation status**: SATISFIED (structurally complete) or OPEN (missing components)

## Proof It Works

**Determinism guarantee:** Identical input + identical ruleset = identical output (byte-for-byte)

**Test it yourself:**
```bash
# Clone and install
git clone https://github.com/btisler-DS/ddrp.git
cd ddrp && npm install && npm run ui:install

# Run hostile audit (26 tests designed to break determinism)
npm run hostile-audit

# Start browser UI
npm run ui
```

**The hostile audit includes:**
- 50 identical runs must produce identical results
- Semantically equivalent text must produce different outputs (proving it's lexical, not semantic)
- Pattern changes must predictably affect detection
- Edge cases designed to expose non-deterministic behavior

If all tests pass, DDRP works as advertised. If not, it's broken.

## What This Is and Isn't

**This is architectural infrastructure**, not a turnkey solution. Think of it like publishing a cryptographic library—it demonstrates that deterministic, auditable document structure extraction is achievable and provides a working reference implementation.

**What DDRP does:**
- Detects obligation-creating linguistic patterns
- Tracks structural completeness 
- Generates reproducible, auditable results
- Provides cryptographic traceability

**What DDRP does NOT do:**
- Interpret meaning or assess correctness
- Provide legal opinions or compliance determinations  
- Make recommendations or risk assessments
- Use AI/ML or subjective weighting

**Who this is for:** 
- Regulatory agencies needing reproducible document analysis
- Compliance departments that must defend their review processes
- Research teams requiring auditable text analysis
- Anyone who needs "because the deterministic pattern matched" instead of "because the AI said so"

## Quick Start

### Browser UI
```bash
npm run ui          # Start at http://localhost:3000
```

### Command Line
```bash
npm run verify              # Basic verification
npm run hostile-audit       # Full test suite  
npm run typecheck          # TypeScript validation
```

### Example Output
```json
{
  "protocol": {
    "name": "DDRP",
    "version": "0.2.0",
    "doi": "10.5281/zenodo.18427220"
  },
  "detection": {
    "REQ": [
      {
        "pattern": "must",
        "text": "Users must provide valid credentials",
        "line": 15,
        "position": 42
      }
    ]
  },
  "obligations": [
    {
      "requirement": "Users must provide valid credentials",
      "status": "OPEN",
      "missing": ["definition of valid credentials"]
    }
  ]
}
```

## Project Structure

```
ddrp/
├── src/                    # Core TypeScript modules  
│   ├── operators_v0_1.ts   # 49 detection patterns
│   ├── obligations_v0_1.ts # Obligation tracking
│   └── ...                 # PDF, hashing, transaction logs
├── tests/                  # Hostile audit (26 tests)
├── ui/                     # Browser interface
└── DDRP_v0_2_SPEC.md      # Full specification
```

## Installation

### Prerequisites
- Node.js v18+
- npm (included with Node.js)

### Setup
```bash
git clone https://github.com/btisler-DS/ddrp.git
cd ddrp
npm install
npm run ui:install
```

## Evaluation Questions

Don't ask: "Can DDRP review my documents?"

Ask: "Do I need deterministic, falsifiable document structure extraction as a component in my system?"

If yes:
1. Run the hostile audit to verify determinism
2. Examine the 49 patterns to see if they fit your domain
3. Test with your documents to assess coverage
4. Fork and modify patterns for your use case

If no, this isn't for you—and that's fine.

## Documentation

| Document | Purpose |
|----------|---------|
| [DDRP_v0_2_SPEC.md](./DDRP_v0_2_SPEC.md) | Complete technical specification |
| [ui/public/USER_GUIDE.md](./ui/public/USER_GUIDE.md) | Browser UI walkthrough |
| [tests/hostile_audit_v0_2/RUN.md](./tests/hostile_audit_v0_2/RUN.md) | Audit methodology |

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
