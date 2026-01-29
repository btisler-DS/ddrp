import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT = 'asdf qwer zxcv lkjh';

const detector = createOperatorDetector();
const detection = detector.detect(INPUT);
const obligations = instantiateObligations(detection.matches);

console.log('=== GARBAGE INPUT TEST ===');
console.log('');
console.log('Input:', JSON.stringify(INPUT));
console.log('');

console.log('--- Detection ---');
console.log(JSON.stringify(detection, null, 2));
console.log('');

console.log('--- Obligations ---');
console.log(JSON.stringify(obligations, null, 2));
console.log('');

console.log('Operators found:', detection.matches.length);
console.log('Obligations created:', obligations.obligation_count);
console.log('');

if (detection.matches.length > 0) {
  console.log('FAIL: Operators detected in garbage input');
  process.exit(1);
}

if (obligations.obligation_count > 0) {
  console.log('FAIL: Obligations created from garbage input');
  process.exit(1);
}

// Verify deterministic empty output
const secondRun = detector.detect(INPUT);
if (JSON.stringify(detection) !== JSON.stringify(secondRun)) {
  console.log('FAIL: Non-deterministic output');
  process.exit(1);
}

console.log('PASS: Zero operators, zero obligations, deterministic empty output');
