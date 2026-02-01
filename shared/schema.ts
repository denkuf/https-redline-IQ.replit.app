import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (for future auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Industry modes for contract analysis
export const industryModes = [
  "general",
  "rent_lease",
  "employment",
  "freelance",
  "insurance",
  "saas_subscription",
  "small_business",
] as const;

export type IndustryMode = typeof industryModes[number];

export const industryModeLabels: Record<IndustryMode, string> = {
  general: "General",
  rent_lease: "Rent / Lease",
  employment: "Employment",
  freelance: "Freelance / Contractor",
  insurance: "Insurance",
  saas_subscription: "SaaS / Subscription",
  small_business: "Small Business / Vendor",
};

// Negotiation suggestion schema
export const negotiationSuggestionSchema = z.object({
  whatItDoes: z.string(),
  whyItsRisky: z.string(),
  suggestedChangePlain: z.string(),
  suggestedChangeFormal: z.string().optional(),
  negotiationScript: z.string(),
});

export type NegotiationSuggestion = z.infer<typeof negotiationSuggestionSchema>;

// Enhanced risk flag schema with negotiation
export const riskFlagSchema = z.object({
  title: z.string(),
  severity: z.enum(["Low", "Medium", "High"]),
  explanation: z.string(),
  clauseQuote: z.string(),
  clauseReference: z.string(),
  confidence: z.number().min(0).max(1),
  isStandard: z.boolean().optional(), // Whether this is "commonly seen" in this contract type
  negotiation: negotiationSuggestionSchema.optional(),
});

export type RiskFlag = z.infer<typeof riskFlagSchema>;

// Key term schema
export const keyTermSchema = z.object({
  category: z.string(),
  value: z.string(),
  notes: z.string().optional(),
});

export type KeyTerm = z.infer<typeof keyTermSchema>;

// Clarifying question schema
export const clarifyingQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
});

export type ClarifyingQuestion = z.infer<typeof clarifyingQuestionSchema>;

// Summary schema
export const summarySchema = z.object({
  whatItIs: z.string(),
  partiesInvolved: z.array(z.string()),
  userObligations: z.array(z.string()),
  otherPartyObligations: z.array(z.string()),
  datesAndTerms: z.string().optional(),
});

export type Summary = z.infer<typeof summarySchema>;

// Verdict schema - "Should I Sign This?"
export const verdictSchema = z.object({
  riskScore: z.number().min(0).max(100),
  verdict: z.enum(["Safe", "Caution", "High Risk", "Do Not Sign"]),
  topRisks: z.array(z.object({
    title: z.string(),
    clauseReference: z.string(),
    severity: z.enum(["Low", "Medium", "High"]),
  })).max(3),
  negotiationPriorities: z.array(z.string()).max(3),
  reasoning: z.string(),
});

export type Verdict = z.infer<typeof verdictSchema>;

