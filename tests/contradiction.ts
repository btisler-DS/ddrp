import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT = `Users must submit identification.
Users must not submit identification.`;

const detector = createOperatorDetector();
const detection = detector.detect(INPUT);
const obligations = instantiateObligations(detection.matches);

console.log('=== CONTRADICTION HANDLING TEST ===');
console.log('');
console.log('Input:', JSON.stringify(INPUT));
console.log('');

console.log('--- Detection ---');
console.log(JSON.stringify(detection, null, 2));
console.log('');

console.log('--- Obligations ---');
console.log(JSON.stringify(obligations, null, 2));
console.log('');

const reqOperators = detection.matches.filter(m => m.op_type === 'REQ');
console.log('REQ operators found:', reqOperators.length);
console.log('Negated operators:', reqOperators.filter(m => m.metadata.negated).length);
console.log('Non-negated operators:', reqOperators.filter(m => !m.metadata.negated).length);
console.log('');

// Check for CONTRADICTED status
const contradicted = obligations.obligations.filter(o => o.status === 'CONTRADICTED');
console.log('CONTRADICTED obligations:', contradicted.length);
console.log('');

// NOTE: v0.1 does NOT implement contradiction detection
// This is documented as reserved for future versions
// Expected behavior: two separate obligations, both OPEN (missing who/what)

console.log('NOTE: v0.1 does not implement cross-obligation contradiction detection');
console.log('Expected: Two separate obligations created');
console.log('Actual obligations:', obligations.obligation_count);
console.log('');

if (reqOperators.length !== 2) {
  console.log('FAIL: Expected 2 REQ operators');
  process.exit(1);
}

console.log('PASS: Both operators detected, contradiction detection deferred per spec');
