import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';

const INPUT = 'Data retention is required pursuant to ISO 27001.';

const detector = createOperatorDetector();
const detection = detector.detect(INPUT);
const obligations = instantiateObligations(detection.matches);

console.log('=== ANCHOR NEUTRALITY TEST ===');
console.log('');
console.log('Input:', JSON.stringify(INPUT));
console.log('');

console.log('--- Detection ---');
console.log(JSON.stringify(detection, null, 2));
console.log('');

console.log('--- Obligations ---');
console.log(JSON.stringify(obligations, null, 2));
console.log('');

const reqOps = detection.matches.filter(m => m.op_type === 'REQ');
const anchorOps = detection.matches.filter(m => m.op_type === 'ANCHOR');

console.log('REQ operators:', reqOps.length);
console.log('ANCHOR operators:', anchorOps.length);
console.log('');

// Verify ISO standard was not validated or content imported
const allMatchedText = detection.matches.map(m => m.matched_text).join(' ');
const containsISOContent = /information\s+security|management\s+system|ISMS|security\s+controls/i.test(allMatchedText);

console.log('Contains ISO 27001 content:', containsISOContent ? 'YES' : 'NO');
console.log('');

if (containsISOContent) {
  console.log('FAIL: ISO standard content was imported or assumed');
  process.exit(1);
}

if (anchorOps.length === 0) {
  console.log('FAIL: ANCHOR operator not detected');
  process.exit(1);
}

console.log('PASS: External authority detected but not validated or imported');
