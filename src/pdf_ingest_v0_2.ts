/**
 * DDRP v0.2 PDF Ingestion Module
 *
 * Extracts text from PDF files using pdfjs-dist (Mozilla PDF.js).
 * Deterministic: same PDF bytes + same version = identical output.
 *
 * Supported PDF types:
 * - Text-based PDFs (primary target)
 * - Digitally generated contracts/documents
 *
 * Rejected PDF types:
 * - Encrypted PDFs (explicit rejection)
 * - Scanned PDFs (OCR introduces nondeterminism)
 *
 * This module does NOT interpret PDF content semantically.
 * It only extracts text for downstream lexical analysis.
 */

import * as crypto from 'crypto';

// Note: pdfjs-dist must be installed separately
// This module provides the interface; actual implementation requires the library

// ============================================================================
// Types
// ============================================================================

export type PDFIngestErrorCode = 'ENCRYPTED' | 'SCANNED_SUSPECT' | 'PARSE_ERROR' | 'EMPTY';

export interface PDFIngestError {
  code: PDFIngestErrorCode;
  message: string;
}

export interface PDFMetadata {
  is_encrypted: boolean;
  is_scanned: boolean;
  producer?: string;
  creation_date?: string;
}

export interface PDFIngestResult {
  version: string;
  success: boolean;
  error?: PDFIngestError;
  page_count: number;
  raw_text: string;
  pdf_hash: string;
  metadata: PDFMetadata;
}

export interface PDFIngestConfig {
  version: string;
  reject_encrypted: boolean;
  reject_scanned: boolean;
  min_chars_per_page: number;
}

// ============================================================================
// Version & Defaults
// ============================================================================

export const PDF_INGEST_VERSION = '0.2.0';

const DEFAULT_CONFIG: PDFIngestConfig = {
  version: PDF_INGEST_VERSION,
  reject_encrypted: true,
  reject_scanned: true,
  min_chars_per_page: 100,
};

// ============================================================================
// Hashing (SHA-256 for archival traceability)
// ============================================================================

/**
 * Compute SHA-256 hash of PDF bytes for chain-of-custody.
 * Returns first 16 hex characters (64 bits) for display.
 */
export function sha256HashBytes(bytes: ArrayBuffer): string {
  const buffer = Buffer.from(bytes);
  return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

// ============================================================================
// PDF Ingestion (Node.js implementation)
// ============================================================================

/**
 * Ingest PDF and extract text.
 *
 * @param pdfBytes - Raw PDF file as ArrayBuffer
 * @param config - Optional configuration override
 * @returns PDFIngestResult with extracted text or error
 */
export async function ingestPDF(
  pdfBytes: ArrayBuffer,
  config?: Partial<PDFIngestConfig>
): Promise<PDFIngestResult> {
  const cfg: PDFIngestConfig = { ...DEFAULT_CONFIG, ...config };
  const pdfHash = sha256HashBytes(pdfBytes);

  try {
    // Dynamic import to handle optional dependency
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBytes),
      useSystemFonts: false,
      disableFontFace: true,
    });

    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;

    // Check for encryption (pdfjs throws on encrypted without password)
    // If we got here, it's not encrypted or was decryptable

    // Extract text from all pages
    const pageTexts: string[] = [];
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: unknown) => {
          const textItem = item as { str?: string };
          return textItem.str || '';
        })
        .join(' ');

      pageTexts.push(pageText);
      totalChars += pageText.length;
    }

    const rawText = pageTexts.join('\n\n');

    // Check for scanned PDF (low text-to-page ratio)
    const avgCharsPerPage = totalChars / pageCount;
    const isScanned = avgCharsPerPage < cfg.min_chars_per_page;

    if (cfg.reject_scanned && isScanned) {
      return {
        version: cfg.version,
        success: false,
        error: {
          code: 'SCANNED_SUSPECT',
          message: `PDF appears to be scanned (${Math.round(avgCharsPerPage)} chars/page, threshold: ${cfg.min_chars_per_page}). OCR is not supported.`,
        },
        page_count: pageCount,
        raw_text: '',
        pdf_hash: pdfHash,
        metadata: {
          is_encrypted: false,
          is_scanned: true,
        },
      };
    }

    // Check for empty extraction
    if (rawText.trim().length === 0) {
      return {
        version: cfg.version,
        success: false,
        error: {
          code: 'EMPTY',
          message: 'No text could be extracted from this PDF.',
        },
        page_count: pageCount,
        raw_text: '',
        pdf_hash: pdfHash,
        metadata: {
          is_encrypted: false,
          is_scanned: false,
        },
      };
    }

    // Get PDF metadata if available
    const info = await pdfDocument.getMetadata().catch(() => null);
    const pdfInfo = info?.info as Record<string, string> | undefined;

    return {
      version: cfg.version,
      success: true,
      page_count: pageCount,
      raw_text: rawText,
      pdf_hash: pdfHash,
      metadata: {
        is_encrypted: false,
        is_scanned: false,
        producer: pdfInfo?.Producer,
        creation_date: pdfInfo?.CreationDate,
      },
    };
  } catch (err: unknown) {
    const error = err as Error & { name?: string };

    // Check for encryption error
    if (error.name === 'PasswordException' || error.message?.includes('password')) {
      return {
        version: cfg.version,
        success: false,
        error: {
          code: 'ENCRYPTED',
          message: 'This PDF is encrypted. DDRP cannot process encrypted PDFs.',
        },
        page_count: 0,
        raw_text: '',
        pdf_hash: pdfHash,
        metadata: {
          is_encrypted: true,
          is_scanned: false,
        },
      };
    }

    // General parse error
    return {
      version: cfg.version,
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: `Failed to parse PDF: ${error.message}`,
      },
      page_count: 0,
      raw_text: '',
      pdf_hash: pdfHash,
      metadata: {
        is_encrypted: false,
        is_scanned: false,
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPDFIngestor(config?: Partial<PDFIngestConfig>): {
  ingest: (pdfBytes: ArrayBuffer) => Promise<PDFIngestResult>;
  getVersion: () => string;
} {
  const cfg: PDFIngestConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    ingest: (pdfBytes: ArrayBuffer) => ingestPDF(pdfBytes, cfg),
    getVersion: () => cfg.version,
  };
}
