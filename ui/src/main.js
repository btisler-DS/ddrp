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
 * - Run isolation with UUID
 * - Progressive disclosure
 * - Structural integrity indicator
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
// Constants
// ============================================================================

const MAX_VISIBLE_ROWS = 10;

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

let currentRunId = null;
let currentDetection = null;
let currentObligations = null;
let currentPDFResult = null;
let currentCanonResult = null;
let currentTransactionRecord = null;
let inputSource = 'text'; // 'text' | 'pdf'
let lastTransactionHash = '0000000000000000'; // Genesis hash for chaining
let showAllOperators = false;
let showAllObligations = false;

// ============================================================================
// DOM Elements
// ============================================================================

// Run control
const startNewRunBtn = document.getElementById('start-new-run');
const runIdDisplay = document.getElementById('run-id-display');
const currentRunIdSpan = document.getElementById('current-run-id');

// Input section
const inputSection = document.getElementById('input-section');
const documentInput = document.getElementById('document-input');
const charCount = document.getElementById('char-count');
const loadFileBtn = document.getElementById('load-file');
const fileInput = document.getElementById('file-input');
const loadPdfBtn = document.getElementById('load-pdf');
const pdfFileInput = document.getElementById('pdf-file-input');
const runReviewBtn = document.getElementById('run-review');

// Self-test
const runSelfTestBtn = document.getElementById('run-self-test');
const selfTestResult = document.getElementById('self-test-result');

// Samples
const sampleButtonsContainer = document.getElementById('sample-buttons');

// PDF preview
const pdfPreviewSection = document.getElementById('pdf-preview-section');
const pdfMetaDisplay = document.getElementById('pdf-meta');
const extractedTextPreview = document.getElementById('extracted-text-preview');

// Run summary
const runSummarySection = document.getElementById('run-summary-section');
const integrityIndicator = document.getElementById('integrity-indicator');
const integrityIcon = document.getElementById('integrity-icon');
const integrityLabel = document.getElementById('integrity-label');

// Summary fields
const summarySource = document.getElementById('summary-source');
const summaryPagesRow = document.getElementById('summary-pages-row');
const summaryPages = document.getElementById('summary-pages');
const summaryChars = document.getElementById('summary-chars');
const summaryCanonRules = document.getElementById('summary-canon-rules');
const summaryOperators = document.getElementById('summary-operators');
const summaryObligations = document.getElementById('summary-obligations');
const summarySatisfied = document.getElementById('summary-satisfied');
const summaryOpen = document.getElementById('summary-open');
const structuralProfile = document.getElementById('structural-profile');
const summaryInputHash = document.getElementById('summary-input-hash');
const summaryDetectionHash = document.getElementById('summary-detection-hash');
const summaryObligationsHash = document.getElementById('summary-obligations-hash');
const summaryTxRow = document.getElementById('summary-tx-row');
const summaryTxHash = document.getElementById('summary-tx-hash');
const summaryDeterministic = document.getElementById('summary-deterministic');

// Operators table
const operatorsSection = document.getElementById('operators-section');
const operatorsCountBadge = document.getElementById('operators-count-badge');
const operatorsTableBody = document.querySelector('#operators-table tbody');
const operatorsTableFooter = document.getElementById('operators-table-footer');
const showAllOperatorsBtn = document.getElementById('show-all-operators');
const operatorsTotal = document.getElementById('operators-total');

// Obligations table
const obligationsSection = document.getElementById('obligations-section');
const obligationsCountBadge = document.getElementById('obligations-count-badge');
const obligationsTableBody = document.querySelector('#obligations-table tbody');
const obligationsTableFooter = document.getElementById('obligations-table-footer');
const showAllObligationsBtn = document.getElementById('show-all-obligations');
const obligationsTotal = document.getElementById('obligations-total');

// Export
const exportSection = document.getElementById('export-section');
const exportOperatorsBtn = document.getElementById('export-operators');
const exportObligationsBtn = document.getElementById('export-obligations');
const exportBundleBtn = document.getElementById('export-bundle');
const exportTransactionBtn = document.getElementById('export-transaction');

