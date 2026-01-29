/**
 * DDRP v0.1 Hostile Audit Runner
 *
 * Runs all hostile audit tests and writes results to artifacts/hostile_audit_v0_1/
 * Exit code 0 = all tests pass
 * Exit code 1 = one or more tests fail
 */

import * as fs from 'fs';
import * as path from 'path';
import { createOperatorDetector, OperatorDetector, PATTERN_REGISTRY_V0_1, PatternDefinition } from '../../src/operators_v0_1';
import { instantiateObligations } from '../../src/obligations_v0_1';

const INPUTS_DIR = path.join(__dirname, 'inputs');
const EXPECTED_DIR = path.join(__dirname, 'expected');
const ARTIFACTS_DIR = path.join(__dirname, '../../artifacts/hostile_audit_v0_1');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];
const detector = createOperatorDetector();

function readInput(filename: string): string {
  return fs.readFileSync(path.join(INPUTS_DIR, filename), 'utf-8');
}

function writeArtifact(filename: string, data: object): void {
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, filename),
    JSON.stringify(data, null, 2)
  );
}

// Test 1: Environment Integrity
function test01_environment(): TestResult {
  const input = readInput('01_environment.txt');
  const detection = detector.detect(input);
  const obligations = instantiateObligations(detection.matches);

  writeArtifact('01_environment_detection.json', detection);
  writeArtifact('01_environment_obligations.json', obligations);

  return {
    test: '01_environment',
    status: detection.matches.length > 0 ? 'PASS' : 'FAIL',
    details: `Detected ${detection.matches.length} operators`
  };
}

// Test 2: Determinism (50 runs)
function test02_determinism(): TestResult {
  const input = readInput('02_determinism.txt');
  const outputs: string[] = [];

  for (let i = 0; i < 50; i++) {
    const detection = detector.detect(input);
    outputs.push(JSON.stringify(detection));
  }

  const allIdentical = outputs.every(o => o === outputs[0]);

  writeArtifact('02_determinism_sample.json', JSON.parse(outputs[0]));
  writeArtifact('02_determinism_meta.json', {
    runs: 50,
    all_identical: allIdentical,
    input_hash: JSON.parse(outputs[0]).input_hash
  });

  return {
    test: '02_determinism',
    status: allIdentical ? 'PASS' : 'FAIL',
    details: `50 runs, all identical: ${allIdentical}`
  };
}

// Test 3: Semantic Equivalence Rejection
function test03_semantic(): TestResult {
  const inputA = readInput('03a_semantic_a.txt');
  const inputB = readInput('03b_semantic_b.txt');

  const detectionA = detector.detect(inputA);
  const detectionB = detector.detect(inputB);

  writeArtifact('03a_semantic_a_detection.json', detectionA);
  writeArtifact('03b_semantic_b_detection.json', detectionB);

  const identical = JSON.stringify(detectionA) === JSON.stringify(detectionB);

  return {
    test: '03_semantic',
    status: identical ? 'FAIL' : 'PASS',
    details: `Outputs differ: ${!identical}`
  };
}

// Test 4: Rhetoric Immunity
function test04_rhetoric(): TestResult {
  const input = readInput('04_rhetoric.txt');
  const detection = detector.detect(input);
  const obligations = instantiateObligations(detection.matches);

  writeArtifact('04_rhetoric_detection.json', detection);
  writeArtifact('04_rhetoric_obligations.json', obligations);

  const reqOps = detection.matches.filter(m => m.op_type === 'REQ');
  const reqObls = obligations.obligations.filter(o => o.obl_type === 'REQ_APPLICABILITY');

  return {
    test: '04_rhetoric',
    status: (reqOps.length === 0 && reqObls.length === 0) ? 'PASS' : 'FAIL',
    details: `REQ operators: ${reqOps.length}, REQ obligations: ${reqObls.length}`
  };
}

// Test 5: Missing Information Discipline
function test05_missing_info(): TestResult {
  const input = readInput('05_missing_info.txt');
  const detection = detector.detect(input);
  const obligations = instantiateObligations(detection.matches);

  writeArtifact('05_missing_info_detection.json', detection);
  writeArtifact('05_missing_info_obligations.json', obligations);

  const reqObl = obligations.obligations.find(o => o.obl_type === 'REQ_APPLICABILITY');
  const hasOpen = reqObl && reqObl.status === 'OPEN';
  const hasMissing = reqObl && reqObl.missing_fields.length > 0;

  return {
    test: '05_missing_info',
    status: (hasOpen && hasMissing) ? 'PASS' : 'FAIL',
    details: `Status: ${reqObl?.status}, Missing: ${reqObl?.missing_fields.join(',')}`
  };
}

// Test 6: Contradiction Handling
function test06_contradiction(): TestResult {
  const input = readInput('06_contradiction.txt');
  const detection = detector.detect(input);
  const obligations = instantiateObligations(detection.matches);

  writeArtifact('06_contradiction_detection.json', detection);
  writeArtifact('06_contradiction_obligations.json', obligations);

  const reqOps = detection.matches.filter(m => m.op_type === 'REQ');
  const negatedOps = reqOps.filter(m => m.metadata.negated);
  const nonNegatedOps = reqOps.filter(m => !m.metadata.negated);

  // v0.1 expected: 2 REQ operators detected (one negated, one not)
  // Contradiction detection deferred; both remain OPEN
  const pass = reqOps.length === 2 && negatedOps.length === 1 && nonNegatedOps.length === 1;

  return {
    test: '06_contradiction',
    status: pass ? 'PASS' : 'FAIL',
    details: `REQ ops: ${reqOps.length}, negated: ${negatedOps.length}, non-negated: ${nonNegatedOps.length}`
  };
}