// Analysis result schema
export const analysisResultSchema = z.object({
  summary: summarySchema,
  keyTerms: z.array(keyTermSchema),
  riskFlags: z.array(riskFlagSchema),
  clarifyingQuestions: z.array(clarifyingQuestionSchema).optional(),
  overallAssessment: z.string().optional(),
  verdict: verdictSchema.optional(),
  industryMode: z.enum(industryModes).optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// User risk preferences schema
export const riskPreferencesSchema = z.object({
  riskTolerance: z.enum(["risk_averse", "moderate", "risk_tolerant"]).default("moderate"),
  prioritizeFlexibility: z.boolean().default(false),
  tolerateArbitration: z.boolean().default(false),
  wantEasyTermination: z.boolean().default(true),
});

export type RiskPreferences = z.infer<typeof riskPreferencesSchema>;

// Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default("unknown"),
  industryMode: text("industry_mode").default("general"),
  originalFileName: text("original_file_name"),
  extractedText: text("extracted_text").notNull(),
  analysis: jsonb("analysis").$type<AnalysisResult | null>(),
  status: text("status").default("pending"), // pending, analyzing, completed, error
  parentContractId: integer("parent_contract_id"), // For version comparison
  version: integer("version").default(1),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

// User settings table with risk preferences
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  notificationsEnabled: text("notifications_enabled").default("true"),
  autoDeleteDays: integer("auto_delete_days").default(30),
  riskPreferences: jsonb("risk_preferences").$type<RiskPreferences | null>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;

// ============================================
// V3 - Living Legal Guardian Layer
// ============================================

// Clause patterns - tracks what clauses users accept/reject for personal legal memory
export const clausePatterns = pgTable("clause_patterns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  contractId: integer("contract_id").references(() => contracts.id),
  clauseType: text("clause_type").notNull(), // e.g., "non-compete", "termination", "arbitration"
  clauseText: text("clause_text").notNull(),
  action: text("action").notNull(), // "accepted", "rejected", "negotiated"
  severity: text("severity"), // "Low", "Medium", "High"
  industryMode: text("industry_mode"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ClausePattern = typeof clausePatterns.$inferSelect;

// Signed contracts - for contract monitoring after signing
export const signedContracts = pgTable("signed_contracts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  signedDate: timestamp("signed_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  counterpartyName: text("counterparty_name"),
  counterpartyEmail: text("counterparty_email"),
  status: text("status").default("active"), // active, expired, terminated
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type SignedContract = typeof signedContracts.$inferSelect;

// Contract obligations - deadlines and deliverables to track
export const contractObligations = pgTable("contract_obligations", {
  id: serial("id").primaryKey(),
  signedContractId: integer("signed_contract_id").references(() => signedContracts.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "payment", "deliverable", "renewal", "termination_window", "deadline"
  dueDate: timestamp("due_date"),
  reminderDays: integer("reminder_days").default(7), // Days before to remind
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: text("recurring_interval"), // "daily", "weekly", "monthly", "yearly"
  status: text("status").default("pending"), // pending, completed, missed, dismissed
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ContractObligation = typeof contractObligations.$inferSelect;

// Company intelligence - anonymized patterns about companies
export const companyIntelligence = pgTable("company_intelligence", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  normalizedName: text("normalized_name").notNull(), // lowercase, trimmed for matching
  contractCount: integer("contract_count").default(1),
  commonClauses: jsonb("common_clauses").$type<string[]>(), // Frequently seen clause types
  frequentlyNegotiated: jsonb("frequently_negotiated").$type<string[]>(), // Clauses users often negotiate
  averageRiskScore: integer("average_risk_score"),
  redFlags: jsonb("red_flags").$type<string[]>(), // Common concerns reported
  lastUpdated: timestamp("last_updated").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type CompanyIntelligence = typeof companyIntelligence.$inferSelect;

// User legal score - gamified protection tracking
export const userLegalScore = pgTable("user_legal_score", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  currentScore: integer("current_score").default(50), // 0-100 scale
  contractsAnalyzed: integer("contracts_analyzed").default(0),
  contractsSigned: integer("contracts_signed").default(0),
  risksAvoided: integer("risks_avoided").default(0),
  clausesNegotiated: integer("clauses_negotiated").default(0),
  obligationsMet: integer("obligations_met").default(0),
  obligationsMissed: integer("obligations_missed").default(0),
  scoreHistory: jsonb("score_history").$type<{ date: string; score: number; reason: string }[]>(),
  lastUpdated: timestamp("last_updated").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type UserLegalScore = typeof userLegalScore.$inferSelect;

// Quick scans - for Red Flag Shield instant analysis
export const quickScans = pgTable("quick_scans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  inputText: text("input_text").notNull(),
  analysis: jsonb("analysis").$type<{
    riskLevel: "safe" | "caution" | "danger";
    flags: { issue: string; explanation: string; severity: string }[];
    summary: string;
  }>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type QuickScan = typeof quickScans.$inferSelect;

// Negotiation sessions - for Live Negotiation Coach
export const negotiationSessions = pgTable("negotiation_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  contractId: integer("contract_id").references(() => contracts.id),
  counterpartyMessage: text("counterparty_message").notNull(),
  aiStrategy: text("ai_strategy"),
  draftReplies: jsonb("draft_replies").$type<{ tone: string; message: string }[]>(),
  selectedReply: text("selected_reply"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type NegotiationSession = typeof negotiationSessions.$inferSelect;

// Insert schemas for V3 tables
export const insertClausePatternSchema = createInsertSchema(clausePatterns).omit({
  id: true,
  createdAt: true,
});

export const insertSignedContractSchema = createInsertSchema(signedContracts).omit({
  id: true,
  createdAt: true,
});

export const insertContractObligationSchema = createInsertSchema(contractObligations).omit({
  id: true,
  createdAt: true,
});

export const insertQuickScanSchema = createInsertSchema(quickScans).omit({
  id: true,
  createdAt: true,
});

export const insertNegotiationSessionSchema = createInsertSchema(negotiationSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertClausePattern = z.infer<typeof insertClausePatternSchema>;
export type InsertSignedContract = z.infer<typeof insertSignedContractSchema>;
export type InsertContractObligation = z.infer<typeof insertContractObligationSchema>;
export type InsertQuickScan = z.infer<typeof insertQuickScanSchema>;
export type InsertNegotiationSession = z.infer<typeof insertNegotiationSessionSchema>;
