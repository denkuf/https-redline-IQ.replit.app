import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeContract, explainClause, reanalyzeWithAnswers, compareContracts } from "./ai";
import { parseFile, generateContractName } from "./fileParser";
import { generatePdfExport, generateTextExport, generateNegotiationPackPdf } from "./export";
import type { IndustryMode, RiskPreferences } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all contracts
  app.get("/api/contracts", async (req: Request, res: Response) => {
    try {
      const contracts = await storage.getAllContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Get single contract
  app.get("/api/contracts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  // Upload file and create contract
  app.post("/api/contracts/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { buffer, mimetype, originalname } = req.file;
      const industryMode = (req.body.industryMode || "general") as IndustryMode;
      const riskPreferences = req.body.riskPreferences ? JSON.parse(req.body.riskPreferences) : undefined;
      
      // Parse file to extract text
      const extractedText = await parseFile(buffer, mimetype, originalname);
      if (!extractedText.trim()) {
        return res.status(400).json({ message: "Could not extract text from file" });
      }

      const name = generateContractName(extractedText, originalname);

      // Create contract with pending status
      const contract = await storage.createContract({
        name,
        extractedText,
        originalFileName: originalname,
        industryMode,
        status: "analyzing",
      });

      // Start analysis in background
      analyzeContract(extractedText, industryMode, riskPreferences)
        .then(async (result) => {
          await storage.updateContractAnalysis(contract.id, result, "completed");
          if (result.contractType) {
            await storage.updateContract(contract.id, { type: result.contractType });
          }
        })
        .catch(async (error) => {
          console.error("Analysis failed:", error);
          await storage.updateContract(contract.id, { status: "error" });
        });

      res.status(201).json(contract);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Create contract from pasted text
  app.post("/api/contracts", async (req: Request, res: Response) => {
    try {
      const { text, industryMode = "general", riskPreferences } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Contract text is required" });
      }

      const name = generateContractName(text);

      const contract = await storage.createContract({
        name,
        extractedText: text,
        industryMode,
        status: "analyzing",
      });

      // Start analysis in background
      analyzeContract(text, industryMode as IndustryMode, riskPreferences)
        .then(async (result) => {
          await storage.updateContractAnalysis(contract.id, result, "completed");
          if (result.contractType) {
            await storage.updateContract(contract.id, { type: result.contractType });
          }
        })
        .catch(async (error) => {
          console.error("Analysis failed:", error);
          await storage.updateContract(contract.id, { status: "error" });
        });

      res.status(201).json(contract);
    } catch (error) {
      console.error("Create error:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // Explain selected text
  app.post("/api/contracts/:id/explain", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Text selection is required" });
      }

      const explanation = await explainClause(text);
      res.json({ explanation });
    } catch (error) {
      console.error("Explain error:", error);
      res.status(500).json({ message: "Failed to explain text" });
    }
  });

  // Answer clarifying questions
  app.post("/api/contracts/:id/answers", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { answers } = req.body;

      const contract = await storage.getContract(id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (!contract.analysis) {
        return res.status(400).json({ message: "No analysis to update" });
      }

      // Update status to analyzing
      await storage.updateContract(id, { status: "analyzing" });

      // Re-analyze with answers
      const updatedAnalysis = await reanalyzeWithAnswers(
        contract.extractedText,
        contract.analysis,
        answers
      );

      await storage.updateContractAnalysis(id, updatedAnalysis, "completed");

      res.json({ success: true });
    } catch (error) {
      console.error("Answer error:", error);
      res.status(500).json({ message: "Failed to process answers" });
    }
  });

  // Export as PDF
  app.get("/api/contracts/:id/export/pdf", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const pdfBuffer = generatePdfExport(contract);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${contract.name.replace(/\s+/g, "_")}_analysis.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF export error:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  // Export as text
  app.get("/api/contracts/:id/export/text", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const textContent = generateTextExport(contract);
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${contract.name.replace(/\s+/g, "_")}_analysis.txt"`
      );
      res.send(textContent);
    } catch (error) {
      console.error("Text export error:", error);
      res.status(500).json({ message: "Failed to export text" });
    }
  });

  // Purge all contracts (must be before :id route)
  app.delete("/api/contracts/purge-all", async (req: Request, res: Response) => {
    try {
      await storage.deleteAllContracts();
      res.status(204).send();
    } catch (error) {
      console.error("Purge error:", error);
      res.status(500).json({ message: "Failed to purge contracts" });
    }
  });

  // Delete single contract
  app.delete("/api/contracts/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContract(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Compare two contract versions
  app.post("/api/contracts/:id/compare", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const originalContract = await storage.getContract(id);
      
      if (!originalContract) {
        return res.status(404).json({ message: "Original contract not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No comparison file uploaded" });
      }

      const { buffer, mimetype, originalname } = req.file;
      const newText = await parseFile(buffer, mimetype, originalname);

      if (!newText.trim()) {
        return res.status(400).json({ message: "Could not extract text from file" });
      }

      // Compare the contracts
      const comparison = await compareContracts(
        originalContract.extractedText,
        newText,
        originalContract.analysis!
      );

      // Create the new version as a child contract
      const newContract = await storage.createContract({
        name: `${originalContract.name} (v2)`,
        extractedText: newText,
        originalFileName: originalname,
        industryMode: originalContract.industryMode,
        parentContractId: originalContract.id,
        version: (originalContract.version || 1) + 1,
        status: "analyzing",
      });

      // Start analysis of new version
      analyzeContract(newText, (originalContract.industryMode || "general") as IndustryMode)
        .then(async (result) => {
          await storage.updateContractAnalysis(newContract.id, result, "completed");
        })
        .catch(async (error) => {
          console.error("Analysis failed:", error);
          await storage.updateContract(newContract.id, { status: "error" });
        });

      res.json({
        comparison,
        newContractId: newContract.id,
      });
    } catch (error) {
      console.error("Compare error:", error);
      res.status(500).json({ message: "Failed to compare contracts" });
    }
  });

  // Export negotiation pack as PDF
  app.get("/api/contracts/:id/export/negotiation-pack", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const contract = await storage.getContract(id);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const pdfBuffer = generateNegotiationPackPdf(contract);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${contract.name.replace(/\s+/g, "_")}_negotiation_pack.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Negotiation pack export error:", error);
      res.status(500).json({ message: "Failed to export negotiation pack" });
    }
  });

  // Reanalyze with different industry mode
  app.post("/api/contracts/:id/reanalyze", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { industryMode, riskPreferences } = req.body;
      
      const contract = await storage.getContract(id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      await storage.updateContract(id, { status: "analyzing", industryMode });

      // Re-analyze with new mode
      analyzeContract(contract.extractedText, industryMode as IndustryMode, riskPreferences)
        .then(async (result) => {
          await storage.updateContractAnalysis(id, result, "completed");
        })
        .catch(async (error) => {
          console.error("Reanalysis failed:", error);
          await storage.updateContract(id, { status: "error" });
        });

      res.json({ success: true });
    } catch (error) {
      console.error("Reanalyze error:", error);
      res.status(500).json({ message: "Failed to reanalyze contract" });
    }
  });

  return httpServer;
}
