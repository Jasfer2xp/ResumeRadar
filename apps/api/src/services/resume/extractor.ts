import { readFile } from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

export function validateFile(mimetype: string, originalname: string, sizeBytes: number, maxSizeMb: number): void {
  const ext = originalname.toLowerCase().slice(originalname.lastIndexOf('.'));
  if (!ALLOWED_TYPES.includes(mimetype) && !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.');
  }
  if (sizeBytes > maxSizeMb * 1024 * 1024) {
    throw new Error(`File too large. Maximum size is ${maxSizeMb}MB.`);
  }
}

export async function extractText(filePath: string, fileType: string): Promise<string> {
  const buffer = await readFile(filePath);

  if (fileType === 'application/pdf' || filePath.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return cleanupText(data.text);
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filePath.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return cleanupText(result.value);
  }

  if (fileType === 'text/plain' || filePath.endsWith('.txt')) {
    return cleanupText(buffer.toString('utf-8'));
  }

  throw new Error('Unsupported file type for text extraction');
}

function cleanupText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}
