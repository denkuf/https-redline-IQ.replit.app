import * as pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import { extractTextFromImage } from "./ai";

export async function parseFile(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  if (mimetype === "application/pdf") {
    return parsePdf(buffer);
  }
  
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword" ||
    filename.endsWith(".docx") ||
    filename.endsWith(".doc")
  ) {
    return parseDocx(buffer);
  }
  
  if (mimetype.startsWith("image/")) {
    return parseImage(buffer);
  }
  
  // Try to parse as text
  return buffer.toString("utf-8");
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
    // Remove extension and clean up
    const name = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    if (name.length > 3) {
      return name.slice(0, 50);
    }
  }
  
  // Try to extract a name from the first few lines
  const lines = text.split("\n").slice(0, 10);
  for (const line of lines) {
    const cleaned = line.trim();
    if (cleaned.length > 5 && cleaned.length < 100 && !cleaned.match(/^\d+$/)) {
      return cleaned.slice(0, 50);
    }
  }
  
  return "Untitled Contract";
}