// Footer
const footerVersion = document.getElementById('footer-version');
const footerPatterns = document.getElementById('footer-patterns');
const footerHash = document.getElementById('footer-hash');
const footerTimestamp = document.getElementById('footer-timestamp');
const footerDoi = document.getElementById('footer-doi');
const transactionHashDisplay = document.getElementById('transaction-hash');

// Transaction checkbox
const generateTransactionCheckbox = document.getElementById('generate-transaction');

// ============================================================================
// UUID Generation
// ============================================================================

function generateRunId() {
  // Generate UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// Run Isolation
// ============================================================================

function startNewRun() {
  // Generate new run ID
  currentRunId = generateRunId();

  // Clear all prior state
  currentDetection = null;
  currentObligations = null;
  currentPDFResult = null;
  currentCanonResult = null;
  currentTransactionRecord = null;
  inputSource = 'text';
  lastTransactionHash = '0000000000000000';
  showAllOperators = false;
  showAllObligations = false;

  // Clear input
  documentInput.value = '';
  updateCharCount();

  // Hide PDF preview
  hidePDFPreview();

  // Hide results
  clearResults();

  // Display run ID
  currentRunIdSpan.textContent = currentRunId;
  runIdDisplay.classList.remove('hidden');

  // Enable input section
  enableInputSection();

  // Disable review button until input is provided
  runReviewBtn.disabled = true;
}

function enableInputSection() {
  inputSection.classList.remove('disabled-section');
  documentInput.disabled = false;
  loadFileBtn.disabled = false;
  loadPdfBtn.disabled = false;
}

function disableInputSection() {
  inputSection.classList.add('disabled-section');
  documentInput.disabled = true;
  loadFileBtn.disabled = true;
  loadPdfBtn.disabled = true;
  runReviewBtn.disabled = true;
}

function updateReviewButtonState() {
  if (!currentRunId) {
    runReviewBtn.disabled = true;
    return;
  }

  const hasTextInput = documentInput.value.trim().length > 0;
  const hasPdfInput = inputSource === 'pdf' && currentCanonResult !== null;

  runReviewBtn.disabled = !(hasTextInput || hasPdfInput);
}

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
  startNewRunBtn.addEventListener('click', startNewRun);
  documentInput.addEventListener('input', () => {
    updateCharCount();
    updateReviewButtonState();
  });
  loadFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileLoad);
  loadPdfBtn.addEventListener('click', () => pdfFileInput.click());
  pdfFileInput.addEventListener('change', handlePDFLoad);
  runReviewBtn.addEventListener('click', runReview);
  runSelfTestBtn.addEventListener('click', runSelfTest);
  exportOperatorsBtn.addEventListener('click', exportOperators);
  exportObligationsBtn.addEventListener('click', exportObligations);
  exportBundleBtn.addEventListener('click', exportBundle);

  if (exportTransactionBtn) {
    exportTransactionBtn.addEventListener('click', exportTransaction);
  }

  // Progressive disclosure buttons
  if (showAllOperatorsBtn) {
    showAllOperatorsBtn.addEventListener('click', () => {
      showAllOperators = true;
      renderOperators();
    });
  }

  if (showAllObligationsBtn) {
    showAllObligationsBtn.addEventListener('click', () => {
      showAllObligations = true;
      renderObligations();
    });
  }

  updateCharCount();

  // Start in disabled state - require explicit run start
  disableInputSection();
}

// ============================================================================
// Input Handling
// ============================================================================

function updateCharCount() {
  const count = documentInput.value.length;
  charCount.textContent = `${count} characters`;
}

function loadSample(name, text) {
  if (!currentRunId) {
    alert('Please start a new run first.');
    return;
  }

  documentInput.value = text;
  inputSource = 'text';
  currentPDFResult = null;
  currentCanonResult = null;
  hidePDFPreview();
  updateCharCount();
  clearResults();
  updateReviewButtonState();
}

function handleFileLoad(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!currentRunId) {
    alert('Please start a new run first.');
    fileInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    documentInput.value = event.target.result;
    inputSource = 'text';
    currentPDFResult = null;
    currentCanonResult = null;
    hidePDFPreview();
    updateCharCount();
    clearResults();
    updateReviewButtonState();
  };
  reader.readAsText(file);
  fileInput.value = '';
}

