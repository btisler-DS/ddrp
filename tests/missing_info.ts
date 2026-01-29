import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT = 'Identification must be submitted.';

const detector = createOperatorDetector();
const detection = detector.detect(INPUT);
const obligations = instantiateObligations(detection.matches);

console.log('=== MISSING INFORMATION DISCIPLINE TEST ===');
console.log('');
console.log('Input:', JSON.stringify(INPUT));
console.log('');

console.log('--- Detection ---');
console.log(JSON.stringify(detection, null, 2));
console.log('');

console.log('--- Obligations ---');
console.log(JSON.stringify(obligations, null, 2));
console.log('');

// Find REQ obligations
const reqObligations = obligations.obligations.filter(o => o.obl_type === 'REQ_APPLICABILITY');

console.log('REQ operators found:', detection.matches.filter(m => m.op_type === 'REQ').length);
console.log('REQ obligations created:', reqObligations.length);
console.log('');

if (reqObligations.length === 0) {
  console.log('FAIL: Expected one obligation');
  process.exit(1);
}

const obl = reqObligations[0];
console.log('Obligation status:', obl.status);
console.log('Required fields:', obl.required_fields.join(', '));
console.log('Present fields:', obl.present_fields.join(', ') || '(none)');
console.log('Missing fields:', obl.missing_fields.join(', ') || '(none)');
console.log('');

if (obl.status === 'SATISFIED') {
  console.log('FAIL: Status should be OPEN (missing who)');
  process.exit(1);
}

if (obl.missing_fields.length === 0) {
  console.log('FAIL: Missing fields not reported');
  process.exit(1);
}

console.log('PASS: Missing fields correctly identified, status OPEN');
