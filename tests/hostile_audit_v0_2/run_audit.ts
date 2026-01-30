/**
 * DDRP v0.2 Hostile Audit Runner
 *
 * Tests PDF ingestion, canonicalization, and backward compatibility.
 * All tests must be deterministic and run offline.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createOperatorDetector } from '../../src/operators_v0_1';
import { instantiateObligations } from '../../src/obligations_v0_1';
import { canonicalize, sha256Hash, CANON_VERSION } from '../../src/pdf_canonicalizer_v0_2';
import { ingestPDF, PDF_INGEST_VERSION } from '../../src/pdf_ingest_v0_2';

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
}

// ============================================================================
// Paths
// ============================================================================

const INPUTS_DIR = path.join(__dirname, 'inputs');
const ARTIFACTS_DIR = path.join(__dirname, 'artifacts');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// ============================================================================
// Utilities
// ============================================================================

function readInput(filename: string): string {
  return fs.readFileSync(path.join(INPUTS_DIR, filename), 'utf-8');
}

function readPDFInput(filename: string): ArrayBuffer {
  const buffer = fs.readFileSync(path.join(INPUTS_DIR, filename));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function writeArtifact(filename: string, data: unknown): void {
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, filename),
    JSON.stringify(data, null, 2)
  );
}

function pdfExists(filename: string): boolean {
  return fs.existsSync(path.join(INPUTS_DIR, filename));
}

// ============================================================================
// v0.1 Regression Tests (import and re-run)
// ============================================================================

const detector = createOperatorDetector();

function test01_v01_regression_environment(): TestResult {
  const input = 'Users must provide valid identification within 30 days. Service Provider shall maintain records. Payment is required annually. For customers in the EU, all data must be stored locally.';
  const detection = detector.detect(input);

  writeArtifact('v02_01_environment_detection.json', detection);

  const hasOperators = detection.matches.length > 0;
  const hasReq = detection.matches.some(m => m.op_type === 'REQ');
  const hasScope = detection.matches.some(m => m.op_type === 'SCOPE');

  return {
    test: '01_v01_regression_environment',
    status: hasOperators && hasReq && hasScope ? 'PASS' : 'FAIL',
    details: `Detected ${detection.matches.length} operators (REQ: ${hasReq}, SCOPE: ${hasScope})`,
  };
}

function test02_v01_regression_determinism(): TestResult {
  const input = 'Users must register within 30 days.';
  const outputs: string[] = [];

  for (let i = 0; i < 50; i++) {
    const detection = detector.detect(input);
    outputs.push(JSON.stringify(detection));
  }

  const allIdentical = outputs.every(o => o === outputs[0]);

  return {
    test: '02_v01_regression_determinism',
    status: allIdentical ? 'PASS' : 'FAIL',
    details: `50 runs, all identical: ${allIdentical}`,
  };
}

// ============================================================================
// v0.2 Canonicalization Tests
// ============================================================================

function test11_canon_determinism(): TestResult {
  const input = 'Users   must\r\n  register   within 30   days.\n\n\n\nPayment is required.';
  const outputs: string[] = [];

  for (let i = 0; i < 50; i++) {
    const result = canonicalize(input);
    outputs.push(JSON.stringify(result));
  }

  const allIdentical = outputs.every(o => o === outputs[0]);
  const result = JSON.parse(outputs[0]);

  writeArtifact('v02_11_canon_determinism.json', result);

  return {
    test: '11_canon_determinism',
    status: allIdentical ? 'PASS' : 'FAIL',
    details: `50 runs, all identical: ${allIdentical}, hash: ${result.canonical_hash}`,
  };
}

function test12_canon_rules_applied(): TestResult {
  const input = 'Test\r\n  text   with   spaces\n\n\n\nand breaks.';
  const result = canonicalize(input);

  writeArtifact('v02_12_canon_rules.json', result);

  const hasAllRules = result.applied_rules.length === result.rule_count;
  const rulesInOrder = result.applied_rules[0] === 'CANON_NORMALIZE_NEWLINES_001';

  return {
    test: '12_canon_rules_applied',
    status: hasAllRules && rulesInOrder ? 'PASS' : 'FAIL',
    details: `Rules applied: ${result.applied_rules.length}/${result.rule_count}, in order: ${rulesInOrder}`,
  };
}

function test13_canon_whitespace_collapse(): TestResult {
  const input = 'must    submit     within   30   days';
  const result = canonicalize(input);

  const noDoubleSpaces = !result.canonical_text.includes('  ');
  const preserved = result.canonical_text.includes('must submit within 30 days');

  return {
    test: '13_canon_whitespace_collapse',
    status: noDoubleSpaces && preserved ? 'PASS' : 'FAIL',
    details: `No double spaces: ${noDoubleSpaces}, content preserved: ${preserved}`,
  };
}

function test14_canon_paragraph_preservation(): TestResult {
  const input = 'Paragraph one.\n\n\n\n\nParagraph two.';
  const result = canonicalize(input);

  const hasParagraphBreak = result.canonical_text.includes('\n\n');
  const noExcessBreaks = !result.canonical_text.includes('\n\n\n');

  return {
    test: '14_canon_paragraph_preservation',
    status: hasParagraphBreak && noExcessBreaks ? 'PASS' : 'FAIL',
    details: `Paragraph break preserved: ${hasParagraphBreak}, excess collapsed: ${noExcessBreaks}`,
  };
}

function test15_canon_sha256_format(): TestResult {
  const input = 'Test input for hash verification.';
  const result = canonicalize(input);

  // SHA-256 truncated to 16 hex chars
  const validHashFormat = /^[0-9a-f]{16}$/.test(result.canonical_hash);

  return {
    test: '15_canon_sha256_format',
    status: validHashFormat ? 'PASS' : 'FAIL',
    details: `Hash format valid (16 hex chars): ${validHashFormat}, hash: ${result.canonical_hash}`,
  };
}

// ============================================================================
// v0.2 PDF Tests (require actual PDF files)
// ============================================================================

async function test21_pdf_determinism(): Promise<TestResult> {
  if (!pdfExists('21_pdf_determinism.pdf')) {
    return {
      test: '21_pdf_determinism',
      status: 'SKIP',
      details: 'PDF test file not found: 21_pdf_determinism.pdf',
    };
  }

  const pdfBytes = readPDFInput('21_pdf_determinism.pdf');
  const outputs: string[] = [];

  for (let i = 0; i < 10; i++) {
    const result = await ingestPDF(pdfBytes);
    if (!result.success) {
      return {
        test: '21_pdf_determinism',
        status: 'FAIL',
        details: `PDF ingestion failed: ${result.error?.message}`,
      };
    }
    const canon = canonicalize(result.raw_text);
    outputs.push(JSON.stringify({ pdf_hash: result.pdf_hash, canonical_hash: canon.canonical_hash }));
  }

  const allIdentical = outputs.every(o => o === outputs[0]);

  return {
    test: '21_pdf_determinism',
    status: allIdentical ? 'PASS' : 'FAIL',
    details: `10 runs, all identical: ${allIdentical}`,
  };
}

async function test22_pdf_encrypted_rejection(): Promise<TestResult> {
  if (!pdfExists('22_pdf_encrypted.pdf')) {
    return {
      test: '22_pdf_encrypted_rejection',
      status: 'SKIP',
      details: 'PDF test file not found: 22_pdf_encrypted.pdf',
    };
  }

  const pdfBytes = readPDFInput('22_pdf_encrypted.pdf');
  const result = await ingestPDF(pdfBytes);

  const correctRejection = !result.success && result.error?.code === 'ENCRYPTED';

  return {
    test: '22_pdf_encrypted_rejection',
    status: correctRejection ? 'PASS' : 'FAIL',
    details: `Rejected: ${!result.success}, code: ${result.error?.code}`,
  };
}

async function test23_pdf_scanned_rejection(): Promise<TestResult> {
  if (!pdfExists('23_pdf_scanned.pdf')) {
    return {
      test: '23_pdf_scanned_rejection',
      status: 'SKIP',
      details: 'PDF test file not found: 23_pdf_scanned.pdf',
    };
  }

  const pdfBytes = readPDFInput('23_pdf_scanned.pdf');
  const result = await ingestPDF(pdfBytes);

  const correctRejection = !result.success &&
    (result.error?.code === 'SCANNED_SUSPECT' || result.error?.code === 'EMPTY');

  return {
    test: '23_pdf_scanned_rejection',
    status: correctRejection ? 'PASS' : 'FAIL',
    details: `Rejected: ${!result.success}, code: ${result.error?.code}`,
  };
}

async function test24_pdf_text_parity(): Promise<TestResult> {
  if (!pdfExists('24_pdf_parity.pdf') || !fs.existsSync(path.join(INPUTS_DIR, '24_pdf_parity.txt'))) {
    return {
      test: '24_pdf_text_parity',
      status: 'SKIP',
      details: 'PDF/text parity test files not found',
    };
  }

  const pdfBytes = readPDFInput('24_pdf_parity.pdf');
  const textContent = readInput('24_pdf_parity.txt');

  const pdfResult = await ingestPDF(pdfBytes);
  if (!pdfResult.success) {
    return {
      test: '24_pdf_text_parity',
      status: 'FAIL',
      details: `PDF ingestion failed: ${pdfResult.error?.message}`,
    };
  }

  const pdfCanon = canonicalize(pdfResult.raw_text);
  const textCanon = canonicalize(textContent);

  const hashMatch = pdfCanon.canonical_hash === textCanon.canonical_hash;

  return {
    test: '24_pdf_text_parity',
    status: hashMatch ? 'PASS' : 'FAIL',
    details: `Hash match: ${hashMatch}, PDF: ${pdfCanon.canonical_hash}, Text: ${textCanon.canonical_hash}`,
  };
}

async function test25_pdf_mutation(): Promise<TestResult> {
  if (!pdfExists('25_pdf_mutation_a.pdf') || !pdfExists('25_pdf_mutation_b.pdf')) {
    return {
      test: '25_pdf_mutation',
      status: 'SKIP',
      details: 'PDF mutation test files not found',
    };
  }

  const pdfA = readPDFInput('25_pdf_mutation_a.pdf');
  const pdfB = readPDFInput('25_pdf_mutation_b.pdf');

  const resultA = await ingestPDF(pdfA);
  const resultB = await ingestPDF(pdfB);

  if (!resultA.success || !resultB.success) {
    return {
      test: '25_pdf_mutation',
      status: 'FAIL',
      details: 'PDF ingestion failed for one or both files',
    };
  }

  const differentPdfHash = resultA.pdf_hash !== resultB.pdf_hash;
  const canonA = canonicalize(resultA.raw_text);
  const canonB = canonicalize(resultB.raw_text);
  const differentCanonHash = canonA.canonical_hash !== canonB.canonical_hash;

  return {
    test: '25_pdf_mutation',
    status: differentPdfHash ? 'PASS' : 'FAIL',
    details: `Different PDF hash: ${differentPdfHash}, different canon hash: ${differentCanonHash}`,
  };
}

// ============================================================================
// Main Runner
// ============================================================================

async function runAudit(): Promise<void> {
  console.log('=== DDRP v0.2 HOSTILE AUDIT ===\n');
  console.log(`Canonicalizer Version: ${CANON_VERSION}`);
  console.log(`PDF Ingest Version: ${PDF_INGEST_VERSION}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results: TestResult[] = [];

  // v0.1 Regression Tests
  console.log('--- v0.1 Regression Tests ---');
  results.push(test01_v01_regression_environment());
  results.push(test02_v01_regression_determinism());

  // v0.2 Canonicalization Tests
  console.log('\n--- v0.2 Canonicalization Tests ---');
  results.push(test11_canon_determinism());
  results.push(test12_canon_rules_applied());
  results.push(test13_canon_whitespace_collapse());
  results.push(test14_canon_paragraph_preservation());
  results.push(test15_canon_sha256_format());

  // v0.2 PDF Tests
  console.log('\n--- v0.2 PDF Tests ---');
  results.push(await test21_pdf_determinism());
  results.push(await test22_pdf_encrypted_rejection());
  results.push(await test23_pdf_scanned_rejection());
  results.push(await test24_pdf_text_parity());
  results.push(await test25_pdf_mutation());

  // Print results
  console.log('\n--- Results ---');
  for (const result of results) {
    const icon = result.status === 'PASS' ? 'PASS' : result.status === 'SKIP' ? 'SKIP' : 'FAIL';
    console.log(`[${icon}] ${result.test}`);
    console.log(`       ${result.details}`);
  }

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  const summary = {
    timestamp: new Date().toISOString(),
    canonicalizer_version: CANON_VERSION,
    pdf_ingest_version: PDF_INGEST_VERSION,
    total: results.length,
    passed,
    failed,
    skipped,
    results,
  };

  writeArtifact('AUDIT_SUMMARY_V02.json', summary);

  console.log('\n=== SUMMARY ===');
  console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);

  if (failed > 0) {
    console.log('\nAUDIT FAILED: One or more tests failed');
    process.exit(1);
  } else {
    console.log('\nAUDIT PASSED: All tests passed (skipped tests require PDF files)');
    process.exit(0);
  }
}

runAudit().catch(err => {
  console.error('Audit runner error:', err);
  process.exit(1);
});
