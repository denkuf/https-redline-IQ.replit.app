import { db } from "./db";
import { contracts, type Contract, type InsertContract, type AnalysisResult } from "@shared/schema";
import { eq, desc, like, sql } from "drizzle-orm";

export interface IStorage {
  getContract(id: number): Promise<Contract | undefined>;
  getAllContracts(): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract | undefined>;
  updateContractAnalysis(id: number, analysis: AnalysisResult, status?: string): Promise<Contract | undefined>;
  deleteContract(id: number): Promise<void>;
  deleteAllContracts(): Promise<void>;
  searchContracts(query: string): Promise<Contract[]>;
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
}

export const storage = new DbStorage();
