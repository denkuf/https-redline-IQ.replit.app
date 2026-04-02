import { db } from "./db";
import { 
  contracts, 
  clausePatterns,
  signedContracts,
  contractObligations,
  companyIntelligence,
  userLegalScore,
  quickScans,
  negotiationSessions,
  userSettings,
  advocateMessages,
  userMemory,
  recurringObligations,
  notifications,
  contractFavorites,
  shareLinks,
  contractTemplates,
  type Contract, 
  type InsertContract, 
  type AnalysisResult,
  type ClausePattern,
  type InsertClausePattern,
  type SignedContract,
  type InsertSignedContract,
  type ContractObligation,
  type InsertContractObligation,
  type QuickScan,
  type InsertQuickScan,
  type NegotiationSession,
  type InsertNegotiationSession,
  type CompanyIntelligence,
  type UserLegalScore,
  type AdvocateMessage,
  type InsertAdvocateMessage,
  type UserMemoryEntry,
  type InsertUserMemory,
  type RecurringObligation,
  type InsertRecurringObligation,
  type Notification,
  type InsertNotification,
  type ContractFavorite,
  type InsertContractFavorite,
  type ShareLink,
  type InsertShareLink,
  type ContractTemplate,
  type InsertContractTemplate,
} from "@shared/schema";
import { eq, desc, like, sql, and, gte, lte, or } from "drizzle-orm";

export interface IStorage {
  // Contract operations (all require userId for data isolation)
  getContract(id: number, userId: string): Promise<Contract | undefined>;
  getAllContracts(userId: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, userId: string, updates: Partial<InsertContract>): Promise<Contract | undefined>;
  updateContractAnalysis(id: number, analysis: AnalysisResult, status?: string): Promise<Contract | undefined>;
  deleteContract(id: number, userId: string): Promise<void>;
  deleteAllContracts(userId: string): Promise<void>;
  searchContracts(query: string, userId: string): Promise<Contract[]>;
  
  // V3 - Clause patterns (Personal Legal Memory) - userId required for data isolation
  getClausePatterns(userId: string): Promise<ClausePattern[]>;
  getClausePatternsByType(clauseType: string, userId: string): Promise<ClausePattern[]>;
  createClausePattern(pattern: InsertClausePattern): Promise<ClausePattern>;
  
  // V3 - Signed contracts (Contract Monitoring) - userId required for data isolation
  getSignedContracts(userId: string): Promise<SignedContract[]>;
  getSignedContract(id: number, userId: string): Promise<SignedContract | undefined>;
  createSignedContract(signedContract: InsertSignedContract): Promise<SignedContract>;
  updateSignedContract(id: number, userId: string, updates: Partial<InsertSignedContract>): Promise<SignedContract | undefined>;
  
  // V3 - Contract obligations - userId required for data isolation
  getObligations(signedContractId: number, userId: string): Promise<ContractObligation[]>;
  getUpcomingObligations(userId: string, days?: number): Promise<ContractObligation[]>;
  createObligation(obligation: InsertContractObligation): Promise<ContractObligation>;
  updateObligation(id: number, userId: string, updates: Partial<InsertContractObligation>): Promise<ContractObligation | undefined>;
  
  // V3 - Quick scans (Red Flag Shield) - userId required for data isolation
  createQuickScan(scan: InsertQuickScan): Promise<QuickScan>;
  getQuickScans(userId: string): Promise<QuickScan[]>;
  
  // V3 - Company intelligence (shared aggregated data, no user isolation needed)
  getCompanyIntelligence(companyName: string): Promise<CompanyIntelligence | undefined>;
  updateCompanyIntelligence(companyName: string, data: Partial<CompanyIntelligence>): Promise<CompanyIntelligence>;
  
  // V3 - Negotiation sessions - userId required for data isolation
  createNegotiationSession(session: InsertNegotiationSession): Promise<NegotiationSession>;
  getNegotiationSessions(userId: string, contractId?: number): Promise<NegotiationSession[]>;
  