async function handlePDFLoad(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!currentRunId) {
    alert('Please start a new run first.');
    pdfFileInput.value = '';
    return;
  }

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
    updateReviewButtonState();
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
  if (!currentRunId) {
    alert('Please start a new run first.');
    return;
  }

  let textToAnalyze;
  let inputLength;

  if (inputSource === 'pdf' && currentCanonResult) {
    textToAnalyze = currentCanonResult.canonical_text;
    inputLength = currentCanonResult.canonical_length;
  } else {
    textToAnalyze = documentInput.value;
    inputLength = textToAnalyze.length;
  }

  if (!textToAnalyze.trim()) {
    alert('No document text provided.');
    return;
  }

  currentDetection = detectOperators(textToAnalyze);
  currentObligations = instantiateObligations(currentDetection.matches);

  // Compute hashes for continuity tracking
  const detectionHash = await sha256Hash(JSON.stringify(currentDetection));
  const obligationsHash = await sha256Hash(JSON.stringify(currentObligations));

  // Generate transaction record if checkbox is checked
  if (generateTransactionCheckbox && generateTransactionCheckbox.checked) {
    currentTransactionRecord = await createTransactionRecord({
      inputHash: currentDetection.input_hash,
      inputLength: inputLength,
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

  // Render results
  renderSummary(detectionHash, obligationsHash);
  renderOperators();
  renderObligations();
  updateFooter();

  // Show sections
  runSummarySection.classList.remove('hidden');
  operatorsSection.classList.remove('hidden');
  obligationsSection.classList.remove('hidden');
  exportSection.classList.remove('hidden');
}

function clearResults() {
  currentDetection = null;
  currentObligations = null;
  currentTransactionRecord = null;
  showAllOperators = false;
  showAllObligations = false;

  runSummarySection.classList.add('hidden');
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
// Structural Integrity Calculation
// ============================================================================

function calculateIntegrity(detection, obligations) {
  // Count operators by type
  const opCounts = {};
  for (const op of detection.matches) {
    opCounts[op.op_type] = (opCounts[op.op_type] || 0) + 1;
  }

  // Count obligation statuses
  let satisfiedCount = 0;
  let openCount = 0;
  for (const obl of obligations.obligations) {
    if (obl.status === 'SATISFIED') {
      satisfiedCount++;
    } else if (obl.status === 'OPEN') {
      openCount++;
    }
  }

  const totalObligations = obligations.obligation_count;
  const totalOperators = detection.matches.length;

  // Integrity rules (structural only, no interpretation):
  // - CORRUPTED: No operators detected on non-empty input (structural absence)
  // - FLAWED: >50% of obligations are OPEN
  // - ABNORMAL: Any obligations are OPEN
  // - NORMAL: All obligations SATISFIED (or no obligations)

  if (totalOperators === 0) {
    return {
      state: 'corrupted',
      label: 'Corrupted',
      description: 'No structural operators detected'
    };
  }

  if (totalObligations > 0) {
    const openRatio = openCount / totalObligations;

    if (openRatio > 0.5) {
      return {
        state: 'flawed',
        label: 'Flawed',
        description: `${openCount} of ${totalObligations} obligations unresolved`
      };
    }

    if (openCount > 0) {
      return {
        state: 'abnormal',
        label: 'Abnormal',
        description: `${openCount} obligation(s) unresolved`
      };
    }
  }

  return {
    state: 'normal',
    label: 'Normal',
    description: 'All structural obligations resolved'
  };
}

// ============================================================================
// Rendering
// ============================================================================

function renderSummary(detectionHash, obligationsHash) {
  // Input card
  summarySource.textContent = inputSource === 'pdf' ? 'PDF' : 'Text';

  if (inputSource === 'pdf' && currentPDFResult) {
    summaryPagesRow.classList.remove('hidden');
    summaryPages.textContent = currentPDFResult.page_count;
  } else {
    summaryPagesRow.classList.add('hidden');
  }

  const charLength = inputSource === 'pdf' && currentCanonResult
    ? currentCanonResult.canonical_length
    : documentInput.value.length;
  summaryChars.textContent = charLength.toLocaleString();
  summaryCanonRules.textContent = CANON_RULE_COUNT;

  // Signals card
  summaryOperators.textContent = currentDetection.matches.length;
  summaryObligations.textContent = currentObligations.obligation_count;

  let satisfiedCount = 0;
  let openCount = 0;
  for (const obl of currentObligations.obligations) {
    if (obl.status === 'SATISFIED') satisfiedCount++;
    else if (obl.status === 'OPEN') openCount++;
  }
  summarySatisfied.textContent = satisfiedCount;
  summaryOpen.textContent = openCount;

  // Structural profile card
  const opCounts = {};
  for (const op of currentDetection.matches) {
    opCounts[op.op_type] = (opCounts[op.op_type] || 0) + 1;
  }

  structuralProfile.innerHTML = '';
  const opTypes = ['REQ', 'DEF', 'CAUSE', 'SCOPE', 'UNIV', 'ANCHOR'];
  for (const opType of opTypes) {
    const count = opCounts[opType] || 0;
    const div = document.createElement('div');
    div.className = 'profile-item';
    div.innerHTML = `<span>${opType}:</span><span>${count}</span>`;
    structuralProfile.appendChild(div);
  }

  // Continuity card
  summaryInputHash.textContent = currentDetection.input_hash;
  summaryDetectionHash.textContent = detectionHash.slice(0, 16);
  summaryObligationsHash.textContent = obligationsHash.slice(0, 16);

  if (currentTransactionRecord) {
    summaryTxRow.classList.remove('hidden');
    summaryTxHash.textContent = currentTransactionRecord.chain.transaction_hash;
  } else {
    summaryTxRow.classList.add('hidden');
  }

  summaryDeterministic.textContent = '\u2714'; // Checkmark

  // Integrity indicator
  const integrity = calculateIntegrity(currentDetection, currentObligations);

  // Remove all integrity classes
  integrityIndicator.classList.remove('integrity-normal', 'integrity-abnormal', 'integrity-flawed', 'integrity-corrupted');
  integrityIndicator.classList.add(`integrity-${integrity.state}`);

  integrityLabel.textContent = `${integrity.label}: ${integrity.description}`;
}

function renderOperators() {
  operatorsTableBody.innerHTML = '';

  const operators = currentDetection.matches;
  const total = operators.length;
  const visibleCount = showAllOperators ? total : Math.min(total, MAX_VISIBLE_ROWS);

  operatorsCountBadge.textContent = `(${total})`;

  for (let i = 0; i < visibleCount; i++) {
    const op = operators[i];
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(op.op_type)}</td>
      <td>${escapeHtml(op.matched_text)}</td>
      <td>${escapeHtml(op.pattern_id)}</td>
      <td>${op.char_start}-${op.char_end}</td>
    `;
    operatorsTableBody.appendChild(row);
  }

  // Show/hide footer
  if (total > MAX_VISIBLE_ROWS && !showAllOperators) {
    operatorsTotal.textContent = total;
    operatorsTableFooter.classList.remove('hidden');
  } else {
    operatorsTableFooter.classList.add('hidden');
  }
}

function renderObligations() {
  obligationsTableBody.innerHTML = '';

  const obligations = currentObligations.obligations;
  const total = obligations.length;
  const visibleCount = showAllObligations ? total : Math.min(total, MAX_VISIBLE_ROWS);

  obligationsCountBadge.textContent = `(${total})`;

  for (let i = 0; i < visibleCount; i++) {
    const obl = obligations[i];
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

  // Show/hide footer
  if (total > MAX_VISIBLE_ROWS && !showAllObligations) {
    obligationsTotal.textContent = total;
    obligationsTableFooter.classList.remove('hidden');
  } else {
    obligationsTableFooter.classList.add('hidden');
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
  const runSuffix = currentRunId ? `-${currentRunId.slice(0, 8)}` : '';
  return `ddrp-v${DDRP_VERSION}-${type}-${hash}${runSuffix}-${timestamp}`;
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
    run_id: currentRunId,
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
