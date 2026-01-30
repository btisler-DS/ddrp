/**
 * DDRP v0.1 UI - Main Application
 *
 * This is a thin wrapper over DDRP v0.1 core.
 * It does not interpret, summarize, score, or explain results.
 */

import { detectOperators, instantiateObligations, DDRP_VERSION, PATTERN_COUNT } from './ddrp-core.js';

// ============================================================================
// Known Test Inputs (from tests/hostile_audit_v0_1/inputs/)
// ============================================================================

const KNOWN_SAMPLES = {
  'Semantic A': 'Users must submit identification within 30 days.',
  'Semantic B': 'Identification must be provided by users no later than thirty days.',
  'Rhetoric': 'It is extremely important, critical, and essential that all stakeholders understand the vital necessity of compliance.',
  'Missing Info': 'Identification must be submitted.',
  'Contradiction': 'Users must submit identification.\nUsers must not submit identification.',
  'Scope': 'For users in the EU, all data must be stored locally.',
  'Anchor': 'Data retention is required pursuant to ISO 27001.',
  'Garbage': 'asdf qwer zxcv lkjh',
};

// ============================================================================
// State
// ============================================================================

let currentDetection = null;
let currentObligations = null;

// ============================================================================
// DOM Elements
// ============================================================================

const documentInput = document.getElementById('document-input');
const charCount = document.getElementById('char-count');
const loadFileBtn = document.getElementById('load-file');
const fileInput = document.getElementById('file-input');
const runReviewBtn = document.getElementById('run-review');
const runSelfTestBtn = document.getElementById('run-self-test');
const selfTestResult = document.getElementById('self-test-result');
const sampleButtonsContainer = document.getElementById('sample-buttons');
const operatorsSection = document.getElementById('operators-section');
const operatorsTableBody = document.querySelector('#operators-table tbody');
const obligationsSection = document.getElementById('obligations-section');
const obligationsTableBody = document.querySelector('#obligations-table tbody');
const exportSection = document.getElementById('export-section');
const exportOperatorsBtn = document.getElementById('export-operators');
const exportObligationsBtn = document.getElementById('export-obligations');
const exportBundleBtn = document.getElementById('export-bundle');
const footerVersion = document.getElementById('footer-version');
const footerPatterns = document.getElementById('footer-patterns');
const footerHash = document.getElementById('footer-hash');
const footerTimestamp = document.getElementById('footer-timestamp');

// ============================================================================
// Initialize
// ============================================================================

function init() {
  footerVersion.textContent = `DDRP v${DDRP_VERSION}`;
  footerPatterns.textContent = `Patterns: ${PATTERN_COUNT}`;

  // Create sample buttons
  for (const [name, text] of Object.entries(KNOWN_SAMPLES)) {
    const btn = document.createElement('button');
    btn.textContent = `Known: ${name}`;
    btn.addEventListener('click', () => loadSample(name, text));
    sampleButtonsContainer.appendChild(btn);
  }

  // Event listeners
  documentInput.addEventListener('input', updateCharCount);
  loadFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileLoad);
  runReviewBtn.addEventListener('click', runReview);
  runSelfTestBtn.addEventListener('click', runSelfTest);
  exportOperatorsBtn.addEventListener('click', exportOperators);
  exportObligationsBtn.addEventListener('click', exportObligations);
  exportBundleBtn.addEventListener('click', exportBundle);

  updateCharCount();
}

// ============================================================================
// Input Handling
// ============================================================================

function updateCharCount() {
  const count = documentInput.value.length;
  charCount.textContent = `${count} characters`;
}

function loadSample(name, text) {
  documentInput.value = text;
  updateCharCount();
  clearResults();
}

function handleFileLoad(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    documentInput.value = event.target.result;
    updateCharCount();
    clearResults();
  };
  reader.readAsText(file);
  fileInput.value = '';
}

// ============================================================================
// Review Execution
// ============================================================================

function runReview() {
  const text = documentInput.value;
  if (!text.trim()) {
    alert('No document text provided.');
    return;
  }

  currentDetection = detectOperators(text);
  currentObligations = instantiateObligations(currentDetection.matches);

  renderOperators();
  renderObligations();
  updateFooter();

  operatorsSection.classList.remove('hidden');
  obligationsSection.classList.remove('hidden');
  exportSection.classList.remove('hidden');
}

