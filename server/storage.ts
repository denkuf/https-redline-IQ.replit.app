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
  // Contract operations
  getContract(id: number): Promise<Contract | undefined>;
  getAllContracts(): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract | undefined>;
  updateContractAnalysis(id: number, analysis: AnalysisResult, status?: string): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<void>;
  deleteAllContracts(): Promise<void>;
  searchContracts(query: string): Promise<Contract[]>;
  
  // V3 - Clause patterns (Personal Legal Memory)
  getClausePatterns(userId?: string): Promise<ClausePattern[]>;
  getClausePatternsByType(clauseType: string, userId?: string): Promise<ClausePattern[]>;
  createClausePattern(pattern: InsertClausePattern): Promise<ClausePattern>;
  
  // V3 - Signed contracts (Contract Monitoring)
  getSignedContracts(userId?: string): Promise<SignedContract[]>;
  getSignedContract(id: number): Promise<SignedContract | undefined>;
  createSignedContract(signedContract: InsertSignedContract): Promise<SignedContract>;
  updateSignedContract(id: number, updates: Partial<InsertSignedContract>): Promise<SignedContract | undefined>;
  
  // V3 - Contract obligations
  getObligations(signedContractId: number): Promise<ContractObligation[]>;
  getUpcomingObligations(userId?: string, days?: number): Promise<ContractObligation[]>;
  createObligation(obligation: InsertContractObligation): Promise<ContractObligation>;
  updateObligation(id: number, updates: Partial<InsertContractObligation>): Promise<ContractObligation | undefined>;
  
  // V3 - Quick scans (Red Flag Shield)
  createQuickScan(scan: InsertQuickScan): Promise<QuickScan>;
  getQuickScans(userId?: string): Promise<QuickScan[]>;
  
  // V3 - Company intelligence
  getCompanyIntelligence(companyName: string): Promise<CompanyIntelligence | undefined>;
  updateCompanyIntelligence(companyName: string, data: Partial<CompanyIntelligence>): Promise<CompanyIntelligence>;
  
  // V3 - Negotiation sessions
  createNegotiationSession(session: InsertNegotiationSession): Promise<NegotiationSession>;
  getNegotiationSessions(contractId?: number): Promise<NegotiationSession[]>;
  
  // V3 - User legal score
  getUserLegalScore(userId?: string): Promise<UserLegalScore | undefined>;
  updateUserLegalScore(userId: string, updates: Partial<UserLegalScore>): Promise<UserLegalScore>;
}

class DbStorage implements IStorage {
  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async getAllContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [created] = await db.insert(contracts).values(contract).returning();
    return created;
  }

  async updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db
      .update(contracts)
      .set(updates)
      .where(eq(contracts.id, id))
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

  async deleteContract(id: number): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  async deleteAllContracts(): Promise<void> {
    await db.delete(contracts);
  }

  async searchContracts(query: string): Promise<Contract[]> {
    return db
      .select()
      .from(contracts)
      .where(like(contracts.name, `%${query}%`))
      .orderBy(desc(contracts.createdAt));
  }

  // V3 - Clause patterns (Personal Legal Memory)
  async getClausePatterns(userId?: string): Promise<ClausePattern[]> {
    if (userId) {
      return db.select().from(clausePatterns)
        .where(eq(clausePatterns.userId, userId))
        .orderBy(desc(clausePatterns.createdAt));
    }
    return db.select().from(clausePatterns).orderBy(desc(clausePatterns.createdAt));
  }

  async getClausePatternsByType(clauseType: string, userId?: string): Promise<ClausePattern[]> {
    if (userId) {
      return db.select().from(clausePatterns)
        .where(and(
          eq(clausePatterns.clauseType, clauseType),
          eq(clausePatterns.userId, userId)
        ))
        .orderBy(desc(clausePatterns.createdAt));
    }
    return db.select().from(clausePatterns)
      .where(eq(clausePatterns.clauseType, clauseType))
      .orderBy(desc(clausePatterns.createdAt));
  }

  async createClausePattern(pattern: InsertClausePattern): Promise<ClausePattern> {
    const [created] = await db.insert(clausePatterns).values(pattern).returning();
    return created;
  }

  // V3 - Signed contracts (Contract Monitoring)
  async getSignedContracts(userId?: string): Promise<SignedContract[]> {
    if (userId) {
      return db.select().from(signedContracts)
        .where(eq(signedContracts.userId, userId))
        .orderBy(desc(signedContracts.signedDate));
    }
    return db.select().from(signedContracts).orderBy(desc(signedContracts.signedDate));
  }

  async getSignedContract(id: number): Promise<SignedContract | undefined> {
    const [signed] = await db.select().from(signedContracts).where(eq(signedContracts.id, id));
    return signed;
  }

  async createSignedContract(signedContract: InsertSignedContract): Promise<SignedContract> {
    const [created] = await db.insert(signedContracts).values(signedContract).returning();
    return created;
  }

  async updateSignedContract(id: number, updates: Partial<InsertSignedContract>): Promise<SignedContract | undefined> {
    const [updated] = await db.update(signedContracts)
      .set(updates)
      .where(eq(signedContracts.id, id))
      .returning();
    return updated;
  }

  // V3 - Contract obligations
  async getObligations(signedContractId: number): Promise<ContractObligation[]> {
    return db.select().from(contractObligations)
      .where(eq(contractObligations.signedContractId, signedContractId))
      .orderBy(contractObligations.dueDate);
  }

  async getUpcomingObligations(userId?: string, days: number = 30): Promise<ContractObligation[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    // Get all pending obligations due within the time window
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
        userId ? eq(signedContracts.userId, userId) : sql`true`
      ))
      .orderBy(contractObligations.dueDate);
    
    return results.map(r => r.obligation);
  }

  async createObligation(obligation: InsertContractObligation): Promise<ContractObligation> {
    const [created] = await db.insert(contractObligations).values(obligation).returning();
    return created;
  }

  async updateObligation(id: number, updates: Partial<InsertContractObligation>): Promise<ContractObligation | undefined> {
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

  async getQuickScans(userId?: string): Promise<QuickScan[]> {
    if (userId) {
      return db.select().from(quickScans)
        .where(eq(quickScans.userId, userId))
        .orderBy(desc(quickScans.createdAt));
    }
    return db.select().from(quickScans).orderBy(desc(quickScans.createdAt));
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

  async getNegotiationSessions(contractId?: number): Promise<NegotiationSession[]> {
    if (contractId) {
      return db.select().from(negotiationSessions)
        .where(eq(negotiationSessions.contractId, contractId))
        .orderBy(desc(negotiationSessions.createdAt));
    }
    return db.select().from(negotiationSessions).orderBy(desc(negotiationSessions.createdAt));
  }

  // V3 - User legal score
  async getUserLegalScore(userId?: string): Promise<UserLegalScore | undefined> {
    if (userId) {
      const [score] = await db.select().from(userLegalScore)
        .where(eq(userLegalScore.userId, userId));
      return score;
    }
    // Return first score for demo/single-user mode
    const [score] = await db.select().from(userLegalScore);
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
}

export const storage = new DbStorage();
