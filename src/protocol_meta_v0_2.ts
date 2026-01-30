/**
 * DDRP v0.2 Protocol Metadata
 *
 * Provides protocol attribution and versioning for JSON output.
 * Supports DOI integration once scholarly artifact is published.
 *
 * DOI Status:
 * - 'unassigned': No DOI yet (preprint planned)
 * - 'assigned': DOI has been assigned and is valid
 */

// ============================================================================
// Types
// ============================================================================

export type DOIStatus = 'unassigned' | 'assigned';

export interface ProtocolMetadata {
  name: string;
  version: string;
  doi: string | null;
  doi_status: DOIStatus;
  spec_url?: string;
}

export type InputFormat = 'pdf' | 'text';

export interface InputProvenance {
  input_format: InputFormat;
  pdf_hash?: string;
  canonical_hash: string;
  input_hash: string;
}

export interface OutputEnvelope<T> {
  protocol: ProtocolMetadata;
  provenance: InputProvenance;
  timestamp: string;
  data: T;
}

// ============================================================================
// Protocol Metadata (v0.2.0)
// ============================================================================

export const PROTOCOL_META_V0_2: ProtocolMetadata = {
  name: 'DDRP',
  version: '0.2.0',
  doi: null,
  doi_status: 'unassigned',
  spec_url: 'https://github.com/btisler-DS/ddrp',
};

export const DDRP_VERSION = '0.2.0';

// ============================================================================
// Envelope Functions
// ============================================================================

/**
 * Wrap data with protocol metadata and provenance.
 *
 * @param data - The detection or obligation result
 * @param provenance - Input chain-of-custody information
 * @returns OutputEnvelope with full traceability
 */
export function wrapWithProtocol<T>(
  data: T,
  provenance: InputProvenance
): OutputEnvelope<T> {
  return {
    protocol: { ...PROTOCOL_META_V0_2 },
    provenance,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Create provenance for text input.
 *
 * @param canonicalHash - Hash of canonicalized text
 * @param inputHash - Hash of original input
 * @returns InputProvenance for text source
 */
export function createTextProvenance(
  canonicalHash: string,
  inputHash: string
): InputProvenance {
  return {
    input_format: 'text',
    canonical_hash: canonicalHash,
    input_hash: inputHash,
  };
}

/**
 * Create provenance for PDF input.
 *
 * @param pdfHash - Hash of original PDF bytes
 * @param canonicalHash - Hash of canonicalized extracted text
 * @param inputHash - Hash used by detector (same as canonicalHash for PDF)
 * @returns InputProvenance for PDF source
 */
export function createPDFProvenance(
  pdfHash: string,
  canonicalHash: string,
  inputHash: string
): InputProvenance {
  return {
    input_format: 'pdf',
    pdf_hash: pdfHash,
    canonical_hash: canonicalHash,
    input_hash: inputHash,
  };
}

/**
 * Format DOI for display.
 * Returns human-readable string based on assignment status.
 */
export function formatDOI(meta: ProtocolMetadata): string {
  if (meta.doi_status === 'assigned' && meta.doi) {
    return `DOI: ${meta.doi}`;
  }
  return 'DOI: unassigned (preprint planned)';
}

/**
 * Update DOI when assigned (for future use).
 * Returns new metadata object with assigned DOI.
 */
export function assignDOI(
  meta: ProtocolMetadata,
  doi: string
): ProtocolMetadata {
  return {
    ...meta,
    doi,
    doi_status: 'assigned',
  };
}
