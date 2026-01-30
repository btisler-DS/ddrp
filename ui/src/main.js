/**
 * DDRP v0.2 UI - Main Application
 *
 * This is a thin wrapper over DDRP v0.2 core.
 * It does not interpret, summarize, score, or explain results.
 *
 * v0.2 additions:
 * - PDF upload and text extraction
 * - Read-only preview of extracted text
 * - Chain-of-custody provenance in exports
 */

import {
  detectOperators,
  instantiateObligations,
  ingestPDF,
  canonicalizeText,
  sha256Hash,
  formatDOI,
  createTextProvenance,
  createPDFProvenance,
  wrapWithProtocol,
  createTransactionRecord,
  DDRP_VERSION,
  PATTERN_COUNT,
  PROTOCOL_META,
  CANON_RULE_COUNT,
  TRANSACTION_VERSION,
} from './ddrp-core.js';

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
let currentPDFResult = null;
let currentCanonResult = null;
let currentTransactionRecord = null;
let inputSource = 'text'; // 'text' | 'pdf'
let lastTransactionHash = '0000000000000000'; // Genesis hash for chaining

// ============================================================================
// DOM Elements
// ============================================================================

const documentInput = document.getElementById('document-input');
const charCount = document.getElementById('char-count');
const loadFileBtn = document.getElementById('load-file');
const fileInput = document.getElementById('file-input');
const loadPdfBtn = document.getElementById('load-pdf');
const pdfFileInput = document.getElementById('pdf-file-input');
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
const footerDoi = document.getElementById('footer-doi');

// PDF-specific elements
const pdfPreviewSection = document.getElementById('pdf-preview-section');
const pdfMetaDisplay = document.getElementById('pdf-meta');
const extractedTextPreview = document.getElementById('extracted-text-preview');

// Transaction record elements
const generateTransactionCheckbox = document.getElementById('generate-transaction');
const transactionHashDisplay = document.getElementById('transaction-hash');

// ============================================================================
// Initialize
// ============================================================================

function init() {
  footerVersion.textContent = `DDRP v${DDRP_VERSION}`;
  footerPatterns.textContent = `Patterns: ${PATTERN_COUNT}`;
  footerDoi.textContent = formatDOI(PROTOCOL_META);

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
  loadPdfBtn.addEventListener('click', () => pdfFileInput.click());
  pdfFileInput.addEventListener('change', handlePDFLoad);
  runReviewBtn.addEventListener('click', runReview);
  runSelfTestBtn.addEventListener('click', runSelfTest);
  exportOperatorsBtn.addEventListener('click', exportOperators);
  exportObligationsBtn.addEventListener('click', exportObligations);
  exportBundleBtn.addEventListener('click', exportBundle);

  // Transaction record export button (if exists)
  const exportTransactionBtn = document.getElementById('export-transaction');
  if (exportTransactionBtn) {
    exportTransactionBtn.addEventListener('click', exportTransaction);
  }

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
  inputSource = 'text';
  currentPDFResult = null;
  currentCanonResult = null;
  hidePDFPreview();
  updateCharCount();
  clearResults();
}

function handleFileLoad(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    documentInput.value = event.target.result;
    inputSource = 'text';
    currentPDFResult = null;
    currentCanonResult = null;
    hidePDFPreview();
    updateCharCount();
    clearResults();
  };
  reader.readAsText(file);
  fileInput.value = '';
}

async function handlePDFLoad(e) {
  const file = e.target.files[0];
  if (!file) return;

  pdfFileInput.value = '';

  try {
    const arrayBuffer = await file.arrayBuffer();
    currentPDFResult = await ingestPDF(arrayBuffer);

    if (!currentPDFResult.success) {
      displayPDFError(currentPDFResult.error);
      return;
    }

    currentCanonResult = await canonicalizeText(currentPDFResult.raw_text);
    inputSource = 'pdf';

    displayPDFMeta(file.name);
    displayExtractedText();
    clearResults();
  } catch (err) {
    alert(`Failed to load PDF: ${err.message}`);
  }
}

function displayPDFMeta(filename) {
  pdfMetaDisplay.innerHTML = `
    <div><strong>File:</strong> ${escapeHtml(filename)}</div>
    <div><strong>Pages:</strong> ${currentPDFResult.page_count}</div>
    <div><strong>Extraction:</strong> Success</div>
    <div><strong>PDF Hash (SHA-256):</strong> ${currentPDFResult.pdf_hash}</div>
    <div><strong>Canonical Hash (SHA-256):</strong> ${currentCanonResult.canonical_hash}</div>
    <div><strong>Canon Rules Applied:</strong> ${currentCanonResult.applied_rules.length}</div>
  `;
  pdfPreviewSection.classList.remove('hidden');
}

