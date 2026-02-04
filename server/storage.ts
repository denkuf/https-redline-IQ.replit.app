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
      .set({ analysis, status })
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

  async deleteAllUserData(userId: string): Promise<void> {
    // Delete all user data in a single transaction for atomicity
    // This ensures all data is deleted or none is, preventing orphaned records
    await db.transaction(async (tx) => {
      // Delete in order respecting foreign key constraints
      // Tables with contractId FK must be deleted before contracts
      // Tables with signedContractId FK must be deleted before signedContracts
      
      // 1. Delete negotiation sessions (references contracts.id)
      await tx.delete(negotiationSessions).where(eq(negotiationSessions.userId, userId));
      
      // 2. Delete clause patterns (references contracts.id)
      await tx.delete(clausePatterns).where(eq(clausePatterns.userId, userId));
      
      // 3. Delete contract obligations (depends on signed contracts)
      const userSignedContracts = await tx.select({ id: signedContracts.id })
        .from(signedContracts)
        .where(eq(signedContracts.userId, userId));
      
      for (const sc of userSignedContracts) {
        await tx.delete(contractObligations).where(eq(contractObligations.signedContractId, sc.id));
      }
      
      // 4. Delete signed contracts (references contracts.id)
      await tx.delete(signedContracts).where(eq(signedContracts.userId, userId));
      
      // 5. Delete contracts
      await tx.delete(contracts).where(eq(contracts.userId, userId));
      
      // 6. Delete quick scans
      await tx.delete(quickScans).where(eq(quickScans.userId, userId));
      
      // 7. Delete user legal score
      await tx.delete(userLegalScore).where(eq(userLegalScore.userId, userId));
      
      // 8. Delete user settings
      await tx.delete(userSettings).where(eq(userSettings.userId, userId));
    });
  }
}

export const storage = new DbStorage();
