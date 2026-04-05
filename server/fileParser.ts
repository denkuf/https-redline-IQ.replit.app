import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer, options?: object) => Promise<{ text: string; numpages: number }> =
  _require("pdf-parse/lib/pdf-parse.js");
import * as mammoth from "mammoth";
import { extractTextFromImage } from "./ai";

export interface ParseResult {
  text: string;
  lowQuality: boolean;
}

function assessOcrQuality(text: string): boolean {
  if (!text || text.length < 500) return false;
  const chars = text.length;
  const words = text.split(/\s+/).filter(w => /[a-zA-Z]{2,}/.test(w));
  if (words.length < 20) return false;
  const wordsPerThousandChars = (words.length / chars) * 1000;
  return wordsPerThousandChars < 30;
}

export async function parseFile(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const result = await parseFileWithQuality(buffer, mimetype, filename);
  return result.text;
}

export async function parseFileWithQuality(buffer: Buffer, mimetype: string, filename: string): Promise<ParseResult> {
  if (mimetype === "application/pdf") {
    const text = await parsePdf(buffer);
    return { text, lowQuality: false };
  }
  
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword" ||
    filename.endsWith(".docx") ||
    filename.endsWith(".doc")
  ) {
    const text = await parseDocx(buffer);
    return { text, lowQuality: false };
  }
  
  if (mimetype.startsWith("image/")) {
    const text = await parseImage(buffer);
    const lowQuality = assessOcrQuality(text);
    return { text, lowQuality };
  }
  
  return { text: buffer.toString("utf-8"), lowQuality: false };
}

async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to parse PDF file");
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    console.error("DOCX parsing error:", error);
    throw new Error("Failed to parse Word document");
  }
}

async function parseImage(buffer: Buffer): Promise<string> {
  try {
    return await extractTextFromImage(buffer);
  } catch (error) {
    console.error("Image OCR error:", error);
    throw new Error("Failed to extract text from image");
  }
}

export function generateContractName(text: string, filename?: string): string {
  if (filename) {
    const name = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    if (name.length > 3) {
      return name.slice(0, 50);
    }
  }
  
  const lines = text.split("\n").slice(0, 10);
  for (const line of lines) {
    const cleaned = line.trim();
    if (cleaned.length > 5 && cleaned.length < 100 && !cleaned.match(/^\d+$/)) {
      return cleaned.slice(0, 50);
    }
  }
  
  return "Untitled Contract";
}