function displayExtractedText() {
  extractedTextPreview.value = currentCanonResult.canonical_text;
  charCount.textContent = `${currentCanonResult.canonical_length} characters (from PDF)`;
}

function displayPDFError(error) {
  const messages = {
    'ENCRYPTED': 'This PDF is encrypted. DDRP cannot process encrypted PDFs.',
    'SCANNED_SUSPECT': 'This PDF appears to be scanned. OCR is not supported in DDRP.',
    'PARSE_ERROR': `Failed to parse PDF: ${error.message}`,
    'EMPTY': 'No text could be extracted from this PDF.',
  };
  alert(messages[error.code] || error.message);
}

function hidePDFPreview() {
  pdfPreviewSection.classList.add('hidden');
  pdfMetaDisplay.innerHTML = '';
  extractedTextPreview.value = '';
}

// ============================================================================
// Review Execution
// ============================================================================

async function runReview() {
  let textToAnalyze;

  if (inputSource === 'pdf' && currentCanonResult) {
    textToAnalyze = currentCanonResult.canonical_text;
  } else {
    textToAnalyze = documentInput.value;
  }

  if (!textToAnalyze.trim()) {
    alert('No document text provided.');
    return;
  }

  currentDetection = detectOperators(textToAnalyze);
  currentObligations = instantiateObligations(currentDetection.matches);

  // Generate transaction record if checkbox is checked
  if (generateTransactionCheckbox && generateTransactionCheckbox.checked) {
    const detectionHash = await sha256Hash(JSON.stringify(currentDetection));
    const obligationsHash = await sha256Hash(JSON.stringify(currentObligations));

    currentTransactionRecord = await createTransactionRecord({
      inputHash: currentDetection.input_hash,
      inputLength: textToAnalyze.length,
      inputFormat: inputSource === 'pdf' ? 'application/pdf' : 'text/plain',
      detectionHash,
      obligationsHash,
      previousTransactionHash: lastTransactionHash,
    });

    // Update chain for next transaction
    lastTransactionHash = currentTransactionRecord.chain.transaction_hash;

    // Show transaction hash in footer
    if (transactionHashDisplay) {
      transactionHashDisplay.textContent = `TX: ${currentTransactionRecord.chain.transaction_hash}`;
      transactionHashDisplay.classList.remove('hidden');
    }
  } else {
    currentTransactionRecord = null;
    if (transactionHashDisplay) {
      transactionHashDisplay.classList.add('hidden');
    }
  }

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
  currentTransactionRecord = null;
  operatorsSection.classList.add('hidden');
  obligationsSection.classList.add('hidden');
  exportSection.classList.add('hidden');
  operatorsTableBody.innerHTML = '';
  obligationsTableBody.innerHTML = '';
  footerHash.textContent = 'Input hash: --';
  footerTimestamp.textContent = 'Timestamp: --';
  if (transactionHashDisplay) {
    transactionHashDisplay.classList.add('hidden');
  }
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
  output += `Canon Rule Count: ${CANON_RULE_COUNT}\n`;
  output += `Test Input Hash: ${detection.input_hash}\n`;
  output += `Operators Detected: ${detection.matches.length}\n\n`;

  // Run all samples
  output += `Sample Tests:\n`;
  for (const [name, text] of Object.entries(KNOWN_SAMPLES)) {
    const det = detectOperators(text);
    const obl = instantiateObligations(det.matches);
    output += `  ${name}: ${det.matches.length} ops, ${obl.obligation_count} obls\n`;
  }

  output += `\n${formatDOI(PROTOCOL_META)}\n`;
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

  // Build provenance based on input source
  let provenance;
  if (inputSource === 'pdf' && currentPDFResult && currentCanonResult) {
    provenance = createPDFProvenance(
      currentPDFResult.pdf_hash,
      currentCanonResult.canonical_hash,
      currentDetection.input_hash
    );
  } else {
    // For text input, compute canonical hash
    const textHash = await sha256Hash(documentInput.value);
    provenance = createTextProvenance(textHash, currentDetection.input_hash);
  }

  const bundleData = {
    detection: currentDetection,
    obligations: currentObligations,
  };

  // Include transaction record if generated
  if (currentTransactionRecord) {
    bundleData.transaction_record = currentTransactionRecord;
  }

  const bundle = wrapWithProtocol(bundleData, provenance);

  downloadJson(bundle, getExportFilename('bundle'));
}

function exportTransaction() {
  if (!currentTransactionRecord) {
    alert('No transaction record. Enable "Generate transaction record" and run a review first.');
    return;
  }
  downloadJson(currentTransactionRecord, getExportFilename('transaction'));
}

// ============================================================================
// Start Application
// ============================================================================

init();
