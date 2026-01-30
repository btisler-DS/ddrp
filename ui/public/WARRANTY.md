# Warranty & Non-Reliance

## Disclaimer

DDRP (Deterministic Document Review Protocol) is provided **"as is"** without warranty of any kind, express or implied.

## No Warranty

The authors and contributors make no representations or warranties regarding:

- **Correctness** — DDRP outputs are structural artifacts, not verified facts
- **Fitness** — No guarantee of suitability for any particular purpose
- **Completeness** — The operator taxonomy and obligation model are intentionally minimal
- **Accuracy** — Pattern matching is lexical, not semantic

## No Compliance Claims

DDRP does **not** provide:

- Legal advice
- Compliance certification
- Regulatory approval
- Risk assessment
- Safety assurance

DDRP outputs do not constitute evidence of compliance with any standard, regulation, or law.

## No Risk Mitigation

Using DDRP does **not**:

- Reduce liability
- Transfer responsibility
- Substitute for professional review
- Validate document correctness

## User Responsibility

Users are **fully responsible** for:

- Interpreting DDRP outputs
- Making decisions based on those outputs
- Verifying results through independent means
- Determining applicability to their use case

## Descriptive Artifacts Only

DDRP outputs are **descriptive artifacts** that record structural observations. They are not:

- Decisions
- Recommendations
- Judgments
- Conclusions

## Limitation of Liability

In no event shall the authors or contributors be liable for any claim, damages, or other liability arising from the use of DDRP.

---

## PDF Processing Limitations (v0.2)

DDRP PDF text extraction:

- **Extracts text only** — Images, forms, annotations, and embedded files are not processed
- **Cannot process encrypted PDFs** — Password-protected PDFs are rejected
- **Does not support OCR** — Scanned documents are detected and rejected
- **Text order may differ** — Complex layouts (multi-column, tables) may extract in unexpected order
- **Formatting is lost** — Bold, italic, fonts, and colors are not preserved
- **Canonicalization is applied** — Whitespace is normalized, page numbers may be removed

PDF extraction may not perfectly reproduce document formatting or visual layout. DDRP analyzes the extracted text, not the visual appearance.

### Chain of Custody

For PDF inputs, DDRP provides:

- `pdf_hash`: SHA-256 hash of original PDF bytes
- `canonical_hash`: SHA-256 hash of canonicalized extracted text
- `applied_rules`: List of canonicalization rules applied

These hashes are for traceability only, not cryptographic sealing.

---

## Transaction Records (v0.2)

DDRP can optionally generate transaction records that:

- Document execution continuity
- Cryptographically chain inputs, outputs, and timestamps
- Provide tamper-evident sequencing

Transaction records **do not**:

- Constitute notarization
- Provide legal certification
- Act as a trusted timestamp authority
- Create compliance evidence

Transaction records provide **execution traceability only** and do not assert compliance, correctness, or legal validity.

---

**By using DDRP, you acknowledge and accept these terms.**
