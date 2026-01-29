import { OperatorDetector, PATTERN_REGISTRY_V0_1, PatternDefinition } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT = 'Identification must be submitted.';

// First: run with full pattern set
const fullDetector = new OperatorDetector();
const fullResult = fullDetector.detect(INPUT);

console.log('=== RULE MUTABILITY TRANSPARENCY TEST ===');
console.log('');
console.log('Input:', JSON.stringify(INPUT));
console.log('');

console.log('--- Full Pattern Set ---');
console.log('REQ patterns:', PATTERN_REGISTRY_V0_1.filter(p => p.op_type === 'REQ').length);
console.log('REQ operators found:', fullResult.matches.filter(m => m.op_type === 'REQ').length);

const fullObligations = instantiateObligations(fullResult.matches);
console.log('REQ obligations:', fullObligations.obligations.filter(o => o.obl_type === 'REQ_APPLICABILITY').length);
console.log('');

// Second: create modified pattern set WITHOUT REQ_MUST_001
const modifiedPatterns = PATTERN_REGISTRY_V0_1.filter(p => p.id !== 'REQ_MUST_001');

console.log('--- Modified Pattern Set (REQ_MUST_001 removed) ---');
console.log('REQ patterns:', modifiedPatterns.filter(p => p.op_type === 'REQ').length);

const modifiedDetector = new OperatorDetector({
  version: '0.1.0-modified',
  patterns: modifiedPatterns as PatternDefinition[],
});

const modifiedResult = modifiedDetector.detect(INPUT);
console.log('REQ operators found:', modifiedResult.matches.filter(m => m.op_type === 'REQ').length);

const modifiedObligations = instantiateObligations(modifiedResult.matches);
console.log('REQ obligations:', modifiedObligations.obligations.filter(o => o.obl_type === 'REQ_APPLICABILITY').length);
console.log('');

// Verify behavior changed
const fullReqCount = fullResult.matches.filter(m => m.op_type === 'REQ').length;
const modifiedReqCount = modifiedResult.matches.filter(m => m.op_type === 'REQ').length;

console.log('Full REQ count:', fullReqCount);
console.log('Modified REQ count:', modifiedReqCount);
console.log('');

if (fullReqCount === 0) {
  console.log('FAIL: No REQ detected with full pattern set');
  process.exit(1);
}

if (modifiedReqCount !== 0) {
  console.log('FAIL: REQ still detected after removing REQ_MUST_001');
  process.exit(1);
}

console.log('PASS: Authority lives in rules, not system behavior');
