# Organization Expansion Guide

This document explains how independent programmers could scale DDRP to organizational use **without changing protocol semantics**.

## Core Principle

DDRP is a **protocol**, not a product. Organizational expansion must preserve:

- Determinism (identical input → identical output)
- Lexical detection (no semantic inference)
- Structural obligations (no interpretation)
- Transparent artifacts (inspectable, hashable)

Any expansion that adds scoring, inference, or semantic normalization is **not DDRP**.

---

## Batch Processing Patterns

### Command-Line Batch Processing

```bash
# Process multiple files
for file in documents/*.txt; do
  npm run review -- "$file" > "artifacts/$(basename $file .txt).json"
done
```

### Programmatic Batch Processing

```javascript
import { detectOperators, instantiateObligations } from './ddrp-core.js';
import * as fs from 'fs';

const files = fs.readdirSync('documents');

for (const file of files) {
  const text = fs.readFileSync(`documents/${file}`, 'utf-8');
  const detection = detectOperators(text);
  const obligations = instantiateObligations(detection.matches);

  fs.writeFileSync(
    `artifacts/${file}.json`,
    JSON.stringify({ detection, obligations }, null, 2)
  );
}
```

### Parallelization

DDRP is stateless and pure. Safe to parallelize:

```javascript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

// Each worker processes documents independently
// No shared state, no coordination required
```

---

## CI/CD Integration

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

for doc in docs/*.md; do
  result=$(npm run review -- "$doc" 2>/dev/null)
  open_count=$(echo "$result" | jq '.obligations.status_summary.OPEN')

  if [ "$open_count" -gt 0 ]; then
    echo "DDRP: $doc has $open_count OPEN obligations"
    # Note: This is informational only, not a gate
  fi
done
```

### GitHub Actions

```yaml
name: DDRP Review
on: [push, pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run hostile-audit
      - run: |
          for doc in docs/*.md; do
            npm run review -- "$doc" > "artifacts/$(basename $doc).json"
          done
      - uses: actions/upload-artifact@v4
        with:
          name: ddrp-artifacts
          path: artifacts/
```

### Important: CI/CD Should Not Gate

DDRP outputs are **informational**. Do not use them to:

- Block merges
- Fail builds
- Reject submissions

Humans must interpret results.

---

## Document Versioning Strategies

### Version-Locked Review

Each document version gets its own artifact:

```
documents/
  policy-v1.0.md
  policy-v1.1.md
  policy-v2.0.md

artifacts/
  policy-v1.0-ddrp-abc123.json
  policy-v1.1-ddrp-def456.json
  policy-v2.0-ddrp-ghi789.json
```

### Diff-Based Review

Compare obligations across versions:

```javascript
const v1 = JSON.parse(fs.readFileSync('policy-v1.0-ddrp.json'));
const v2 = JSON.parse(fs.readFileSync('policy-v1.1-ddrp.json'));

// Compare obligation counts, statuses, etc.
// This is structural comparison, not semantic
```

### Changelog Integration

Include DDRP hash in changelogs:

```markdown
## v1.1.0 - 2026-01-30

- Updated privacy policy section 3.2
- DDRP input hash: abc12345
- DDRP obligations: 12 SATISFIED, 3 OPEN
```

---

## Artifact Storage and Retention

### Storage Structure

```
artifacts/
  ├── by-document/
  │   └── {document-id}/
  │       └── {timestamp}-{hash}.json
  ├── by-date/
  │   └── {YYYY-MM-DD}/
  │       └── *.json
  └── index.json
```

### Retention Policy

Artifacts are **audit records**. Suggested retention:

- Active documents: retain indefinitely
- Archived documents: retain per organizational policy
- Test/development: retain 90 days minimum

### Integrity Verification

Store and verify artifact hashes:

```javascript
import * as crypto from 'crypto';

function hashArtifact(artifact) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(artifact))
    .digest('hex');
}
```

---

## Role Separation

### Author

- Creates/modifies documents
- Runs DDRP locally during drafting
- Reviews own obligations

### Reviewer

- Runs DDRP on submitted documents
- Compares artifacts across versions
- Documents structural observations

### Auditor

- Verifies artifact integrity
- Confirms determinism (re-runs produce same output)
- Maintains artifact archive

### Important: No Automated Decisions

All roles require **human judgment**. DDRP outputs are inputs to human decision-making, not decisions themselves.

---

## How NOT to Expand

### Do Not Add Scoring

```javascript
// WRONG - This is not DDRP
function riskScore(obligations) {
  return obligations.filter(o => o.status === 'OPEN').length * 10;
}
```

### Do Not Add Inference

```javascript
// WRONG - This is not DDRP
function inferMeaning(text) {
  // Any ML, NLP, or heuristic interpretation
}
```

### Do Not Add Semantic Normalization

```javascript
// WRONG - This is not DDRP
function normalizeRequirements(text) {
  return text.replace(/must/gi, 'shall');
}
```

### Do Not Add Recommendations

```javascript
// WRONG - This is not DDRP
function suggestFixes(obligations) {
  return obligations.filter(o => o.status === 'OPEN')
    .map(o => `Consider adding ${o.missing_fields.join(', ')}`);
}
```

### Do Not Add Compliance Mapping

```javascript
// WRONG - This is not DDRP
function mapToGDPR(obligations) {
  // Any mapping to external standards
}
```

---

## Valid Expansions

The following are valid extensions that preserve DDRP semantics:

1. **New operator patterns** (versioned, deterministic)
2. **Additional field types** (WWWWHW extensions)
3. **Batch processing tooling**
4. **Artifact storage systems**
5. **Visualization of raw data**
6. **Export format converters**
7. **Integration APIs** (that pass through unchanged)

---

## Summary

| Expansion Type | Valid? | Reason |
|----------------|--------|--------|
| Batch processing | Yes | Preserves determinism |
| CI/CD integration | Yes | Informational only |
| Artifact storage | Yes | Record-keeping |
| Scoring | No | Interprets results |
| Inference | No | Adds semantics |
| Normalization | No | Changes input |
| Recommendations | No | Interprets results |
| Compliance mapping | No | External interpretation |

---

**DDRP is a protocol. Keep it deterministic. Keep it lexical. Keep it honest.**
