import { db } from "./db";
import { contracts, signedContracts, notifications } from "@shared/schema";
import { eq, and, lt, or, isNull, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";

const STALE_DAYS = 180;
const NOTIFICATION_DEDUP_DAYS = 30;

/**
 * Checks for signed contracts whose linked contract has not been re-analysed
 * in over 180 days, and creates an in-app notification for each stale contract
 * (at most once per 30 days per contract).
 */
export async function checkStaleAnalyses(): Promise<void> {
  try {
    const staleThreshold = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const dedupThreshold = new Date(Date.now() - NOTIFICATION_DEDUP_DAYS * 24 * 60 * 60 * 1000);

    // Find all signed contracts joined to their linked contract
    const results = await db
      .select({
        sc: signedContracts,
        c: contracts,
      })
      .from(signedContracts)
      .innerJoin(contracts, eq(signedContracts.contractId, contracts.id))
      .where(
        and(
          eq(signedContracts.status, "active"),
          // Contract was either never analysed or analysed more than 180 days ago
          or(
            isNull(contracts.analysedAt),
            lt(contracts.analysedAt, staleThreshold)
          )
        )
      );

    for (const { sc, c } of results) {
      if (!sc.userId) continue;

      // Check if we already sent a notification for this contract in the last 30 days
      const [existing] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, sc.userId),
            eq(notifications.relatedId, c.id),
            eq(notifications.relatedType, "contract_stale_analysis"),
            gte(notifications.createdAt, dedupThreshold)
          )
        )
        .limit(1);

      if (existing) continue;

      const counterparty = sc.counterpartyName || "your counterparty";
      await db.insert(notifications).values({
        userId: sc.userId,
        type: "stale_analysis",
        title: "Contract review recommended",
        message: `Your contract with ${counterparty} hasn't been reviewed in over 6 months. Laws and norms can change — consider re-analysing.`,
        relatedId: c.id,
        relatedType: "contract_stale_analysis",
        isRead: false,
      });

      console.log(`[stale-checker] Created review notification for contract ${c.id} (user ${sc.userId})`);
    }
  } catch (err) {
    console.error("[stale-checker] Error checking stale analyses:", err);
  }
}

/**
 * Starts the daily stale analysis checker.
 * Runs once immediately on startup, then every 24 hours.
 */
export function startStaleAnalysisChecker(): void {
  const DAY_MS = 24 * 60 * 60 * 1000;
  // Run immediately at startup (slight delay to let DB settle)
  setTimeout(() => checkStaleAnalyses(), 5000);
  // Then every 24 hours
  setInterval(() => checkStaleAnalyses(), DAY_MS);
  console.log("[stale-checker] Stale analysis checker scheduled (runs daily)");
}
