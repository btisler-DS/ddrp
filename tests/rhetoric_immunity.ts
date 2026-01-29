import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT = 'It is extremely important, critical, and essential that all stakeholders understand the vital necessity of compliance.';

const detector = createOperatorDetector();
const detection = detector.detect(INPUT);
const obligations = instantiateObligations(detection.matches);

console.log('=== RHETORIC IMMUNITY TEST ===');
console.log('');
console.log('Input:', JSON.stringify(INPUT));
console.log('');

console.log('--- Detection ---');
console.log(JSON.stringify(detection, null, 2));
console.log('');

console.log('--- Obligations ---');
console.log(JSON.stringify(obligations, null, 2));
console.log('');

// Check for REQ operators (should be none)
const reqOperators = detection.matches.filter(m => m.op_type === 'REQ');
const reqObligations = obligations.obligations.filter(o => o.obl_type === 'REQ_APPLICABILITY');

console.log('REQ operators found:', reqOperators.length);
console.log('REQ obligations created:', reqObligations.length);
console.log('');

if (reqOperators.length > 0 || reqObligations.length > 0) {
  console.log('FAIL: Requirement inferred from rhetoric');
  process.exit(1);
}

console.log('PASS: No requirements inferred from rhetorical language');