  // V3 - User legal score - userId required for data isolation
  getUserLegalScore(userId: string): Promise<UserLegalScore | undefined>;
  updateUserLegalScore(userId: string, updates: Partial<UserLegalScore>): Promise<UserLegalScore>;
  
  // V2 - Advocate chat messages
  getAdvocateMessages(userId: string, limit?: number): Promise<AdvocateMessage[]>;
  createAdvocateMessage(message: InsertAdvocateMessage): Promise<AdvocateMessage>;
  clearAdvocateMessages(userId: string): Promise<void>;
  
  // V2 - User memory
  getUserMemory(userId: string, category?: string): Promise<UserMemoryEntry[]>;
  createUserMemory(entry: InsertUserMemory): Promise<UserMemoryEntry>;
  deleteUserMemory(id: number, userId: string): Promise<void>;
  
  // V2 - Recurring obligations
  getRecurringObligations(userId: string): Promise<RecurringObligation[]>;
  getRecurringObligation(id: number, userId: string): Promise<RecurringObligation | undefined>;
  createRecurringObligation(obligation: InsertRecurringObligation): Promise<RecurringObligation>;
  updateRecurringObligation(id: number, userId: string, updates: Partial<InsertRecurringObligation>): Promise<RecurringObligation | undefined>;
  deleteRecurringObligation(id: number, userId: string): Promise<void>;
  getGuardianAlerts(userId: string): Promise<{ urgent: any[]; dueSoon: any[]; safe: any[] }>;
  
  // V1 - Notifications
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // V1 - Contract favorites
  getFavorites(userId: string): Promise<ContractFavorite[]>;
  isFavorite(userId: string, contractId: number): Promise<boolean>;
  addFavorite(favorite: InsertContractFavorite): Promise<ContractFavorite>;
  removeFavorite(userId: string, contractId: number): Promise<void>;

  // V1 - Share links
  createShareLink(link: InsertShareLink): Promise<ShareLink>;
  getShareLinkByToken(token: string): Promise<ShareLink | undefined>;
  getShareLinks(userId: string): Promise<ShareLink[]>;
  incrementShareLinkViews(token: string): Promise<void>;

  // V1 - Contract templates
  getTemplates(): Promise<ContractTemplate[]>;
  getTemplate(id: number): Promise<ContractTemplate | undefined>;
  createTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;

  // Delete all user data (for account deletion)
  deleteAllUserData(userId: string): Promise<void>;
}

class DbStorage implements IStorage {
  async getContract(id: number, userId: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
    return contract;
  }

  async getAllContracts(userId: string): Promise<Contract[]> {
    return db.select().from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(contracts).values(contract).returning();
    return created;
  }

  async updateContract(id: number, userId: string, updates: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db
      .update(contracts)
      .set(updates)
      .where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
      .returning();
    return updated;
  }