function clearResults() {
  currentDetection = null;
  currentObligations = null;
  operatorsSection.classList.add('hidden');
  obligationsSection.classList.add('hidden');
  exportSection.classList.add('hidden');
  operatorsTableBody.innerHTML = '';
  obligationsTableBody.innerHTML = '';
  footerHash.textContent = 'Input hash: --';
  footerTimestamp.textContent = 'Timestamp: --';
}

// ============================================================================
// Rendering
// ============================================================================

function renderOperators() {
  operatorsTableBody.innerHTML = '';

  for (const op of currentDetection.matches) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(op.op_type)}</td>
      <td>${escapeHtml(op.matched_text)}</td>
      <td>${escapeHtml(op.pattern_id)}</td>
      <td>${op.char_start}-${op.char_end}</td>
    `;
    operatorsTableBody.appendChild(row);
  }
}

function renderObligations() {
  obligationsTableBody.innerHTML = '';

  for (const obl of currentObligations.obligations) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(obl.obl_id)}</td>
      <td>${escapeHtml(obl.obl_type)}</td>
      <td>${escapeHtml(obl.status)}</td>
      <td>${escapeHtml(obl.required_fields.join(', '))}</td>
      <td>${escapeHtml(obl.present_fields.join(', ') || '(none)')}</td>
      <td>${escapeHtml(obl.missing_fields.join(', ') || '(none)')}</td>
    `;
    obligationsTableBody.appendChild(row);
  }
}

function updateFooter() {
  footerHash.textContent = `Input hash: ${currentDetection.input_hash}`;
  footerTimestamp.textContent = `Timestamp: ${new Date().toISOString()}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// Self-Test
// ============================================================================

function runSelfTest() {
  selfTestResult.classList.remove('hidden');
  selfTestResult.textContent = 'Running self-test...';

  // Determinism test
  const testInput = 'Users must register within 30 days.';
  const results = [];

  for (let i = 0; i < 10; i++) {
    const detection = detectOperators(testInput);
    results.push(JSON.stringify(detection));
  }

  const allIdentical = results.every(r => r === results[0]);
  const detection = JSON.parse(results[0]);

  let output = `DDRP v${DDRP_VERSION} Self-Test\n`;
  output += `Timestamp: ${new Date().toISOString()}\n\n`;
  output += `Determinism Test (10 runs): ${allIdentical ? 'PASS' : 'FAIL'}\n`;
  output += `Pattern Count: ${PATTERN_COUNT}\n`;
  output += `Test Input Hash: ${detection.input_hash}\n`;
  output += `Operators Detected: ${detection.matches.length}\n\n`;

  // Run all samples
  output += `Sample Tests:\n`;
  for (const [name, text] of Object.entries(KNOWN_SAMPLES)) {
    const det = detectOperators(text);
    const obl = instantiateObligations(det.matches);
    output += `  ${name}: ${det.matches.length} ops, ${obl.obligation_count} obls\n`;
  }

  output += `\nOverall: ${allIdentical ? 'PASS' : 'FAIL'}`;

  selfTestResult.textContent = output;
}

// ============================================================================
// Export Functions
// ============================================================================

function getExportFilename(type) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const hash = currentDetection?.input_hash || 'unknown';
  return `ddrp-v${DDRP_VERSION}-${type}-${hash}-${timestamp}`;
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportOperators() {
  if (!currentDetection) {
    alert('No results to export. Run a review first.');
    return;
  }
  downloadJson(currentDetection, getExportFilename('operators'));
}

function exportObligations() {
  if (!currentObligations) {
    alert('No results to export. Run a review first.');
    return;
  }
  downloadJson(currentObligations, getExportFilename('obligations'));
}

async function exportBundle() {
  if (!currentDetection || !currentObligations) {
    alert('No results to export. Run a review first.');
    return;
  }

  // Simple ZIP implementation using JSZip if available, otherwise export as JSON
  const bundle = {
    ddrp_version: DDRP_VERSION,
    timestamp: new Date().toISOString(),
    input_hash: currentDetection.input_hash,
    detection: currentDetection,
    obligations: currentObligations,
  };

  downloadJson(bundle, getExportFilename('bundle'));
}

// ============================================================================
// Start Application
// ============================================================================

init();