// Test 7: Scope Non-Inference
function test07_scope(): TestResult {
  const input = readInput('07_scope.txt');
  const detection = detector.detect(input);
  const obligations = instantiateObligations(detection.matches);

  writeArtifact('07_scope_detection.json', detection);
  writeArtifact('07_scope_obligations.json', obligations);

  const scopeOps = detection.matches.filter(m => m.op_type === 'SCOPE');
  const univOps = detection.matches.filter(m => m.op_type === 'UNIV');
  const reqOps = detection.matches.filter(m => m.op_type === 'REQ');

  // Check no expanded EU content
  const allText = detection.matches.map(m => m.matched_text).join(' ');
  const expanded = /European\s+Union|Europe|GDPR/i.test(allText);

  return {
    test: '07_scope',
    status: (!expanded && scopeOps.length > 0) ? 'PASS' : 'FAIL',
    details: `SCOPE: ${scopeOps.length}, expanded: ${expanded}`
  };
}

// Test 8: Anchor Neutrality
function test08_anchor(): TestResult {
  const input = readInput('08_anchor.txt');
  const detection = detector.detect(input);
  const obligations = instantiateObligations(detection.matches);

  writeArtifact('08_anchor_detection.json', detection);
  writeArtifact('08_anchor_obligations.json', obligations);

  const anchorOps = detection.matches.filter(m => m.op_type === 'ANCHOR');
  const allText = detection.matches.map(m => m.matched_text).join(' ');
  const isoContent = /information\s+security|management\s+system|ISMS/i.test(allText);

  return {
    test: '08_anchor',
    status: (anchorOps.length > 0 && !isoContent) ? 'PASS' : 'FAIL',
    details: `ANCHOR ops: ${anchorOps.length}, ISO content imported: ${isoContent}`
  };
}

// Test 9: Garbage Input
function test09_garbage(): TestResult {
  const input = readInput('09_garbage.txt');
  const detection = detector.detect(input);
  const obligations = instantiateObligations(detection.matches);

  writeArtifact('09_garbage_detection.json', detection);
  writeArtifact('09_garbage_obligations.json', obligations);

  return {
    test: '09_garbage',
    status: (detection.matches.length === 0 && obligations.obligation_count === 0) ? 'PASS' : 'FAIL',
    details: `Operators: ${detection.matches.length}, Obligations: ${obligations.obligation_count}`
  };
}

// Test 10: Rule Mutability
function test10_mutability(): TestResult {
  const input = readInput('10_mutability.txt');

  // Full detector
  const fullDetection = detector.detect(input);
  const fullReq = fullDetection.matches.filter(m => m.op_type === 'REQ').length;

  // Modified detector (REQ_MUST_001 removed)
  const modifiedPatterns = PATTERN_REGISTRY_V0_1.filter(p => p.id !== 'REQ_MUST_001');
  const modifiedDetector = new OperatorDetector({
    version: '0.1.0-modified',
    patterns: modifiedPatterns as PatternDefinition[]
  });
  const modifiedDetection = modifiedDetector.detect(input);
  const modifiedReq = modifiedDetection.matches.filter(m => m.op_type === 'REQ').length;

  writeArtifact('10_mutability_full.json', fullDetection);
  writeArtifact('10_mutability_modified.json', modifiedDetection);

  return {
    test: '10_mutability',
    status: (fullReq > 0 && modifiedReq === 0) ? 'PASS' : 'FAIL',
    details: `Full REQ: ${fullReq}, Modified REQ: ${modifiedReq}`
  };
}

// Run all tests
console.log('=== DDRP v0.1 HOSTILE AUDIT ===\n');

results.push(test01_environment());
results.push(test02_determinism());
results.push(test03_semantic());
results.push(test04_rhetoric());
results.push(test05_missing_info());
results.push(test06_contradiction());
results.push(test07_scope());
results.push(test08_anchor());
results.push(test09_garbage());
results.push(test10_mutability());

// Print results
console.log('| Test | Status | Details |');
console.log('|------|--------|---------|');
for (const r of results) {
  console.log(`| ${r.test} | ${r.status} | ${r.details || ''} |`);
}
console.log('');

// Write summary
const summary = {
  timestamp: new Date().toISOString(),
  ddrp_version: '0.1.0',
  total_tests: results.length,
  passed: results.filter(r => r.status === 'PASS').length,
  failed: results.filter(r => r.status === 'FAIL').length,
  results
};

writeArtifact('AUDIT_SUMMARY.json', summary);

// Exit code
const failures = results.filter(r => r.status === 'FAIL');
if (failures.length > 0) {
  console.log(`AUDIT FAILED: ${failures.length} test(s) failed`);
  process.exit(1);
} else {
  console.log('AUDIT PASSED: All tests passed');
  process.exit(0);
}
