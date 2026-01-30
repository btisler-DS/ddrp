/**
 * DDRP Transaction Log v0.2
 *
 * Creates local, append-only, cryptographically chained records of DDRP executions.
 * Provides verifiable continuity without compliance claims.
 *
 * What DTR is:
 * - A local execution record
 * - Cryptographically chained (SHA-256)
 * - Tamper-evident sequencing
 * - Independently verifiable
 *
 * What DTR is NOT:
 * - Not a compliance determination
 * - Not a legal seal
 * - Not a trusted timestamp authority
 * - Not a blockchain
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Types
// ============================================================================

export interface TransactionInput {
  input_hash: string;
  input_length: number;
  input_format: 'text/plain' | 'application/pdf';
}

export interface TransactionOutputs {
  detection_hash: string;
  obligations_hash: string;
}

export interface TransactionEnvironment {
  node_version: string;
  os: string;
  ddrp_version: string;
  ddrp_commit?: string;
}

export interface TransactionChain {
  previous_transaction_hash: string;
  transaction_hash: string;
}

export interface TransactionRecord {
  ddrp_version: string;
  transaction_version: string;
  transaction_id: string;
  timestamp_local: string;
  timezone: string;
  input: TransactionInput;
  outputs: TransactionOutputs;
  environment: TransactionEnvironment;
  chain: TransactionChain;
  disclaimer: string;
}

export interface CreateTransactionOptions {
  inputHash: string;
  inputLength: number;
  inputFormat: 'text/plain' | 'application/pdf';
  detectionHash: string;
  obligationsHash: string;
  ddrpVersion: string;
  ddrpCommit?: string;
  transactionsDir?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const TRANSACTION_VERSION = '0.2.0';
const GENESIS_HASH = '0000000000000000';
const DISCLAIMER = 'This record documents execution continuity only. It does not assert compliance, correctness, or legal validity.';

// ============================================================================
// Hashing (SHA-256)
// ============================================================================

/**
 * Compute SHA-256 hash of string data.
 * Returns first 16 hex characters for consistency with other DDRP hashes.
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex').substring(0, 16);
}

/**
 * Compute hash of a transaction record (excluding chain.transaction_hash).
 */
function hashTransactionContent(record: Omit<TransactionRecord, 'chain'> & { chain: { previous_transaction_hash: string } }): string {
  const content = JSON.stringify({
    ddrp_version: record.ddrp_version,
    transaction_version: record.transaction_version,
    transaction_id: record.transaction_id,
    timestamp_local: record.timestamp_local,
    timezone: record.timezone,
    input: record.input,
    outputs: record.outputs,
    environment: record.environment,
    previous_transaction_hash: record.chain.previous_transaction_hash,
  });
  return sha256(content);
}

// ============================================================================
// UUID Generation (v4-like, deterministic from timestamp + random)
// ============================================================================

