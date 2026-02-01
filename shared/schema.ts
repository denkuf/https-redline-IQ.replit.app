import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
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

// Risk flag schema
export const riskFlagSchema = z.object({
  title: z.string(),
  severity: z.enum(["Low", "Medium", "High"]),
  explanation: z.string(),
  clauseQuote: z.string(),
  clauseReference: z.string(),
  confidence: z.number().min(0).max(1),
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

// Analysis result schema
export const analysisResultSchema = z.object({
  summary: summarySchema,
  keyTerms: z.array(keyTermSchema),
  riskFlags: z.array(riskFlagSchema),
  clarifyingQuestions: z.array(clarifyingQuestionSchema).optional(),
  overallAssessment: z.string().optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default("unknown"),
  originalFileName: text("original_file_name"),
  extractedText: text("extracted_text").notNull(),
  analysis: jsonb("analysis").$type<AnalysisResult | null>(),
  status: text("status").default("pending"), // pending, analyzing, completed, error
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

// User settings table
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  notificationsEnabled: text("notifications_enabled").default("true"),
  autoDeleteDays: integer("auto_delete_days").default(30),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
