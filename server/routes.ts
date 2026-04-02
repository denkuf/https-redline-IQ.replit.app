import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { analyzeContract, analyzeContractChunked, explainClause, reanalyzeWithAnswers, compareContracts } from "./ai";
import { parseFile, parseFileWithQuality, generateContractName } from "./fileParser";
import { generatePdfExport, generateTextExport, generateNegotiationPackPdf } from "./export";
import { registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import type { IndustryMode, RiskPreferences } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

const uploadMulti = upload.fields([
  { name: "files", maxCount: 5 },
  { name: "file", maxCount: 1 },
]);

// Helper to get userId from authenticated session
function getUserId(req: Request): string {
  return (req.session as any).userId;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup session middleware BEFORE auth routes
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.set("trust proxy", 1);
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  }));

  // Register auth routes (login, register, logout, user)
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

  // Upload file(s) and create contract (requires auth) — supports up to 5 files
  app.post("/api/contracts/upload", isAuthenticated, uploadMulti, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const industryMode = (req.body.industryMode || "general") as IndustryMode;
      const riskPreferences = req.body.riskPreferences ? JSON.parse(req.body.riskPreferences) : undefined;
      const userContext = req.body.context ? String(req.body.context).trim() : undefined;

      // Collect all uploaded files (multi-file "files" field + legacy single "file" field)
      const fileFields = req.files as Record<string, Express.Multer.File[]> | undefined;
      const multiFiles = fileFields?.files || [];
      const legacyFile = fileFields?.file?.[0];
      const allFiles = multiFiles.length > 0 ? multiFiles : legacyFile ? [legacyFile] : [];

      if (allFiles.length === 0) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse each file and concatenate text with section headers
      let combinedText = "";
      let anyLowQuality = false;
      const primaryFilename = allFiles[0].originalname;

      for (const f of allFiles) {
        const { text, lowQuality } = await parseFileWithQuality(f.buffer, f.mimetype, f.originalname);
        if (lowQuality) anyLowQuality = true;
        if (!text.trim()) continue;
        combinedText += allFiles.length > 1
          ? `\n\n[FILE: ${f.originalname}]\n${text}`
          : text;
      }

      if (!combinedText.trim()) {
        return res.status(400).json({ message: "Could not extract text from the uploaded file(s)" });
      }

      const name = generateContractName(combinedText, primaryFilename);

      // Combine user context with contract text for AI
      const textForAnalysis = userContext
        ? `[USER CONTEXT]\n${userContext}\n\n[CONTRACT TEXT]\n${combinedText}`
        : combinedText;

      // Create contract record
      const contract = await storage.createContract({
        name,
        extractedText: combinedText,
        originalFileName: primaryFilename,
        industryMode,
        status: "analyzing",
        userId,
      });

      // Chunked analysis in background (handles any contract length)
      analyzeContractChunked(textForAnalysis, industryMode, riskPreferences)
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

      res.status(201).json({ ...contract, lowQualityWarning: anyLowQuality });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Create contract from pasted text (requires auth)
  app.post("/api/contracts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { text, industryMode = "general", riskPreferences, context } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Contract text is required" });
      }

      const userContext = context && typeof context === "string" ? context.trim() : undefined;

      const name = generateContractName(text);

      // Combine user context with contract text for AI — context goes first so it frames the analysis
      const textForAnalysis = userContext
        ? `[USER CONTEXT]\n${userContext}\n\n[CONTRACT TEXT]\n${text}`
        : text;

      const contract = await storage.createContract({
        name,
        extractedText: text,
        industryMode,
        status: "analyzing",
        userId,
      });

      // Start chunked analysis in background (handles any contract length)
      analyzeContractChunked(textForAnalysis, industryMode as IndustryMode, riskPreferences)
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

      // Start analysis of new version (chunked to handle long contracts)
      analyzeContractChunked(newText, (originalContract.industryMode || "general") as IndustryMode)
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

      // Re-analyze with new mode (chunked to handle long contracts)
      analyzeContractChunked(contract.extractedText, industryMode as IndustryMode, riskPreferences)
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
  app.post("/api/negotiation-coach", isAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      let { message, contractId, context } = req.body;

      if (req.file) {
        const { parseFile } = await import("./fileParser");
        const extractedText = await parseFile(req.file.buffer, req.file.mimetype, req.file.originalname);
        message = message ? `${message}\n\n${extractedText}` : extractedText;
      }

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
  app.post("/api/emergency", isAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      let { issue } = req.body;

      if (req.file) {
        const { parseFile } = await import("./fileParser");
        const extractedText = await parseFile(req.file.buffer, req.file.mimetype, req.file.originalname);
        issue = issue ? `${issue}\n\n${extractedText}` : extractedText;
      }

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

  // ============================================
  // V2 - Life Command Center + New Features
  // ============================================

  // Command Center - aggregated dashboard data
  app.get("/api/command-center", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      const [guardianAlerts, recentScans, recentChats, recurringObs, allContracts, legalScore] = await Promise.all([
        storage.getGuardianAlerts(userId),
        storage.getQuickScans(userId),
        storage.getAdvocateMessages(userId, 10),
        storage.getRecurringObligations(userId),
        storage.getAllContracts(userId),
        storage.getUserLegalScore(userId),
      ]);

      res.json({
        alerts: guardianAlerts,
        recentScans: recentScans.slice(0, 5),
        recentChats: recentChats.slice(-5),
        recurringObligations: recurringObs.filter(r => r.status === "active"),
        contractsCount: allContracts.length,
        analyzedCount: allContracts.filter(c => c.status === "completed").length,
        legalScore: legalScore?.currentScore || 50,
      });
    } catch (error) {
      console.error("Command center error:", error);
      res.status(500).json({ message: "Failed to load command center" });
    }
  });

  // Screenshot Intelligence - analyze uploaded image/screenshot
  app.post("/api/screenshot-intelligence", isAuthenticated, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      let text = req.body.text || "";
      let inputType = "text";
      let sourceFileName: string | undefined;

      if (req.file) {
        const { buffer, mimetype, originalname } = req.file;
        sourceFileName = originalname;
        inputType = mimetype.startsWith("image/") ? "image" : "file";
        
        const { parseFile } = await import("./fileParser");
        text = await parseFile(buffer, mimetype, originalname);
      }

      if (!text?.trim()) {
        return res.status(400).json({ message: "No text could be extracted" });
      }

      const { screenshotIntelligence } = await import("./ai");
      const analysis = await screenshotIntelligence(text, inputType);

      const scan = await storage.createQuickScan({
        userId,
        inputText: text,
        inputType,
        sourceFileName,
        analysis,
      });

      res.json(scan);
    } catch (error) {
      console.error("Screenshot intelligence error:", error);
      res.status(500).json({ message: "Failed to analyze" });
    }
  });

  // Advocate Chat - send message
  app.post("/api/advocate-chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Save user message
      await storage.createAdvocateMessage({
        userId,
        role: "user",
        content: message,
      });

      // Gather context
      const [allContracts, obligations, recurringObs, memories, chatHistory] = await Promise.all([
        storage.getAllContracts(userId),
        storage.getUpcomingObligations(userId, 60),
        storage.getRecurringObligations(userId),
        storage.getUserMemory(userId),
        storage.getAdvocateMessages(userId, 30),
      ]);

      const context = {
        contracts: allContracts.slice(0, 10).map(c => ({
          name: c.name,
          type: c.type || "unknown",
          riskScore: (c.analysis as any)?.verdict?.riskScore,
          status: c.status || "unknown",
        })),
        obligations: obligations.map(o => ({
          title: o.title,
          dueDate: o.dueDate?.toISOString(),
          status: o.status || "pending",
          type: o.type,
        })),
        recurringObligations: recurringObs.filter(r => r.status === "active").map(r => ({
          title: r.title,
          category: r.category,
          nextDueDate: r.nextDueDate?.toISOString(),
          amount: r.amount || undefined,
          provider: r.provider || undefined,
        })),
        memories: memories.slice(0, 20).map(m => ({
          category: m.category,
          title: m.title,
          content: m.content,
        })),
      };

      const { advocateChat: chatFn } = await import("./ai");
      const result = await chatFn(
        message,
        chatHistory.map(m => ({ role: m.role, content: m.content })),
        context
      );

      // Save assistant response
      const assistantMsg = await storage.createAdvocateMessage({
        userId,
        role: "assistant",
        content: result.response,
        metadata: {
          referencedContracts: result.referencedContracts,
        },
      });

      // Auto-save memory if AI suggests one
      if (result.memoryUpdate) {
        await storage.createUserMemory({
          userId,
          category: result.memoryUpdate.category,
          title: result.memoryUpdate.title,
          content: result.memoryUpdate.content,
          source: "advocate_chat",
        });
      }

      res.json(assistantMsg);
    } catch (error) {
      console.error("Advocate chat error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Get advocate chat history
  app.get("/api/advocate-chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const messages = await storage.getAdvocateMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // Clear advocate chat
  app.delete("/api/advocate-chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await storage.clearAdvocateMessages(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing chat:", error);
      res.status(500).json({ message: "Failed to clear chat" });
    }
  });

  // User Memory CRUD
  app.get("/api/memory", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const category = req.query.category as string | undefined;
      const memories = await storage.getUserMemory(userId, category);
      res.json(memories);
    } catch (error) {
      console.error("Error fetching memory:", error);
      res.status(500).json({ message: "Failed to fetch memory" });
    }
  });

  app.post("/api/memory", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { category, title, content, source } = req.body;
      if (!category || !title || !content) {
        return res.status(400).json({ message: "Category, title, and content are required" });
      }
      const entry = await storage.createUserMemory({ userId, category, title, content, source });
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating memory:", error);
      res.status(500).json({ message: "Failed to create memory" });
    }
  });

  app.delete("/api/memory/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      await storage.deleteUserMemory(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting memory:", error);
      res.status(500).json({ message: "Failed to delete memory" });
    }
  });

  // Recurring Obligations CRUD
  app.get("/api/recurring-obligations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const obligations = await storage.getRecurringObligations(userId);
      res.json(obligations);
    } catch (error) {
      console.error("Error fetching recurring obligations:", error);
      res.status(500).json({ message: "Failed to fetch recurring obligations" });
    }
  });

  app.post("/api/recurring-obligations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { title, description, category, amount, frequency, nextDueDate, provider, autoRenew, cancellationNoticeDays, exitWindowStart, exitWindowEnd, penaltyForMissing, linkedContractId, notes } = req.body;
      if (!title || !category || !frequency) {
        return res.status(400).json({ message: "Title, category, and frequency are required" });
      }
      const obligation = await storage.createRecurringObligation({
        userId,
        title,
        description,
        category,
        amount,
        frequency,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        provider,
        autoRenew: autoRenew || false,
        cancellationNoticeDays,
        exitWindowStart: exitWindowStart ? new Date(exitWindowStart) : null,
        exitWindowEnd: exitWindowEnd ? new Date(exitWindowEnd) : null,
        penaltyForMissing,
        linkedContractId,
        notes,
      });
      res.status(201).json(obligation);
    } catch (error) {
      console.error("Error creating recurring obligation:", error);
      res.status(500).json({ message: "Failed to create recurring obligation" });
    }
  });

  app.patch("/api/recurring-obligations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      const updates = req.body;
      if (updates.nextDueDate) updates.nextDueDate = new Date(updates.nextDueDate);
      if (updates.exitWindowStart) updates.exitWindowStart = new Date(updates.exitWindowStart);
      if (updates.exitWindowEnd) updates.exitWindowEnd = new Date(updates.exitWindowEnd);
      const updated = await storage.updateRecurringObligation(id, userId, updates);
      if (!updated) {
        return res.status(404).json({ message: "Recurring obligation not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating recurring obligation:", error);
      res.status(500).json({ message: "Failed to update recurring obligation" });
    }
  });

  app.delete("/api/recurring-obligations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      await storage.deleteRecurringObligation(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recurring obligation:", error);
      res.status(500).json({ message: "Failed to delete recurring obligation" });
    }
  });

  // ============================================
  // V1 Release - Sticky Features
  // ============================================

  // Notifications - list
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotifications(userId, limit);
      const unreadCount = await storage.getUnreadNotificationCount(userId);
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Notifications - mark read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  // Notifications - mark all read
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Failed to mark all notifications read" });
    }
  });

  // Notifications - generate deadline reminders on demand
  app.post("/api/notifications/generate-reminders", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const alerts = await storage.getGuardianAlerts(userId);
      let created = 0;

      for (const item of [...alerts.urgent, ...alerts.dueSoon]) {
        await storage.createNotification({
          userId,
          type: "deadline_reminder",
          title: item.title || "Upcoming Deadline",
          message: item.alertReason || "You have an upcoming deadline",
          relatedId: item.id,
          relatedType: item.itemType || "obligation",
        });
        created++;
      }

      res.json({ created });
    } catch (error) {
      console.error("Error generating reminders:", error);
      res.status(500).json({ message: "Failed to generate reminders" });
    }
  });

  // Favorites - list
  app.get("/api/favorites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  // Favorites - check
  app.get("/api/favorites/:contractId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const contractId = parseInt(req.params.contractId);
      const isFav = await storage.isFavorite(userId, contractId);
      res.json({ isFavorite: isFav });
    } catch (error) {
      console.error("Error checking favorite:", error);
      res.status(500).json({ message: "Failed to check favorite" });
    }
  });

  // Favorites - add
  app.post("/api/favorites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { contractId } = req.body;
      if (!contractId) {
        return res.status(400).json({ message: "Contract ID is required" });
      }
      const favorite = await storage.addFavorite({ userId, contractId });
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  // Favorites - remove
  app.delete("/api/favorites/:contractId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const contractId = parseInt(req.params.contractId);
      await storage.removeFavorite(userId, contractId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Share links - create
  app.post("/api/share-links", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { contractId } = req.body;
      if (!contractId) {
        return res.status(400).json({ message: "Contract ID is required" });
      }

      const contract = await storage.getContract(contractId, userId);
      if (!contract || !contract.analysis) {
        return res.status(404).json({ message: "Contract not found or not analyzed" });
      }

      const analysis = contract.analysis as any;
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");

      const summary = {
        contractName: contract.name,
        verdict: analysis.verdict?.verdict || "Unknown",
        riskScore: analysis.verdict?.riskScore || 0,
        topRisks: analysis.verdict?.topRisks?.map((r: any) => r.title) || [],
        keyPoints: [
          analysis.summary?.whatItIs || "",
          ...(analysis.summary?.userObligations?.slice(0, 2) || []),
        ].filter(Boolean),
        recommendation: analysis.verdict?.reasoning || analysis.overallAssessment || "",
      };

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const link = await storage.createShareLink({
        userId,
        contractId,
        token,
        summary,
        expiresAt,
      });

      res.status(201).json(link);
    } catch (error) {
      console.error("Error creating share link:", error);
      res.status(500).json({ message: "Failed to create share link" });
    }
  });

  // Share links - list user's links
  app.get("/api/share-links", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const links = await storage.getShareLinks(userId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching share links:", error);
      res.status(500).json({ message: "Failed to fetch share links" });
    }
  });

  // Share links - public view (no auth required)
  app.get("/api/shared/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const link = await storage.getShareLinkByToken(token);
      if (!link) {
        return res.status(404).json({ message: "Share link not found" });
      }
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ message: "Share link has expired" });
      }
      await storage.incrementShareLinkViews(token);
      res.json({ summary: link.summary, createdAt: link.createdAt, viewCount: (link.viewCount || 0) + 1 });
    } catch (error) {
      console.error("Error fetching shared summary:", error);
      res.status(500).json({ message: "Failed to fetch shared summary" });
    }
  });

  // Templates - list
  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Templates - single
  app.get("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  // Templates - use template (creates contract from template)
  app.post("/api/templates/:id/use", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const id = parseInt(req.params.id);
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const contract = await storage.createContract({
        name: `${template.name} (from template)`,
        extractedText: template.content,
        industryMode: template.industryMode || "general",
        status: "analyzing",
        userId,
      });

      analyzeContract(template.content, (template.industryMode || "general") as IndustryMode)
        .then(async (result) => {
          await storage.updateContractAnalysis(contract.id, result, "completed");
        })
        .catch(async (error) => {
          console.error("Template analysis failed:", error);
          await storage.updateContract(contract.id, userId, { status: "error" });
        });

      res.status(201).json(contract);
    } catch (error) {
      console.error("Error using template:", error);
      res.status(500).json({ message: "Failed to use template" });
    }
  });

  // Weekly Legal Health Digest - computed on demand
  app.get("/api/digest", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const [alerts, contracts, recurringObs, legalScore, signedContracts] = await Promise.all([
        storage.getGuardianAlerts(userId),
        storage.getAllContracts(userId),
        storage.getRecurringObligations(userId),
        storage.getUserLegalScore(userId),
        storage.getSignedContracts(userId),
      ]);

      const activeRecurring = recurringObs.filter(r => r.status === "active");
      const recentContracts = contracts.filter(c => {
        const created = new Date(c.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return created >= weekAgo;
      });

      res.json({
        legalScore: legalScore?.currentScore || 50,
        urgentAlerts: alerts.urgent.length,
        dueSoonAlerts: alerts.dueSoon.length,
        activeObligations: activeRecurring.length,
        contractsAnalyzedThisWeek: recentContracts.length,
        totalContracts: contracts.length,
        activeSignedContracts: signedContracts.filter(s => s.status === "active").length,
        upcomingDeadlines: [...alerts.urgent, ...alerts.dueSoon].slice(0, 10),
        autoRenewWarnings: activeRecurring.filter(r => r.autoRenew && r.exitWindowEnd).map(r => ({
          title: r.title,
          provider: r.provider,
          exitWindowEnd: r.exitWindowEnd,
          cancellationNoticeDays: r.cancellationNoticeDays,
        })),
      });
    } catch (error) {
      console.error("Error generating digest:", error);
      res.status(500).json({ message: "Failed to generate digest" });
    }
  });

  // Contract version comparison (re-analysis)
  app.get("/api/contracts/:id/versions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userId = getUserId(req);
      const contract = await storage.getContract(id, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const allContracts = await storage.getAllContracts(userId);
      const versions = allContracts.filter(c =>
        c.id === id || c.parentContractId === id || (contract.parentContractId && c.parentContractId === contract.parentContractId) || c.id === contract.parentContractId
      ).sort((a, b) => (a.version || 1) - (b.version || 1));

      res.json(versions);
    } catch (error) {
      console.error("Error fetching versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  // Guardian alerts
  app.get("/api/guardian-alerts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const alerts = await storage.getGuardianAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching guardian alerts:", error);
      res.status(500).json({ message: "Failed to fetch guardian alerts" });
    }
  });

  return httpServer;
}