  async updateContractAnalysis(
    id: number,
    analysis: AnalysisResult,
    status: string = "completed"
  ): Promise<Contract | undefined> {
    const [updated] = await db
      .update(contracts)
      .set({ analysis, status, analysedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updated;
  }

  async deleteContract(id: number, userId: string): Promise<void> {
    await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)));
  }

  async deleteAllContracts(userId: string): Promise<void> {
    await db.delete(contracts).where(eq(contracts.userId, userId));
  }

  async searchContracts(query: string, userId: string): Promise<Contract[]> {
    return db
      .select()
      .from(contracts)
      .where(and(like(contracts.name, `%${query}%`), eq(contracts.userId, userId)))
      .orderBy(desc(contracts.createdAt));
  }

  // V3 - Clause patterns (Personal Legal Memory)
  async getClausePatterns(userId: string): Promise<ClausePattern[]> {
    return db.select().from(clausePatterns)
      .where(eq(clausePatterns.userId, userId))
      .orderBy(desc(clausePatterns.createdAt));
  }

  async getClausePatternsByType(clauseType: string, userId: string): Promise<ClausePattern[]> {
    return db.select().from(clausePatterns)
      .where(and(
        eq(clausePatterns.clauseType, clauseType),
        eq(clausePatterns.userId, userId)
      ))
      .orderBy(desc(clausePatterns.createdAt));
  }

  async createClausePattern(pattern: InsertClausePattern): Promise<ClausePattern> {
    const [created] = await db.insert(clausePatterns).values(pattern).returning();
    return created;
  }

  // V3 - Signed contracts (Contract Monitoring)
  async getSignedContracts(userId: string): Promise<SignedContract[]> {
    return db.select().from(signedContracts)
      .where(eq(signedContracts.userId, userId))
      .orderBy(desc(signedContracts.signedDate));
  }

  async getSignedContract(id: number, userId: string): Promise<SignedContract | undefined> {
    const [signed] = await db.select().from(signedContracts)
      .where(and(eq(signedContracts.id, id), eq(signedContracts.userId, userId)));
    return signed;
  }

  async createSignedContract(signedContract: InsertSignedContract): Promise<SignedContract> {
    const [created] = await db.insert(signedContracts).values(signedContract).returning();
    return created;
  }

  async updateSignedContract(id: number, userId: string, updates: Partial<InsertSignedContract>): Promise<SignedContract | undefined> {
    const [updated] = await db.update(signedContracts)
      .set(updates)
      .where(and(eq(signedContracts.id, id), eq(signedContracts.userId, userId)))
      .returning();
    return updated;
  }

  // V3 - Contract obligations
  async getObligations(signedContractId: number, userId: string): Promise<ContractObligation[]> {
    // First verify the signed contract belongs to this user
    const sc = await this.getSignedContract(signedContractId, userId);
    if (!sc) return [];
    return db.select().from(contractObligations)
      .where(eq(contractObligations.signedContractId, signedContractId))
      .orderBy(contractObligations.dueDate);
  }

  async getUpcomingObligations(userId: string, days: number = 30): Promise<ContractObligation[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    // Get all pending obligations due within the time window for this user
    const results = await db.select({
      obligation: contractObligations,
      signedContract: signedContracts,
    })
      .from(contractObligations)
      .innerJoin(signedContracts, eq(contractObligations.signedContractId, signedContracts.id))
      .where(and(
        eq(contractObligations.status, "pending"),
        gte(contractObligations.dueDate, now),
        lte(contractObligations.dueDate, futureDate),
        eq(signedContracts.userId, userId)
      ))
      .orderBy(contractObligations.dueDate);
    
    return results.map(r => r.obligation);
  }

  async createObligation(obligation: InsertContractObligation): Promise<ContractObligation> {
    const [created] = await db.insert(contractObligations).values(obligation).returning();
    return created;
  }

  async updateObligation(id: number, userId: string, updates: Partial<InsertContractObligation>): Promise<ContractObligation | undefined> {
    // Verify the obligation belongs to a signed contract owned by this user
    const [obl] = await db.select({
      obligation: contractObligations,
      signedContract: signedContracts,
    })
      .from(contractObligations)
      .innerJoin(signedContracts, eq(contractObligations.signedContractId, signedContracts.id))
      .where(and(eq(contractObligations.id, id), eq(signedContracts.userId, userId)));
    
    if (!obl) return undefined;
    
    const [updated] = await db.update(contractObligations)
      .set(updates)
      .where(eq(contractObligations.id, id))
      .returning();
    return updated;
  }

  // V3 - Quick scans (Red Flag Shield)
  async createQuickScan(scan: InsertQuickScan): Promise<QuickScan> {
    const [created] = await db.insert(quickScans).values(scan).returning();
    return created;
  }

  async getQuickScans(userId: string): Promise<QuickScan[]> {
    return db.select().from(quickScans)
      .where(eq(quickScans.userId, userId))
      .orderBy(desc(quickScans.createdAt));
  }

  // V3 - Company intelligence
  async getCompanyIntelligence(companyName: string): Promise<CompanyIntelligence | undefined> {
    const normalized = companyName.toLowerCase().trim();
    const [company] = await db.select().from(companyIntelligence)
      .where(eq(companyIntelligence.normalizedName, normalized));
    return company;
  }

  async updateCompanyIntelligence(companyName: string, data: Partial<CompanyIntelligence>): Promise<CompanyIntelligence> {
    const normalized = companyName.toLowerCase().trim();
    const existing = await this.getCompanyIntelligence(companyName);
    
    if (existing) {
      const [updated] = await db.update(companyIntelligence)
        .set({ ...data, lastUpdated: new Date() })
        .where(eq(companyIntelligence.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(companyIntelligence).values({
        companyName,
        normalizedName: normalized,
        ...data,
      } as any).returning();
      return created;
    }
  }

  // V3 - Negotiation sessions
  async createNegotiationSession(session: InsertNegotiationSession): Promise<NegotiationSession> {
    const [created] = await db.insert(negotiationSessions).values(session).returning();
    return created;
  }

  async getNegotiationSessions(userId: string, contractId?: number): Promise<NegotiationSession[]> {
    if (contractId) {
      return db.select().from(negotiationSessions)
        .where(and(
          eq(negotiationSessions.contractId, contractId),
          eq(negotiationSessions.userId, userId)
        ))
        .orderBy(desc(negotiationSessions.createdAt));
    }
    return db.select().from(negotiationSessions)
      .where(eq(negotiationSessions.userId, userId))
      .orderBy(desc(negotiationSessions.createdAt));
  }

  // V3 - User legal score
  async getUserLegalScore(userId: string): Promise<UserLegalScore | undefined> {
    const [score] = await db.select().from(userLegalScore)
      .where(eq(userLegalScore.userId, userId));
    return score;
  }

  async updateUserLegalScore(userId: string, updates: Partial<UserLegalScore>): Promise<UserLegalScore> {
    const existing = await this.getUserLegalScore(userId);
    
    if (existing) {
      const [updated] = await db.update(userLegalScore)
        .set({ ...updates, lastUpdated: new Date() })
        .where(eq(userLegalScore.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userLegalScore).values({
        userId,
        currentScore: 50,
        ...updates,
      } as any).returning();
      return created;
    }
  }

  // V2 - Advocate chat messages
  async getAdvocateMessages(userId: string, limit: number = 50): Promise<AdvocateMessage[]> {
    return db.select().from(advocateMessages)
      .where(eq(advocateMessages.userId, userId))
      .orderBy(advocateMessages.createdAt)
      .limit(limit);
  }

  async createAdvocateMessage(message: InsertAdvocateMessage): Promise<AdvocateMessage> {
    const [created] = await db.insert(advocateMessages).values(message).returning();
    return created;
  }

  async clearAdvocateMessages(userId: string): Promise<void> {
    await db.delete(advocateMessages).where(eq(advocateMessages.userId, userId));
  }

  // V2 - User memory
  async getUserMemory(userId: string, category?: string): Promise<UserMemoryEntry[]> {
    if (category) {
      return db.select().from(userMemory)
        .where(and(eq(userMemory.userId, userId), eq(userMemory.category, category)))
        .orderBy(desc(userMemory.createdAt));
    }
    return db.select().from(userMemory)
      .where(eq(userMemory.userId, userId))
      .orderBy(desc(userMemory.createdAt));
  }

  async createUserMemory(entry: InsertUserMemory): Promise<UserMemoryEntry> {
    const [created] = await db.insert(userMemory).values(entry).returning();
    return created;
  }

  async deleteUserMemory(id: number, userId: string): Promise<void> {
    await db.delete(userMemory).where(and(eq(userMemory.id, id), eq(userMemory.userId, userId)));
  }

  // V2 - Recurring obligations
  async getRecurringObligations(userId: string): Promise<RecurringObligation[]> {
    return db.select().from(recurringObligations)
      .where(eq(recurringObligations.userId, userId))
      .orderBy(recurringObligations.nextDueDate);
  }

  async getRecurringObligation(id: number, userId: string): Promise<RecurringObligation | undefined> {
    const [found] = await db.select().from(recurringObligations)
      .where(and(eq(recurringObligations.id, id), eq(recurringObligations.userId, userId)));
    return found;
  }

  async createRecurringObligation(obligation: InsertRecurringObligation): Promise<RecurringObligation> {
    const [created] = await db.insert(recurringObligations).values(obligation).returning();
    return created;
  }

  async updateRecurringObligation(id: number, userId: string, updates: Partial<InsertRecurringObligation>): Promise<RecurringObligation | undefined> {
    const [updated] = await db.update(recurringObligations)
      .set(updates)
      .where(and(eq(recurringObligations.id, id), eq(recurringObligations.userId, userId)))
      .returning();
    return updated;
  }

  async deleteRecurringObligation(id: number, userId: string): Promise<void> {
    await db.delete(recurringObligations).where(and(eq(recurringObligations.id, id), eq(recurringObligations.userId, userId)));
  }

  async getGuardianAlerts(userId: string): Promise<{ urgent: any[]; dueSoon: any[]; safe: any[] }> {
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const allRecurring = await this.getRecurringObligations(userId);
    const activeRecurring = allRecurring.filter(r => r.status === "active");

    const contractOblResults = await db.select({
      obligation: contractObligations,
      signedContract: signedContracts,
    })
      .from(contractObligations)
      .innerJoin(signedContracts, eq(contractObligations.signedContractId, signedContracts.id))
      .where(and(
        eq(contractObligations.status, "pending"),
        eq(signedContracts.userId, userId)
      ))
      .orderBy(contractObligations.dueDate);

    const urgent: any[] = [];
    const dueSoon: any[] = [];
    const safe: any[] = [];

    for (const { obligation } of contractOblResults) {
      if (!obligation.dueDate) continue;
      const due = new Date(obligation.dueDate);
      const item = { ...obligation, itemType: "contract_obligation" as const };
      if (due <= now) {
        urgent.push({ ...item, alertReason: "Overdue" });
      } else if (due <= threeDays) {
        urgent.push({ ...item, alertReason: `Due in ${Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days` });
      } else if (due <= fourteenDays) {
        dueSoon.push({ ...item, alertReason: `Due in ${Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days` });
      } else {
        safe.push({ ...item, alertReason: "On track" });
      }
    }

    for (const rec of activeRecurring) {
      if (!rec.nextDueDate) {
        safe.push({ ...rec, itemType: "recurring" as const, alertReason: "No due date set" });
        continue;
      }
      const due = new Date(rec.nextDueDate);
      const item = { ...rec, itemType: "recurring" as const };
      if (due <= now) {
        urgent.push({ ...item, alertReason: "Overdue" });
      } else if (due <= threeDays) {
        urgent.push({ ...item, alertReason: `Due in ${Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days` });
      } else if (due <= fourteenDays) {
        dueSoon.push({ ...item, alertReason: `Due in ${Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days` });
      } else {
        safe.push({ ...item, alertReason: "On track" });
      }

      if (rec.exitWindowEnd) {
        const exitEnd = new Date(rec.exitWindowEnd);
        if (exitEnd > now && exitEnd <= fourteenDays) {
          const daysLeft = Math.ceil((exitEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 3) {
            urgent.push({ ...rec, itemType: "exit_window" as const, alertReason: `Exit window closes in ${daysLeft} days` });
          } else {
            dueSoon.push({ ...rec, itemType: "exit_window" as const, alertReason: `Exit window closes in ${daysLeft} days` });
          }
        }
      }
    }

    return { urgent, dueSoon, safe };
  }

  // V1 - Notifications
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // V1 - Contract favorites
  async getFavorites(userId: string): Promise<ContractFavorite[]> {
    return db.select().from(contractFavorites)
      .where(eq(contractFavorites.userId, userId))
      .orderBy(desc(contractFavorites.createdAt));
  }

  async isFavorite(userId: string, contractId: number): Promise<boolean> {
    const [found] = await db.select().from(contractFavorites)
      .where(and(eq(contractFavorites.userId, userId), eq(contractFavorites.contractId, contractId)));
    return !!found;
  }

  async addFavorite(favorite: InsertContractFavorite): Promise<ContractFavorite> {
    const [created] = await db.insert(contractFavorites).values(favorite).returning();
    return created;
  }

  async removeFavorite(userId: string, contractId: number): Promise<void> {
    await db.delete(contractFavorites)
      .where(and(eq(contractFavorites.userId, userId), eq(contractFavorites.contractId, contractId)));
  }

  // V1 - Share links
  async createShareLink(link: InsertShareLink): Promise<ShareLink> {
    const [created] = await db.insert(shareLinks).values(link).returning();
    return created;
  }

  async getShareLinkByToken(token: string): Promise<ShareLink | undefined> {
    const [found] = await db.select().from(shareLinks)
      .where(eq(shareLinks.token, token));
    return found;
  }

  async getShareLinks(userId: string): Promise<ShareLink[]> {
    return db.select().from(shareLinks)
      .where(eq(shareLinks.userId, userId))
      .orderBy(desc(shareLinks.createdAt));
  }

  async incrementShareLinkViews(token: string): Promise<void> {
    await db.update(shareLinks)
      .set({ viewCount: sql`${shareLinks.viewCount} + 1` })
      .where(eq(shareLinks.token, token));
  }

  // V1 - Contract templates
  async getTemplates(): Promise<ContractTemplate[]> {
    return db.select().from(contractTemplates)
      .orderBy(contractTemplates.category, contractTemplates.name);
  }

  async getTemplate(id: number): Promise<ContractTemplate | undefined> {
    const [found] = await db.select().from(contractTemplates)
      .where(eq(contractTemplates.id, id));
    return found;
  }

  async createTemplate(template: InsertContractTemplate): Promise<ContractTemplate> {
    const [created] = await db.insert(contractTemplates).values(template).returning();
    return created;
  }

  async deleteAllUserData(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(notifications).where(eq(notifications.userId, userId));
      await tx.delete(contractFavorites).where(eq(contractFavorites.userId, userId));
      await tx.delete(shareLinks).where(eq(shareLinks.userId, userId));
      await tx.delete(advocateMessages).where(eq(advocateMessages.userId, userId));
      await tx.delete(userMemory).where(eq(userMemory.userId, userId));
      await tx.delete(recurringObligations).where(eq(recurringObligations.userId, userId));
      await tx.delete(negotiationSessions).where(eq(negotiationSessions.userId, userId));
      await tx.delete(clausePatterns).where(eq(clausePatterns.userId, userId));
      
      const userSignedContracts = await tx.select({ id: signedContracts.id })
        .from(signedContracts)
        .where(eq(signedContracts.userId, userId));
      
      for (const sc of userSignedContracts) {
        await tx.delete(contractObligations).where(eq(contractObligations.signedContractId, sc.id));
      }
      
      await tx.delete(signedContracts).where(eq(signedContracts.userId, userId));
      await tx.delete(contracts).where(eq(contracts.userId, userId));
      await tx.delete(quickScans).where(eq(quickScans.userId, userId));
      await tx.delete(userLegalScore).where(eq(userLegalScore.userId, userId));
      await tx.delete(userSettings).where(eq(userSettings.userId, userId));
    });
  }
}

export const storage = new DbStorage();
