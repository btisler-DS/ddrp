import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT_A = 'Users must submit identification within 30 days.';
const INPUT_B = 'Identification must be provided by users no later than thirty days.';

const detector = createOperatorDetector();

const detectionA = detector.detect(INPUT_A);
const detectionB = detector.detect(INPUT_B);

const obligationsA = instantiateObligations(detectionA.matches);
const obligationsB = instantiateObligations(detectionB.matches);

console.log('=== SEMANTIC EQUIVALENCE REJECTION TEST ===');
console.log('');
console.log('Input A:', JSON.stringify(INPUT_A));
console.log('Input B:', JSON.stringify(INPUT_B));
console.log('');

console.log('--- Detection A ---');
console.log(JSON.stringify(detectionA, null, 2));
console.log('');

console.log('--- Detection B ---');
console.log(JSON.stringify(detectionB, null, 2));
console.log('');

const detectionsIdentical = JSON.stringify(detectionA) === JSON.stringify(detectionB);
const obligationsIdentical = JSON.stringify(obligationsA) === JSON.stringify(obligationsB);

console.log('Detections identical:', detectionsIdentical ? 'YES' : 'NO');
console.log('Obligations identical:', obligationsIdentical ? 'YES' : 'NO');
console.log('');

if (detectionsIdentical || obligationsIdentical) {
  console.log('FAIL: Semantic equivalence detected (outputs should differ)');
  process.exit(1);
}

console.log('PASS: Outputs differ as expected (no semantic normalization)');
