import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT = 'Users must register within 30 days.';
const RUNS = 50;

const detector = createOperatorDetector();
const detectionResults: string[] = [];
const obligationResults: string[] = [];

for (let i = 0; i < RUNS; i++) {
  const detection = detector.detect(INPUT);
  const obligations = instantiateObligations(detection.matches);
  detectionResults.push(JSON.stringify(detection));
  obligationResults.push(JSON.stringify(obligations));
}

const detectionIdentical = detectionResults.every(r => r === detectionResults[0]);
const obligationIdentical = obligationResults.every(r => r === obligationResults[0]);

console.log('=== DETERMINISM STRESS TEST (50 RUNS) ===');
console.log('Input:', JSON.stringify(INPUT));
console.log('Runs:', RUNS);
console.log('');
console.log('Detection outputs identical:', detectionIdentical ? 'YES' : 'NO');
console.log('Obligation outputs identical:', obligationIdentical ? 'YES' : 'NO');
console.log('');

if (!detectionIdentical || !obligationIdentical) {
  console.log('FAIL: Non-determinism detected');
  process.exit(1);
}

// Output first result for inspection
const firstDetection = JSON.parse(detectionResults[0]);
console.log('Input hash:', firstDetection.input_hash);
console.log('Operator count:', firstDetection.matches.length);
console.log('Operator order:', firstDetection.matches.map((m: any) => m.pattern_id).join(', '));
console.log('');
console.log('PASS');
