import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT = 'For users in the EU, all data must be stored locally.';

const detector = createOperatorDetector();
const detection = detector.detect(INPUT);
const obligations = instantiateObligations(detection.matches);

console.log('=== SCOPE NON-INFERENCE TEST ===');
console.log('');
console.log('Input:', JSON.stringify(INPUT));
console.log('');

console.log('--- Detection ---');
console.log(JSON.stringify(detection, null, 2));
console.log('');

console.log('--- Obligations ---');
console.log(JSON.stringify(obligations, null, 2));
console.log('');

const scopeOps = detection.matches.filter(m => m.op_type === 'SCOPE');
const univOps = detection.matches.filter(m => m.op_type === 'UNIV');
const reqOps = detection.matches.filter(m => m.op_type === 'REQ');

console.log('SCOPE operators:', scopeOps.length);
console.log('UNIV operators:', univOps.length);
console.log('REQ operators:', reqOps.length);
console.log('');

// Check no jurisdiction validation occurred
// (DDRP should detect "EU" but not validate or expand it)
const euMatches = detection.matches.filter(m =>
  m.matched_text.includes('EU') || m.captures['scope_phrase']?.includes('EU')
);
console.log('EU-containing matches:', euMatches.length);

// Verify no additional EU-related content was inferred
const allMatchedText = detection.matches.map(m => m.matched_text).join(' ');
const containsExpandedEU = /European\s+Union|Europe|GDPR/i.test(allMatchedText);

console.log('Contains expanded EU references:', containsExpandedEU ? 'YES' : 'NO');
console.log('');

if (containsExpandedEU) {
  console.log('FAIL: Scope was interpreted/expanded beyond detection');
  process.exit(1);
}

console.log('PASS: Scope detected but not interpreted or expanded');
