/**
 * DDRP v0.1 Checkpoint Verification
 */
import { createOperatorDetector } from './operators_v0_1';
import { instantiateObligations } from './obligations_v0_1';

const TEST_INPUT = `
Users must provide valid identification within 30 days.
"Service Provider" means the company providing services under this agreement.
Payment is required because compliance depends on timely funding.
For customers in the EU, all data must be stored locally.
`;

// Determinism test: run 10 times, compare results
const detector = createOperatorDetector();
const results: string[] = [];

for (let i = 0; i < 10; i++) {
  const result = detector.detect(TEST_INPUT);
  results.push(JSON.stringify(result));
}

const allIdentical = results.every(r => r === results[0]);
console.log('=== DDRP v0.1 CHECKPOINT VERIFICATION ===\n');
console.log('1. DETERMINISM TEST');
console.log('   Runs: 10');
console.log('   All identical:', allIdentical ? 'YES ✓' : 'NO ✗');

// Operator detection summary
const detection = detector.detect(TEST_INPUT);
console.log('\n2. OPERATOR DETECTION');
console.log('   Version:', detection.version);
console.log('   Pattern count:', detection.pattern_count);
console.log('   Matches found:', detection.matches.length);
console.log('   Input hash:', detection.input_hash);

// Breakdown by type
const byType: Record<string, number> = {};
for (const m of detection.matches) {
  byType[m.op_type] = (byType[m.op_type] || 0) + 1;
}
console.log('   By type:', JSON.stringify(byType));

// Obligation instantiation
const obligations = instantiateObligations(detection.matches);
console.log('\n3. OBLIGATION INSTANTIATION');
console.log('   Version:', obligations.version);
console.log('   Obligations created:', obligations.obligation_count);
console.log('   Status summary:', JSON.stringify(obligations.status_summary));

// List obligations
console.log('\n4. OBLIGATIONS DETAIL');
for (const obl of obligations.obligations) {
  const present = obl.present_fields.join(',') || 'none';
  const missing = obl.missing_fields.join(',') || 'none';
  console.log('   ' + obl.obl_id + ': ' + obl.status + ' (required: ' + obl.required_fields.join(',') + ' | present: ' + present + ' | missing: ' + missing + ')');
}

console.log('\n=== CHECKPOINT COMPLETE ===');
