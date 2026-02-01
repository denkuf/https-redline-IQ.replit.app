import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { analyzeContract, explainClause, reanalyzeWithAnswers, compareContracts } from "./ai";
import { parseFile, generateContractName } from "./fileParser";
import { generatePdfExport, generateTextExport, generateNegotiationPackPdf } from "./export";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import type { IndustryMode, RiskPreferences } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

// Helper to get userId from authenticated request
function getUserId(req: Request): string {
  return (req as any).user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication FIRST (before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Get all contracts (requires auth)
  app.get("/api/contracts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const contracts = await storage.getAllContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Get single contract (requires auth)
  app.get("/api/contracts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const contract = await storage.getContract(id, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  // Upload file and create contract (requires auth)
  app.post("/api/contracts/upload", isAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = getUserId(req);
      const { buffer, mimetype, originalname } = req.file;
      const industryMode = (req.body.industryMode || "general") as IndustryMode;
      const riskPreferences = req.body.riskPreferences ? JSON.parse(req.body.riskPreferences) : undefined;
      
      // Parse file to extract text
      const extractedText = await parseFile(buffer, mimetype, originalname);
      if (!extractedText.trim()) {
        return res.status(400).json({ message: "Could not extract text from file" });
      }

      const name = generateContractName(extractedText, originalname);

      // Create contract with pending status (userId for data isolation)
      const contract = await storage.createContract({
        name,
        extractedText,
        originalFileName: originalname,
        industryMode,
        status: "analyzing",
        userId,
      });

      // Start analysis in background
      analyzeContract(extractedText, industryMode, riskPreferences)
        .then(async (result) => {
          await storage.updateContractAnalysis(contract.id, result, "completed");
          if (result.contractType) {
            await storage.updateContract(contract.id, userId, { type: result.contractType });
          }
        })
        .catch(async (error) => {
          console.error("Analysis failed:", error);
          await storage.updateContract(contract.id, userId, { status: "error" });
        });

      res.status(201).json(contract);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Create contract from pasted text (requires auth)
  app.post("/api/contracts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
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
        userId,
      });

      // Start analysis in background
      analyzeContract(text, industryMode as IndustryMode, riskPreferences)
        .then(async (result) => {
          await storage.updateContractAnalysis(contract.id, result, "completed");
          if (result.contractType) {
            await storage.updateContract(contract.id, userId, { type: result.contractType });
          }
        })
        .catch(async (error) => {
          console.error("Analysis failed:", error);
          await storage.updateContract(contract.id, userId, { status: "error" });
        });

      res.status(201).json(contract);
    } catch (error) {
      console.error("Create error:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // Explain selected text (requires auth)
  app.post("/api/contracts/:id/explain", isAuthenticated, async (req: Request, res: Response) => {
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

  // Answer clarifying questions (requires auth)
  app.post("/api/contracts/:id/answers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const { answers } = req.body;

      const contract = await storage.getContract(id, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (!contract.analysis) {
        return res.status(400).json({ message: "No analysis to update" });
      }

      // Update status to analyzing
      await storage.updateContract(id, userId, { status: "analyzing" });

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

  // Export as PDF (requires auth)
  app.get("/api/contracts/:id/export/pdf", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const contract = await storage.getContract(id, userId);
      
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

  // Export as text (requires auth)
  app.get("/api/contracts/:id/export/text", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const contract = await storage.getContract(id, userId);
      
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

  // Purge all contracts (requires auth - must be before :id route)
  app.delete("/api/contracts/purge-all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await storage.deleteAllContracts(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Purge error:", error);
      res.status(500).json({ message: "Failed to purge contracts" });
    }
  });

  // Delete single contract (requires auth)
  app.delete("/api/contracts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      await storage.deleteContract(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Compare two contract versions (requires auth)
  app.post("/api/contracts/:id/compare", isAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const originalContract = await storage.getContract(id, userId);
      
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

      // Create the new version as a child contract (with userId)
      const newContract = await storage.createContract({
        name: `${originalContract.name} (v2)`,
        extractedText: newText,
        originalFileName: originalname,
        industryMode: originalContract.industryMode,
        parentContractId: originalContract.id,
        version: (originalContract.version || 1) + 1,
        status: "analyzing",
        userId,
      });

      // Start analysis of new version
      analyzeContract(newText, (originalContract.industryMode || "general") as IndustryMode)
        .then(async (result) => {
          await storage.updateContractAnalysis(newContract.id, result, "completed");
        })
        .catch(async (error) => {
          console.error("Analysis failed:", error);
          await storage.updateContract(newContract.id, userId, { status: "error" });
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

  // Export negotiation pack as PDF (requires auth)
  app.get("/api/contracts/:id/export/negotiation-pack", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const contract = await storage.getContract(id, userId);
      
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

  // Reanalyze with different industry mode (requires auth)
  app.post("/api/contracts/:id/reanalyze", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const { industryMode, riskPreferences } = req.body;
      
      const contract = await storage.getContract(id, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      await storage.updateContract(id, userId, { status: "analyzing", industryMode });

      // Re-analyze with new mode
      analyzeContract(contract.extractedText, industryMode as IndustryMode, riskPreferences)
        .then(async (result) => {
          await storage.updateContractAnalysis(id, result, "completed");
        })
        .catch(async (error) => {
          console.error("Reanalysis failed:", error);
          await storage.updateContract(id, userId, { status: "error" });
        });

      res.json({ success: true });
    } catch (error) {
      console.error("Reanalyze error:", error);
      res.status(500).json({ message: "Failed to reanalyze contract" });
    }
  });

  // ============================================
  // V3 - Living Legal Guardian Layer
  // ============================================

  // Quick Scan (Red Flag Shield) - instant clause analysis (requires auth)
  app.post("/api/quick-scan", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Text is required" });
      }

      // Quick analysis using AI
      const { quickAnalyzeClause } = await import("./ai");
      const analysis = await quickAnalyzeClause(text);

      // Save scan to history
      const scan = await storage.createQuickScan({
        userId,
        inputText: text,
        analysis,
      });

      res.json(scan);
    } catch (error) {
      console.error("Quick scan error:", error);
      res.status(500).json({ message: "Failed to analyze text" });
    }
  });

  // Get quick scan history (requires auth)
  app.get("/api/quick-scans", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const scans = await storage.getQuickScans(userId);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching quick scans:", error);
      res.status(500).json({ message: "Failed to fetch quick scans" });
    }
  });

  // Mark contract as signed (requires auth)
  app.post("/api/contracts/:id/sign", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = getUserId(req);
      const { counterpartyName, counterpartyEmail, signedDate, notes } = req.body;

      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Create signed contract record
      const signedContract = await storage.createSignedContract({
        contractId,
        userId,
        counterpartyName,
        counterpartyEmail,
        signedDate: signedDate ? new Date(signedDate) : new Date(),
        notes,
      });

      // Extract obligations from analysis
      if (contract.analysis) {
        const { extractObligations } = await import("./ai");
        const obligations = await extractObligations(contract.extractedText, contract.analysis);
        
        for (const obl of obligations) {
          await storage.createObligation({
            signedContractId: signedContract.id,
            title: obl.title,
            description: obl.description,
            type: obl.type,
            dueDate: obl.dueDate ? new Date(obl.dueDate) : null,
            reminderDays: obl.reminderDays || 7,
            isRecurring: obl.isRecurring || false,
            recurringInterval: obl.recurringInterval,
          });
        }
      }

      res.status(201).json(signedContract);
    } catch (error) {
      console.error("Sign contract error:", error);
      res.status(500).json({ message: "Failed to mark contract as signed" });
    }
  });

  // Get all signed contracts (requires auth)
  app.get("/api/signed-contracts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const signedContracts = await storage.getSignedContracts(userId);
      res.json(signedContracts);
    } catch (error) {
      console.error("Error fetching signed contracts:", error);
      res.status(500).json({ message: "Failed to fetch signed contracts" });
    }
  });

  // Get single signed contract with obligations (requires auth)
  app.get("/api/signed-contracts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const signedContract = await storage.getSignedContract(id, userId);
      if (!signedContract) {
        return res.status(404).json({ message: "Signed contract not found" });
      }

      const obligations = await storage.getObligations(id, userId);
      const contract = await storage.getContract(signedContract.contractId, userId);

      res.json({ ...signedContract, obligations, contract });
    } catch (error) {
      console.error("Error fetching signed contract:", error);
      res.status(500).json({ message: "Failed to fetch signed contract" });
    }
  });

  // Get upcoming obligations (requires auth)
  app.get("/api/obligations/upcoming", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const days = parseInt(req.query.days as string) || 30;
      const obligations = await storage.getUpcomingObligations(userId, days);
      res.json(obligations);
    } catch (error) {
      console.error("Error fetching upcoming obligations:", error);
      res.status(500).json({ message: "Failed to fetch obligations" });
    }
  });

  // Update obligation status (requires auth)
  app.patch("/api/obligations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const updates = req.body;
      
      if (updates.status === "completed") {
        updates.completedAt = new Date();
      }

      const updated = await storage.updateObligation(id, userId, updates);
      if (!updated) {
        return res.status(404).json({ message: "Obligation not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating obligation:", error);
      res.status(500).json({ message: "Failed to update obligation" });
    }
  });

  // Negotiation coach - get draft replies (requires auth)
  app.post("/api/negotiation-coach", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { message, contractId, context } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const { generateNegotiationReplies } = await import("./ai");
      const result = await generateNegotiationReplies(message, context);

      // Save session
      const session = await storage.createNegotiationSession({
        userId,
        contractId,
        counterpartyMessage: message,
        aiStrategy: result.strategy,
        draftReplies: result.replies,
      });

      res.json(session);
    } catch (error) {
      console.error("Negotiation coach error:", error);
      res.status(500).json({ message: "Failed to generate replies" });
    }
  });

  // Get user legal score (requires auth)
  app.get("/api/legal-score", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      let score = await storage.getUserLegalScore(userId);
      
      if (!score) {
        score = await storage.updateUserLegalScore(userId, { currentScore: 50 });
      }

      res.json(score);
    } catch (error) {
      console.error("Error fetching legal score:", error);
      res.status(500).json({ message: "Failed to fetch legal score" });
    }
  });

  // Get clause patterns (requires auth)
  app.get("/api/clause-patterns", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const clauseType = req.query.type as string | undefined;

      const patterns = clauseType
        ? await storage.getClausePatternsByType(clauseType, userId)
        : await storage.getClausePatterns(userId);

      res.json(patterns);
    } catch (error) {
      console.error("Error fetching clause patterns:", error);
      res.status(500).json({ message: "Failed to fetch clause patterns" });
    }
  });

  // Record clause decision (requires auth)
  app.post("/api/clause-patterns", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const pattern = await storage.createClausePattern({ ...req.body, userId });
      res.status(201).json(pattern);
    } catch (error) {
      console.error("Error creating clause pattern:", error);
      res.status(500).json({ message: "Failed to record clause decision" });
    }
  });

  // Get company intelligence (public - anonymized data)
  app.get("/api/company-intelligence/:name", async (req: Request, res: Response) => {
    try {
      const companyName = decodeURIComponent(req.params.name);
      const intel = await storage.getCompanyIntelligence(companyName);
      res.json(intel || { companyName, contractCount: 0 });
    } catch (error) {
      console.error("Error fetching company intel:", error);
      res.status(500).json({ message: "Failed to fetch company intelligence" });
    }
  });

  // Emergency mode (requires auth)
  app.post("/api/emergency", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { issue } = req.body;
      if (!issue) {
        return res.status(400).json({ message: "Issue description is required" });
      }

      // Get user's signed contracts
      const signedContracts = await storage.getSignedContracts(userId);
      
      // Find relevant contracts and clauses
      const { emergencyAnalysis } = await import("./ai");
      const analysis = await emergencyAnalysis(issue, signedContracts);

      res.json(analysis);
    } catch (error) {
      console.error("Emergency analysis error:", error);
      res.status(500).json({ message: "Failed to analyze emergency" });
    }
  });

  // Explain Like I'm 12 (requires auth)
  app.post("/api/explain-simple", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clauseText, riskTitle } = req.body;
      if (!clauseText) {
        return res.status(400).json({ message: "Clause text is required" });
      }

      const { explainLikeImTwelve } = await import("./ai");
      const explanation = await explainLikeImTwelve(clauseText, riskTitle);

      res.json(explanation);
    } catch (error) {
      console.error("Simple explanation error:", error);
      res.status(500).json({ message: "Failed to generate simple explanation" });
    }
  });

  // Is This Normal? (requires auth)
  app.post("/api/is-normal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clauseText, contractType, industryMode } = req.body;
      if (!clauseText) {
        return res.status(400).json({ message: "Clause text is required" });
      }

      const { isThisNormal } = await import("./ai");
      const result = await isThisNormal(clauseText, contractType || "general", industryMode);

      res.json(result);
    } catch (error) {
      console.error("Is normal check error:", error);
      res.status(500).json({ message: "Failed to check clause" });
    }
  });

  // What If? Simulator (requires auth)
  app.post("/api/what-if", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { scenario, contractId } = req.body;
      if (!scenario || !contractId) {
        return res.status(400).json({ message: "Scenario and contract ID are required" });
      }

      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const { whatIfSimulator } = await import("./ai");
      const result = await whatIfSimulator(scenario, contract.extractedText, contract.type || "general");

      res.json(result);
    } catch (error) {
      console.error("What if simulation error:", error);
      res.status(500).json({ message: "Failed to simulate scenario" });
    }
  });

  // Share-Safe Summary (requires auth)
  app.get("/api/contracts/:id/share-summary", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const contract = await storage.getContract(id, userId);
      
      if (!contract || !contract.analysis) {
        return res.status(404).json({ message: "Contract not found or not analyzed" });
      }

      const { generateShareSafeSummary } = await import("./ai");
      const summary = await generateShareSafeSummary(contract.name, contract.analysis);

      res.json(summary);
    } catch (error) {
      console.error("Share summary error:", error);
      res.status(500).json({ message: "Failed to generate shareable summary" });
    }
  });

  // Get upcoming contract expirations (requires auth)
  app.get("/api/expiry-radar", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const days = parseInt(req.query.days as string) || 30;
      
      const signedContracts = await storage.getSignedContracts(userId);
      const upcomingObligations = await storage.getUpcomingObligations(userId, days);
      
      // Filter for renewal and termination window obligations
      const expiryAlerts = upcomingObligations.filter(o => 
        o.type === 'renewal' || o.type === 'termination_window'
      );

      res.json({
        alerts: expiryAlerts,
        activeContracts: signedContracts.filter(sc => sc.status === 'active').length,
      });
    } catch (error) {
      console.error("Expiry radar error:", error);
      res.status(500).json({ message: "Failed to check expiry radar" });
    }
  });

  return httpServer;
}
