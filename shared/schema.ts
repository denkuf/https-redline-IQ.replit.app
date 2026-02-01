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
