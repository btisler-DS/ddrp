/**
 * Verify UI Core Parity with CLI Core
 *
 * Confirms that the browser-bundled DDRP core in ui/src/ddrp-core.js
 * produces identical outputs to the TypeScript core in src/
 */

import { createOperatorDetector } from '../src/operators_v0_1';
import { instantiateObligations } from '../src/obligations_v0_1';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

const TEST_INPUTS = [
  'Users must submit identification within 30 days.',
  'Identification must be submitted.',
  'For users in the EU, all data must be stored locally.',
  'Data retention is required pursuant to ISO 27001.',
  'asdf qwer zxcv lkjh',
];

// Load and evaluate the UI core
const uiCorePath = path.join(__dirname, '../ui/src/ddrp-core.js');
const uiCoreSource = fs.readFileSync(uiCorePath, 'utf-8');

// Create a minimal module context for the UI core
const moduleExports: Record<string, unknown> = {};
const moduleContext = {
  exports: moduleExports,
  module: { exports: moduleExports },
};

// Transform ES module exports to CommonJS for vm evaluation
const transformedSource = uiCoreSource
  .replace(/export function (\w+)/g, 'module.exports.$1 = function $1')
  .replace(/export const (\w+)/g, 'module.exports.$1')
  .replace(/export \{ .* \};?/g, '');

try {
  vm.runInNewContext(transformedSource, moduleContext);
} catch (e) {
  console.error('Failed to load UI core:', e);
  process.exit(1);
}

const uiCore = moduleContext.module.exports as {
  detectOperators: (text: string) => unknown;
  instantiateObligations: (matches: unknown[]) => unknown;
};

// Run parity tests
console.log('=== UI CORE PARITY VERIFICATION ===\n');

const cliDetector = createOperatorDetector();
let allMatch = true;

for (const input of TEST_INPUTS) {
  console.log(`Input: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"`);

  // CLI core
  const cliDetection = cliDetector.detect(input);
  const cliObligations = instantiateObligations(cliDetection.matches);

  // UI core
  const uiDetection = uiCore.detectOperators(input) as typeof cliDetection;
  const uiObligations = uiCore.instantiateObligations(uiDetection.matches) as typeof cliObligations;

  // Compare
  const detectionMatch = JSON.stringify(cliDetection) === JSON.stringify(uiDetection);
  const obligationMatch = JSON.stringify(cliObligations) === JSON.stringify(uiObligations);

  console.log(`  Detection match: ${detectionMatch ? 'YES' : 'NO'}`);
  console.log(`  Obligations match: ${obligationMatch ? 'YES' : 'NO'}`);

  if (!detectionMatch || !obligationMatch) {
    allMatch = false;
    if (!detectionMatch) {
      console.log('  CLI detection:', JSON.stringify(cliDetection, null, 2).substring(0, 200));
      console.log('  UI detection:', JSON.stringify(uiDetection, null, 2).substring(0, 200));
    }
  }

  console.log('');
}

if (allMatch) {
  console.log('PARITY VERIFIED: UI core produces identical outputs to CLI core');
  process.exit(0);
} else {
  console.log('PARITY FAILED: Outputs differ');
  process.exit(1);
}
