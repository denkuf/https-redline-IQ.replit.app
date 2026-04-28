import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (users, sessions)
export * from "./models/auth";
import { users } from "./models/auth";

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
  standardNote: z.string().optional(), // What makes it standard, e.g. "30-day notice is the SaaS industry norm"
  unusualNote: z.string().optional(), // Why it stands out, e.g. "90-day notice heavily favours the vendor"
  negotiation: negotiationSuggestionSchema.optional(),
});

export type RiskFlag = z.infer<typeof riskFlagSchema>;

// Missing clause schema — clauses that should be present but are absent
export const missingClauseSchema = z.object({
  clauseName: z.string(),
  whyItMatters: z.string(),
  severity: z.enum(["Low", "Medium", "High"]),
  sampleLanguage: z.string(),
});

export type MissingClause = z.infer<typeof missingClauseSchema>;

// Annotated clause schema — clause-by-clause reader segmentation
export const annotatedClauseSchema = z.object({
  name: z.string(),
  originalText: z.string(),
  plainEnglish: z.string(),
  riskLevel: z.enum(["safe", "caution", "high", "flagged"]),
  isStandard: z.boolean(),
  linkedRiskFlagTitles: z.array(z.string()),
});

export type AnnotatedClause = z.infer<typeof annotatedClauseSchema>;

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
  // Validation pass metadata (set by secondary AI review)
  scoreAdjustmentReason: z.string().nullable().optional(),
  scoreUncertain: z.boolean().optional(),
});

export type Verdict = z.infer<typeof verdictSchema>;

// Redline schema — a single tracked-change edit produced by the Smart Redline Generator
export const redlineSchema = z.object({
  id: z.number(),
  originalText: z.string(),
  replacementText: z.string(),
  reason: z.string(),
  riskFlagTitle: z.string().optional(),
});

export type Redline = z.infer<typeof redlineSchema>;

// Analysis result schema
export const analysisResultSchema = z.object({
  summary: summarySchema,
  keyTerms: z.array(keyTermSchema),
  riskFlags: z.array(riskFlagSchema),
  missingClauses: z.array(missingClauseSchema).optional(),
  clauses: z.array(annotatedClauseSchema).optional(),
  redlines: z.array(redlineSchema).optional(),
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
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  type: text("type").default("unknown"),
  industryMode: text("industry_mode").default("general"),
  jurisdiction: text("jurisdiction"), // e.g. "United States — California" or "United Kingdom"
  originalFileName: text("original_file_name"),
  extractedText: text("extracted_text").notNull(),
  analysis: jsonb("analysis").$type<AnalysisResult | null>(),
  status: text("status").default("pending"), // pending, analyzing, completed, error
  parentContractId: integer("parent_contract_id"), // For version comparison
  version: integer("version").default(1),
  analysedAt: timestamp("analysed_at"), // When AI analysis was last run
  riskPreferences: jsonb("risk_preferences").$type<RiskPreferences | null>(), // Preferences used at analysis time
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
  userId: varchar("user_id").references(() => users.id),
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

// Screenshot Intelligence analysis result
export interface ScreenshotAnalysis {
  whatItIs: string;
  whyItMatters: string;
  whatToDoNext: string;
  deadline: string | null;
  consequenceOfIgnoring: string;
  whatsTheCatch: string | null;
  riskLevel: "safe" | "caution" | "danger";
  flags: { issue: string; explanation: string; severity: string }[];
  summary: string;
}

// Quick scans - Screenshot Intelligence + Universal Clarity Engine
export const quickScans = pgTable("quick_scans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  inputText: text("input_text").notNull(),
  inputType: text("input_type").default("text"),
  sourceFileName: text("source_file_name"),
  analysis: jsonb("analysis").$type<ScreenshotAnalysis>(),
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

// ============================================
// V2 - Life Command Center Layer
// ============================================

// Advocate chat messages - Ask-Anytime Advocate
export const advocateMessages = pgTable("advocate_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    referencedContracts?: number[];
    referencedObligations?: number[];
    memoryUsed?: string[];
  }>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type AdvocateMessage = typeof advocateMessages.$inferSelect;

// User memory - Legal & Life Memory Engine
export const userMemory = pgTable("user_memory", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source"),
  sourceId: integer("source_id"),
  importance: text("importance").default("normal"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type UserMemoryEntry = typeof userMemory.$inferSelect;

// Recurring obligations - extends beyond contracts to real life
export const recurringObligations = pgTable("recurring_obligations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  amount: text("amount"),
  frequency: text("frequency").notNull(),
  nextDueDate: timestamp("next_due_date"),
  provider: text("provider"),
  autoRenew: boolean("auto_renew").default(false),
  cancellationNoticeDays: integer("cancellation_notice_days"),
  exitWindowStart: timestamp("exit_window_start"),
  exitWindowEnd: timestamp("exit_window_end"),
  penaltyForMissing: text("penalty_for_missing"),
  linkedContractId: integer("linked_contract_id").references(() => contracts.id),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type RecurringObligation = typeof recurringObligations.$inferSelect;

// ============================================
// V1 Release - Sticky Features
// ============================================

// In-app notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"),
  relatedType: text("related_type"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// Contract favorites / pinned contracts
export const contractFavorites = pgTable("contract_favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ContractFavorite = typeof contractFavorites.$inferSelect;

// Shareable summary links
export const shareLinks = pgTable("share_links", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  summary: jsonb("summary").$type<{
    contractName: string;
    verdict: string;
    riskScore: number;
    topRisks: string[];
    keyPoints: string[];
    recommendation: string;
  }>(),
  expiresAt: timestamp("expires_at"),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ShareLink = typeof shareLinks.$inferSelect;

// Contract templates
export const contractTemplates = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  industryMode: text("industry_mode").default("general"),
  commonRedFlags: jsonb("common_red_flags").$type<string[]>(),
  annotations: jsonb("annotations").$type<{ section: string; note: string; riskLevel: string }[]>(),
  isDefault: boolean("is_default").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type ContractTemplate = typeof contractTemplates.$inferSelect;

// Insert schemas for all tables
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

export const insertAdvocateMessageSchema = createInsertSchema(advocateMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUserMemorySchema = createInsertSchema(userMemory).omit({
  id: true,
  createdAt: true,
});

export const insertRecurringObligationSchema = createInsertSchema(recurringObligations).omit({
  id: true,
  createdAt: true,
});

export type InsertClausePattern = z.infer<typeof insertClausePatternSchema>;
export type InsertSignedContract = z.infer<typeof insertSignedContractSchema>;
export type InsertContractObligation = z.infer<typeof insertContractObligationSchema>;
export type InsertQuickScan = z.infer<typeof insertQuickScanSchema>;
export type InsertNegotiationSession = z.infer<typeof insertNegotiationSessionSchema>;
export type InsertAdvocateMessage = z.infer<typeof insertAdvocateMessageSchema>;
export type InsertUserMemory = z.infer<typeof insertUserMemorySchema>;
export type InsertRecurringObligation = z.infer<typeof insertRecurringObligationSchema>;

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertContractFavoriteSchema = createInsertSchema(contractFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertShareLinkSchema = createInsertSchema(shareLinks).omit({
  id: true,
  createdAt: true,
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertContractFavorite = z.infer<typeof insertContractFavoriteSchema>;
export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
