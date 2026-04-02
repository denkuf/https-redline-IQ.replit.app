import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: { email: string; firstName: string; lastName: string; password: string }): Promise<User>;
  verifyPassword(user: User, password: string): Promise<boolean>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>;
  setVerificationCode(userId: string): Promise<string>;
  verifyEmailCode(userId: string, code: string): Promise<boolean>;
  resendVerificationCode(userId: string): Promise<string>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    return user;
  }

  async createUser(userData: { email: string; firstName: string; lastName: string; password: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    const normalizedEmail = userData.email.toLowerCase().trim();
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        emailVerified: true,
        verificationCode: code,
        verificationCodeExpiresAt: expiresAt,
      })
      .returning();
    return user;
  }

  async setVerificationCode(userId: string): Promise<string> {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db
      .update(users)
      .set({ verificationCode: code, verificationCodeExpiresAt: expiresAt })
      .where(eq(users.id, userId));
    return code;
  }

  async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.verificationCode || !user.verificationCodeExpiresAt) return false;
    if (new Date() > user.verificationCodeExpiresAt) return false;
    if (user.verificationCode !== code) return false;

    await db
      .update(users)
      .set({ emailVerified: true, verificationCode: null, verificationCodeExpiresAt: null })
      .where(eq(users.id, userId));
    return true;
  }

  async resendVerificationCode(userId: string): Promise<string> {
    return this.setVerificationCode(userId);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

export const authStorage = new AuthStorage();