function generateTransactionId(): string {
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ============================================================================
// Transaction Log Operations
// ============================================================================

/**
 * Get the last transaction hash from the transactions directory.
 * Returns GENESIS_HASH if no transactions exist.
 */
export function getLastTransactionHash(transactionsDir: string): string {
  if (!fs.existsSync(transactionsDir)) {
    return GENESIS_HASH;
  }

  const files = fs.readdirSync(transactionsDir)
    .filter(f => f.endsWith('_transaction.json'))
    .sort();

  if (files.length === 0) {
    return GENESIS_HASH;
  }

  const lastFile = files[files.length - 1];
  const lastRecord = JSON.parse(
    fs.readFileSync(path.join(transactionsDir, lastFile), 'utf-8')
  ) as TransactionRecord;

  return lastRecord.chain.transaction_hash;
}

/**
 * Get the next transaction sequence number.
 */
export function getNextSequenceNumber(transactionsDir: string): number {
  if (!fs.existsSync(transactionsDir)) {
    return 1;
  }

  const files = fs.readdirSync(transactionsDir)
    .filter(f => f.endsWith('_transaction.json'))
    .sort();

  if (files.length === 0) {
    return 1;
  }

  const lastFile = files[files.length - 1];
  const match = lastFile.match(/^(\d+)_/);
  if (match) {
    return parseInt(match[1], 10) + 1;
  }
  return files.length + 1;
}

/**
 * Create a new transaction record.
 */
export function createTransactionRecord(options: CreateTransactionOptions): TransactionRecord {
  const transactionsDir = options.transactionsDir || path.join(process.cwd(), 'transactions');
  const previousHash = getLastTransactionHash(transactionsDir);

  const partialRecord = {
    ddrp_version: options.ddrpVersion,
    transaction_version: TRANSACTION_VERSION,
    transaction_id: generateTransactionId(),
    timestamp_local: new Date().toISOString(),
    timezone: 'UTC',
    input: {
      input_hash: options.inputHash,
      input_length: options.inputLength,
      input_format: options.inputFormat,
    },
    outputs: {
      detection_hash: options.detectionHash,
      obligations_hash: options.obligationsHash,
    },
    environment: {
      node_version: process.version,
      os: os.platform(),
      ddrp_version: options.ddrpVersion,
      ddrp_commit: options.ddrpCommit,
    },
    chain: {
      previous_transaction_hash: previousHash,
    },
    disclaimer: DISCLAIMER,
  };

  const transactionHash = hashTransactionContent(partialRecord);

  return {
    ...partialRecord,
    chain: {
      previous_transaction_hash: previousHash,
      transaction_hash: transactionHash,
    },
  };
}

/**
 * Write a transaction record to the transactions directory.
 */
export function writeTransactionRecord(
  record: TransactionRecord,
  transactionsDir?: string
): string {
  const dir = transactionsDir || path.join(process.cwd(), 'transactions');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const seqNum = getNextSequenceNumber(dir);
  const filename = `${String(seqNum).padStart(4, '0')}_transaction.json`;
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, JSON.stringify(record, null, 2));

  return filepath;
}

/**
 * Verify the integrity of a transaction chain.
 */
export function verifyTransactionChain(transactionsDir: string): {
  valid: boolean;
  errors: string[];
  count: number;
} {
  const errors: string[] = [];

  if (!fs.existsSync(transactionsDir)) {
    return { valid: true, errors: [], count: 0 };
  }

  const files = fs.readdirSync(transactionsDir)
    .filter(f => f.endsWith('_transaction.json'))
    .sort();

  if (files.length === 0) {
    return { valid: true, errors: [], count: 0 };
  }

  let expectedPreviousHash = GENESIS_HASH;

  for (const file of files) {
    const record = JSON.parse(
      fs.readFileSync(path.join(transactionsDir, file), 'utf-8')
    ) as TransactionRecord;

    // Verify chain link
    if (record.chain.previous_transaction_hash !== expectedPreviousHash) {
      errors.push(`${file}: Chain break - expected previous ${expectedPreviousHash}, got ${record.chain.previous_transaction_hash}`);
    }

    // Verify self-hash
    const computedHash = hashTransactionContent({
      ...record,
      chain: { previous_transaction_hash: record.chain.previous_transaction_hash },
    });

    if (computedHash !== record.chain.transaction_hash) {
      errors.push(`${file}: Hash mismatch - computed ${computedHash}, recorded ${record.chain.transaction_hash}`);
    }

    expectedPreviousHash = record.chain.transaction_hash;
  }

  return {
    valid: errors.length === 0,
    errors,
    count: files.length,
  };
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTransactionLogger(transactionsDir?: string) {
  const dir = transactionsDir || path.join(process.cwd(), 'transactions');

  return {
    create: (options: Omit<CreateTransactionOptions, 'transactionsDir'>) =>
      createTransactionRecord({ ...options, transactionsDir: dir }),
    write: (record: TransactionRecord) =>
      writeTransactionRecord(record, dir),
    verify: () => verifyTransactionChain(dir),
    getLastHash: () => getLastTransactionHash(dir),
    getVersion: () => TRANSACTION_VERSION,
  };
}
