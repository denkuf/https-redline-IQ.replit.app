import OpenAI from "openai";
import type { AnalysisResult, Summary, KeyTerm, RiskFlag, ClarifyingQuestion, Verdict, IndustryMode, RiskPreferences } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const FAST_MODEL = "gpt-4.1-mini";
const FULL_MODEL = "gpt-4.1";

// Industry-specific playbooks with mode-specific red flags
const INDUSTRY_PLAYBOOKS: Record<IndustryMode, string> = {
  general: `GENERAL CONTRACT MODE — Focus on universal contract risks.

RED FLAGS (8 priority items):
1. Unilateral amendment rights — one party can change terms without consent (unusual; flag if present)
2. Unlimited liability exposure — no cap on damages owed by signer (unusual; standard is liability capped at contract value)
3. Automatic renewal with long notice period — renewal locks in without affirmative action (standard: 30 days notice; unusual: 60+ days or no notice option)
4. One-sided termination rights — other party can cancel anytime, signer cannot (unusual)
5. Broad indemnification — signer indemnifies the other party for their own negligence (unusual; standard is mutual or limited indemnity)
6. Mandatory arbitration with unfavourable venue — dispute resolution requires travelling to another city/state (unusual)
7. Waiver of jury trial — standard in some commercial contracts, unusual in consumer contracts
8. "Entire agreement" clause without carve-outs — prior promises not honoured (commonly seen; note if important oral terms were made)

STANDARD BENCHMARKS: Liability capped at fees paid, 30-day termination notice, mutual indemnity for own negligence, local or agreed dispute venue.
UNUSUAL THRESHOLDS: Liability cap waived, 90+ day notice, unilateral amendment rights, mandatory arbitration far from signer.
PRIORITY NEGOTIATION TARGETS: Liability cap, termination rights, indemnification scope.`,

  rent_lease: `RENT/LEASE MODE — Focus on residential and commercial lease risks.

RED FLAGS (8 priority items):
1. Security deposit above 1 month's rent — STANDARD: 1–1.5 months; UNUSUAL: 2+ months; RED FLAG: 3+ months with no return timeline
2. Unlimited rent increase clauses — STANDARD: annual CPI-capped increases; UNUSUAL: landlord can raise rent at any time without cap
3. Tenant-responsible maintenance — STANDARD: tenant maintains interior/appliances; UNUSUAL: tenant responsible for structural, plumbing, or HVAC repairs
4. Early termination penalty — STANDARD: 1–2 months rent buyout; UNUSUAL: full remaining lease balance owed; RED FLAG: no termination right at all
5. Automatic renewal with short notice — STANDARD: 30–60 day notice to exit; UNUSUAL: 90+ days notice required to avoid auto-renewal
6. Broad landlord entry rights — STANDARD: 24–48 hours notice except emergency; UNUSUAL: no notice required for landlord entry
7. Subletting prohibition — STANDARD: subletting requires landlord consent; UNUSUAL: absolute ban with no exceptions or approval process
8. Unclear damage/deposit deduction — STANDARD: itemised deductions with receipts; UNUSUAL: landlord can deduct for "wear and tear" or undefined damages

STANDARD BENCHMARKS: 1 month deposit, CPI rent increases, 48hr entry notice, 30-day termination notice, 1-month buyout.
UNUSUAL THRESHOLDS: 3+ months deposit, unlimited rent increases, no entry notice, 90+ day auto-renewal lock-in.
PRIORITY NEGOTIATION TARGETS: Deposit cap, rent increase limits, entry notice, early termination buyout.`,

  employment: `EMPLOYMENT MODE — Focus on job offer and employment agreement risks.

RED FLAGS (8 priority items):
1. Non-compete scope — STANDARD: same industry within 25-mile radius for 6–12 months; UNUSUAL: nationwide scope or 2+ years; RED FLAG: worldwide or indefinite non-compete
2. IP assignment breadth — STANDARD: work-created-on-the-job assigned to employer; UNUSUAL: all inventions including personal projects with own equipment outside work hours
3. Termination without cause — STANDARD for at-will employment; RED FLAG: termination for cause clause that gives employer near-unlimited discretion
4. Severance absence — STANDARD at senior levels: 2–4 weeks per year of service; UNUSUAL: no severance at all for involuntary termination
5. Confidentiality duration — STANDARD: during employment + 1–2 years after; UNUSUAL: indefinite confidentiality with no sunset clause
6. Non-solicitation scope — STANDARD: cannot recruit colleagues for 12 months; UNUSUAL: cannot work with any former client even if you didn't serve them
7. Mandatory arbitration — STANDARD in some US employers; RED FLAG: waiver of class action in consumer-facing roles
8. Clawback / repayment clauses — STANDARD: sign-on bonus repayment if leaving within 1 year; UNUSUAL: repayment of training costs or ordinary salary for any reason

STANDARD BENCHMARKS: 12-month non-compete, 25-mile radius, personal-project IP carve-out, 2-week severance/year, 1-year post-employment NDA.
UNUSUAL THRESHOLDS: 24+ month non-compete, nationwide scope, all-inventions IP clause, no severance, indefinite NDA.
PRIORITY NEGOTIATION TARGETS: Non-compete geography/duration, IP carve-out for personal projects, severance terms.`,

  freelance: `FREELANCE/CONTRACTOR MODE — Focus on independent contractor agreement risks.

RED FLAGS (8 priority items):
1. Payment terms — STANDARD: 50% upfront + 50% on delivery or Net-30; UNUSUAL: Net-60; RED FLAG: Net-90 or payment only "upon client approval" with no approval deadline
2. Scope creep — STANDARD: change orders required for out-of-scope work; UNUSUAL: client can expand scope unilaterally without additional pay
3. Revision limits — STANDARD: 2–3 rounds of revisions included; UNUSUAL: unlimited revisions with no additional cost
4. Kill fee / cancellation — STANDARD: 25–50% of remaining contract value if cancelled mid-project; UNUSUAL: no kill fee, full refund required on cancellation
5. IP ownership timing — STANDARD: IP transfers upon final payment; UNUSUAL: IP transfers immediately on creation before payment received
6. Contractor liability / indemnification — STANDARD: indemnify only for contractor's own negligence; UNUSUAL: contractor indemnifies client for client's own negligence or third-party claims
7. Exclusivity clause — STANDARD: project-specific non-compete; UNUSUAL: cannot work for any competitor during engagement
8. Late payment penalty — STANDARD: 1.5% monthly interest on overdue amounts; UNUSUAL: no late payment remedy at all

STANDARD BENCHMARKS: 50% upfront, Net-30, 3 revisions, 25% kill fee, IP-on-payment, 1.5%/month late fee.
UNUSUAL THRESHOLDS: Net-90, unlimited revisions, no kill fee, IP-before-payment, blanket indemnification.
PRIORITY NEGOTIATION TARGETS: Payment terms and schedule, IP transfer timing, kill fee/cancellation protection.`,

  insurance: `INSURANCE MODE — Focus on policy and claims risks.

RED FLAGS (8 priority items):
1. Pre-existing condition exclusions — STANDARD: defined list of exclusions with clear criteria; UNUSUAL: vague "any pre-existing condition" language with no definition of the lookback period
2. Subrogation rights — STANDARD: insurer can recover from third parties after paying a claim; UNUSUAL: subrogation waiver required by contract (may conflict with other agreements you sign)
3. Claim reporting deadline — STANDARD: 30–90 days to report; UNUSUAL: 24–72 hours notice required even for non-emergency claims; RED FLAG: failure to report on time voids coverage
4. Cancellation terms — STANDARD: 30-day notice of cancellation by either party; UNUSUAL: insurer can cancel mid-term for "material misrepresentation" broadly defined
5. Automatic renewal with premium increase — STANDARD: annual renewal with 30-day notice of rate changes; UNUSUAL: rate can increase without notice at renewal
6. Coverage exclusions — STANDARD: named exclusions for intentional acts, war, nuclear events; UNUSUAL: broad exclusions for "acts of God," "unforeseen circumstances" without definition
7. Duty to cooperate — STANDARD: reasonable cooperation in claims investigation; UNUSUAL: insurer can deny claim if they determine you didn't cooperate "fully" (undefined)
8. Pro-rata vs. short-rate cancellation — STANDARD: pro-rata refund if you cancel early; UNUSUAL: short-rate (penalty-based) refund that returns less than proportional premium

STANDARD BENCHMARKS: 30-day cancellation notice, defined exclusions, 90-day claim window, pro-rata refunds.
UNUSUAL THRESHOLDS: 24-hour claim reporting, vague exclusions, short-rate cancellation, broad cooperation requirements.
PRIORITY NEGOTIATION TARGETS: Claim reporting windows, exclusion definitions, cancellation refund method.`,

  saas_subscription: `SAAS/SUBSCRIPTION MODE — Focus on software and subscription agreement risks.

RED FLAGS (8 priority items):
1. Auto-renewal notice period — STANDARD: 30-day notice to cancel before auto-renewal; UNUSUAL: 60-day notice; RED FLAG: 90+ day notice required to avoid binding renewal
2. Unilateral price changes — STANDARD: price fixed for term, increases with 30-day notice at renewal; UNUSUAL: price can increase mid-term with 30 days notice; RED FLAG: immediate price changes at vendor's discretion
3. Data ownership — STANDARD: your data remains yours; UNUSUAL: vendor claims licence to use your data for product improvement without opt-out; RED FLAG: vendor owns aggregated or derived data from your usage
4. Data portability / export — STANDARD: export your data in standard formats at any time; UNUSUAL: data export only available at termination with 30-day window; RED FLAG: no data export at all after contract ends
5. SLA and uptime — STANDARD: 99.9% uptime guarantee with service credits; UNUSUAL: SLA only covers "scheduled" downtime; RED FLAG: no SLA or uptime commitment at all
6. Termination for convenience — STANDARD: either party can terminate with 30 days notice; UNUSUAL: only vendor can terminate for convenience; RED FLAG: no termination right for user, locked in for full term
7. Usage limits and overage — STANDARD: defined limits with notification before overage charges; UNUSUAL: charges apply automatically above limit without notification; RED FLAG: unlimited liability for overage consumption
8. Indemnification for data breach — STANDARD: vendor indemnifies you for breaches caused by their security failures; UNUSUAL: you indemnify vendor for any data breach regardless of cause

STANDARD BENCHMARKS: 30-day cancellation, 99.9% uptime, user-owned data, standard-format export, mutual indemnity.
UNUSUAL THRESHOLDS: 90-day notice, mid-term price hikes, no SLA, vendor-owned derived data, no data export.
PRIORITY NEGOTIATION TARGETS: Auto-renewal notice, price increase terms, data ownership/portability, SLA credits.`,

  small_business: `SMALL BUSINESS/VENDOR MODE — Focus on B2B commercial contract risks.

RED FLAGS (8 priority items):
1. Payment terms — STANDARD: Net-30; UNUSUAL: Net-60; RED FLAG: Net-90 or payment contingent on client's client paying (back-to-back payment clause)
2. Liability cap — STANDARD: capped at total fees paid in the last 12 months; UNUSUAL: liability capped below contract value; RED FLAG: no liability cap (unlimited exposure)
3. Exclusivity clause — STANDARD: non-exclusive engagement; UNUSUAL: exclusive supplier requirement prevents working with competitors; RED FLAG: exclusivity with no minimum purchase guarantee
4. Warranty scope — STANDARD: 30–90 day warranty against defects; UNUSUAL: "as-is" disclaimer with no warranty; RED FLAG: warranty that covers vendor's interests but not buyer's remedies
5. Price adjustment rights — STANDARD: fixed price for contract term, renegotiation at renewal; UNUSUAL: vendor can increase prices mid-term with 30-day notice; RED FLAG: unilateral price adjustment at any time
6. Minimum purchase obligations — STANDARD: no minimum or clearly stated volume discount thresholds; UNUSUAL: binding minimum order quantities with penalties for shortfall
7. Termination penalty — STANDARD: no penalty for termination with 30-day notice; UNUSUAL: early termination fee equal to remaining contract value; RED FLAG: no right to terminate at all
8. Intellectual property — STANDARD: deliverables assigned to buyer upon payment; UNUSUAL: vendor retains ownership of custom work and only licenses it; RED FLAG: vendor can revoke licence if any payment is disputed

STANDARD BENCHMARKS: Net-30, 12-month liability cap, non-exclusive, fixed-price term, 30-day exit, buyer-owned custom deliverables.
UNUSUAL THRESHOLDS: Net-90, no liability cap, exclusive without minimums, mid-term price hikes, no termination right.
PRIORITY NEGOTIATION TARGETS: Payment terms, liability cap, IP ownership, termination rights.`,
};

const SYSTEM_PROMPT = `You are an elite contract advocate with the skills of a top-tier contract attorney, risk auditor, and negotiation expert. Your role is to protect ordinary people from bad contract decisions and help them negotiate better terms.

CRITICAL RULES:
1. NO LAW INVENTION: Never claim anything is "illegal" or cite specific statutes. Instead say "This clause may increase your risk because..." or "This is commonly seen in this type of contract" vs "This is unusual and worth negotiating."
2. GROUNDING REQUIRED: Every risk flag MUST reference an exact quote from the contract text. If no clause supports a risk, do not mention it.
3. UNCERTAINTY HANDLING: If your confidence in an assessment is below 0.70, explicitly state "This is ambiguous; consider professional review."
4. ADVOCATE ROLE: Act as an advocate-grade analyzer that is grounded in text, transparent about uncertainty, and offers pathways to negotiate or seek human review.
5. This is INFORMATIONAL, not legal advice.
6. JURISDICTION AWARENESS: If a [USER SITUATION] block provides jurisdiction, reference it where relevant — e.g. note if a clause is commonly unenforceable or unusually broad in that jurisdiction. Do not invent statutes. Frame with "In [jurisdiction], clauses like this are often..." or "Courts in [jurisdiction] have generally..."
7. LEVERAGE CALIBRATION: Tailor negotiation advice to the user's stated leverage. If leverage is "No choice" or "Weak", focus on understanding what they're agreeing to rather than asking for changes. If "Strong" or "Balanced", provide assertive negotiation scripts.

When analyzing contracts:
- Translate legal jargon into plain English
- Identify who benefits from each clause
- Expose hidden traps, automatic renewals, unfair terms
- Provide specific negotiation suggestions for risky clauses calibrated to the user's role and leverage
- Calculate a risk score (0-100) and give a clear verdict
- Answer the implicit question: "Should I sign this?"

Respond ONLY with valid JSON matching the required schema. Do not include any other text.`;

function buildAnalysisPrompt(contractText: string, industryMode: IndustryMode = "general", riskPreferences?: RiskPreferences): string {
  const playbook = INDUSTRY_PLAYBOOKS[industryMode] || INDUSTRY_PLAYBOOKS.general;
  
  const preferencesText = riskPreferences ? `
USER'S RISK PREFERENCES:
- Risk Tolerance: ${riskPreferences.riskTolerance} (${riskPreferences.riskTolerance === 'risk_averse' ? 'weight risks heavily' : riskPreferences.riskTolerance === 'risk_tolerant' ? 'be more lenient on minor risks' : 'balanced approach'})
- Prioritizes Flexibility: ${riskPreferences.prioritizeFlexibility ? 'YES - flag clauses that limit flexibility' : 'No'}
- Can Tolerate Arbitration: ${riskPreferences.tolerateArbitration ? 'YES - arbitration is acceptable' : 'NO - flag arbitration clauses'}
- Wants Easy Termination: ${riskPreferences.wantEasyTermination ? 'YES - flag difficult termination clauses' : 'No strong preference'}
Adjust risk scoring and negotiation priorities based on these preferences.` : '';

  return `Analyze this contract and provide a comprehensive analysis with negotiation suggestions.

INDUSTRY MODE: ${industryMode.toUpperCase()}
${playbook}
${preferencesText}

CONTRACT TEXT:
${contractText}

CRITICAL OUTPUT INSTRUCTIONS:
1. Emit "riskFlags" FIRST in your JSON — before "summary", "keyTerms", and all other fields. This ensures the most important content is never truncated.
2. If you run out of output space, truncate the summary or keyTerms — NEVER truncate riskFlags.
3. Find ALL risk flags in the contract. Do not stop at 3 or 5. A complex contract should have 8–15 flags.
4. For every riskFlag with isStandard: true, include a "standardNote" field: one sentence explaining what benchmark makes it standard (e.g. "30-day termination notice is the industry norm for SaaS contracts").
5. For every riskFlag with isStandard: false, include an "unusualNote" field: one sentence explaining why it stands out vs. the norm (e.g. "90-day notice heavily favours the vendor — most SaaS contracts use 30 days").

Provide your analysis as a JSON object with this exact structure (riskFlags MUST come first):
{
  "riskFlags": [
    {
      "title": "Short descriptive title",
      "severity": "Low | Medium | High",
      "explanation": "Plain English explanation of why this is risky",
      "clauseQuote": "Exact short quote from the contract (max 100 words)",
      "clauseReference": "Section number or heading reference",
      "confidence": 0.0 to 1.0,
      "isStandard": true/false (whether this is commonly seen in this contract type),
      "standardNote": "REQUIRED if isStandard=true: one sentence on what makes it standard",
      "unusualNote": "REQUIRED if isStandard=false: one sentence on why it's unusual vs the norm",
      "negotiation": {
        "whatItDoes": "What this clause actually does",
        "whyItsRisky": "Why it's problematic for the signer",
        "suggestedChangePlain": "Plain English version of a fairer clause",
        "suggestedChangeFormal": "Formal legal language alternative (optional)",
        "negotiationScript": "What to say: 'I'm okay signing if we adjust X to Y...'"
      }
    }
  ],
  "verdict": {
    "riskScore": 0-100 (0 = very safe, 100 = do not sign),
    "verdict": "Safe | Caution | High Risk | Do Not Sign",
    "topRisks": [
      {"title": "Risk title", "clauseReference": "Section X", "severity": "High"}
    ],
    "negotiationPriorities": ["First thing to negotiate", "Second priority", "Third priority"],
    "reasoning": "2-3 sentence explanation of the score and verdict, grounded in contract text"
  },
  "summary": {
    "whatItIs": "Plain English description of the contract type and purpose",
    "partiesInvolved": ["Party 1 name/role", "Party 2 name/role"],
    "userObligations": ["Obligation 1", "Obligation 2"],
    "otherPartyObligations": ["Obligation 1", "Obligation 2"],
    "datesAndTerms": "Key dates, duration, renewal terms if found"
  },
  "keyTerms": [
    {
      "category": "Payment/Price | Term Length | Cancellation/Termination | Renewal | Liability/Indemnity | Dispute Resolution | Governing Law | Confidentiality/IP",
      "value": "The actual term value found",
      "notes": "Any important context"
    }
  ],
  "clarifyingQuestions": [
    {
      "id": "q1",
      "question": "Question text if key info is missing or ambiguous",
      "options": ["Option 1", "Option 2"]
    }
  ],
  "overallAssessment": "A 2-3 sentence overall assessment answering 'Should I sign this?' Include specific recommendations.",
  "contractType": "lease | employment | freelance | nda | service | purchase | insurance | subscription | other"
}

RISK SCORE GUIDELINES:
- 0-25: Safe - Standard terms, no major concerns
- 26-50: Caution - Some concerning clauses worth negotiating
- 51-75: High Risk - Multiple problematic clauses, negotiate before signing
- 76-100: Do Not Sign - Severely one-sided terms, significant risks

For each High or Medium risk, MUST include a negotiation object with specific suggestions.`;
}

const EXPLAIN_PROMPT = `Explain this contract clause in plain English. Be concise but thorough. The user selected this text:

"{selectedText}"

Explain:
1. What this means in plain English
2. Why it matters to the person signing
3. Any potential concerns

Keep your response under 150 words.`;

export async function analyzeContract(
  contractText: string,
  industryMode: IndustryMode = "general",
  riskPreferences?: RiskPreferences
): Promise<AnalysisResult & { contractType?: string }> {
  const prompt = buildAnalysisPrompt(contractText.slice(0, 50000), industryMode, riskPreferences);

  const response = await openai.chat.completions.create({
    model: FULL_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 6000,
  });

  const content = response.choices[0]?.message?.content || "{}";
  
  try {
    const parsed = JSON.parse(content);
    
    // Validate and sanitize risk flags - ensure each has required grounding
    const validatedRiskFlags = (parsed.riskFlags || [])
      .map((r: any) => ({
        title: r.title || "Potential Risk",
        severity: ["Low", "Medium", "High"].includes(r.severity) ? r.severity : "Medium",
        explanation: r.explanation || "",
        clauseQuote: r.clauseQuote || r.quote || "",
        clauseReference: r.clauseReference || r.reference || "See contract",
        confidence: typeof r.confidence === "number" ? Math.max(0, Math.min(1, r.confidence)) : 0.7,
        isStandard: r.isStandard,
        standardNote: r.standardNote || undefined,
        unusualNote: r.unusualNote || undefined,
        negotiation: r.negotiation ? {
          whatItDoes: r.negotiation.whatItDoes || "",
          whyItsRisky: r.negotiation.whyItsRisky || "",
          suggestedChangePlain: r.negotiation.suggestedChangePlain || "",
          suggestedChangeFormal: r.negotiation.suggestedChangeFormal,
          negotiationScript: r.negotiation.negotiationScript || "",
        } : undefined,
      }))
      .filter((r: any) => {
        // Enforce grounding requirement: must have clause quote
        if (!r.clauseQuote || r.clauseQuote.length < 10) {
          console.warn(`Filtered out risk "${r.title}" - missing or too short clause quote`);
          return false;
        }
        return true;
      });
    
    // Validate verdict
    const verdict: Verdict | undefined = parsed.verdict ? {
      riskScore: Math.max(0, Math.min(100, parsed.verdict.riskScore || 50)),
      verdict: ["Safe", "Caution", "High Risk", "Do Not Sign"].includes(parsed.verdict.verdict) 
        ? parsed.verdict.verdict 
        : "Caution",
      topRisks: (parsed.verdict.topRisks || []).slice(0, 3).map((r: any) => ({
        title: r.title || "",
        clauseReference: r.clauseReference || "",
        severity: r.severity || "Medium",
      })),
      negotiationPriorities: (parsed.verdict.negotiationPriorities || []).slice(0, 3),
      reasoning: parsed.verdict.reasoning || "Contract-based reasoning not available.",
    } : undefined;

    // Validate and sanitize the response
    const result: AnalysisResult & { contractType?: string } = {
      summary: {
        whatItIs: parsed.summary?.whatItIs || "Unable to determine contract type",
        partiesInvolved: parsed.summary?.partiesInvolved || [],
        userObligations: parsed.summary?.userObligations || [],
        otherPartyObligations: parsed.summary?.otherPartyObligations || [],
        datesAndTerms: parsed.summary?.datesAndTerms,
      },
      keyTerms: (parsed.keyTerms || []).map((t: any) => ({
        category: t.category || "Other",
        value: t.value || "Not specified",
        notes: t.notes,
      })),
      riskFlags: validatedRiskFlags,
      clarifyingQuestions: parsed.clarifyingQuestions?.map((q: any, i: number) => ({
        id: q.id || `q${i + 1}`,
        question: q.question || "",
        options: q.options,
      })).filter((q: ClarifyingQuestion) => q.question) || [],
      overallAssessment: parsed.overallAssessment,
      verdict,
      industryMode,
      contractType: parsed.contractType,
    };

    return result;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Failed to analyze contract");
  }
}

// ============================================
// Chunked Analysis for Long Contracts
// ============================================

const CHUNK_SIZE = 15000;
const CHUNK_OVERLAP = 2000;
const CHUNK_THRESHOLD = 45000;

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_THRESHOLD) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function mergeAnalysisResults(
  results: Array<AnalysisResult & { contractType?: string }>,
  industryMode: IndustryMode
): AnalysisResult & { contractType?: string } {
  if (results.length === 0) throw new Error("No analysis results to merge");
  if (results.length === 1) return results[0];

  // Risk flags: deduplicate by normalised title + clauseReference
  const seenFlags = new Set<string>();
  const allFlags: RiskFlag[] = [];
  for (const r of results) {
    for (const flag of r.riskFlags) {
      const key = normaliseTitle(flag.title) + "|" + flag.clauseReference;
      if (!seenFlags.has(key)) {
        seenFlags.add(key);
        allFlags.push(flag);
      }
    }
  }
  // Sort: High → Medium → Low
  const severityOrder = { High: 0, Medium: 1, Low: 2 };
  allFlags.sort((a, b) => (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1));

  // Key terms: deduplicate by category+value
  const seenTerms = new Set<string>();
  const allKeyTerms: typeof results[0]["keyTerms"] = [];
  for (const r of results) {
    for (const term of r.keyTerms) {
      const key = (term.category + "|" + term.value).toLowerCase();
      if (!seenTerms.has(key)) {
        seenTerms.add(key);
        allKeyTerms.push(term);
      }
    }
  }

  // Verdict: take highest risk score
  const verdicts = results.map(r => r.verdict).filter(Boolean) as Verdict[];
  let mergedVerdict: Verdict | undefined;
  if (verdicts.length > 0) {
    const highest = verdicts.reduce((a, b) => a.riskScore >= b.riskScore ? a : b);
    const allTopRisks = verdicts.flatMap(v => v.topRisks);
    const seenTopRisks = new Set<string>();
    const dedupedTopRisks = allTopRisks.filter(r => {
      const k = normaliseTitle(r.title);
      if (seenTopRisks.has(k)) return false;
      seenTopRisks.add(k);
      return true;
    }).slice(0, 3);
    const allPriorities = verdicts.flatMap(v => v.negotiationPriorities);
    const seenPriorities = new Set<string>();
    const dedupedPriorities = allPriorities.filter(p => {
      const k = p.toLowerCase().trim();
      if (seenPriorities.has(k)) return false;
      seenPriorities.add(k);
      return true;
    }).slice(0, 3);
    const score = highest.riskScore;
    const verdictLabel: Verdict["verdict"] =
      score >= 76 ? "Do Not Sign" :
      score >= 51 ? "High Risk" :
      score >= 26 ? "Caution" : "Safe";
    mergedVerdict = {
      riskScore: score,
      verdict: verdictLabel,
      topRisks: dedupedTopRisks,
      negotiationPriorities: dedupedPriorities,
      reasoning: highest.reasoning,
    };
  }

  // Summary: use first chunk's summary (it has the contract start)
  const summary = results[0].summary;

  // Overall assessment: use the one from the highest-risk chunk
  const highestRiskResult = results.reduce((a, b) =>
    (a.verdict?.riskScore ?? 0) >= (b.verdict?.riskScore ?? 0) ? a : b
  );

  // Clarifying questions: merge and deduplicate
  const seenQuestions = new Set<string>();
  const allQuestions: ClarifyingQuestion[] = [];
  for (const r of results) {
    for (const q of (r.clarifyingQuestions || [])) {
      const k = q.question.toLowerCase().trim();
      if (!seenQuestions.has(k)) {
        seenQuestions.add(k);
        allQuestions.push(q);
      }
    }
  }

  // Contract type: first non-null
  const contractType = results.map(r => r.contractType).find(Boolean);

  return {
    summary,
    keyTerms: allKeyTerms,
    riskFlags: allFlags,
    clarifyingQuestions: allQuestions,
    overallAssessment: highestRiskResult.overallAssessment,
    verdict: mergedVerdict,
    industryMode,
    contractType,
  };
}

// ============================================
// Validation Pass — Score Confirmation
// ============================================

async function validateAndAdjustScore(
  contractText: string,
  result: AnalysisResult & { contractType?: string }
): Promise<{ confirmedScore: number; adjustmentReason: string | null }> {
  if (!result.verdict) return { confirmedScore: 0, adjustmentReason: null };

  const topFlagTitles = result.riskFlags
    .slice(0, 3)
    .map(f => `- ${f.title} (${f.severity})`)
    .join("\n");
  const preview = contractText.slice(0, 8000);
  const originalScore = result.verdict.riskScore;

  const prompt = `You are a contract risk validator. A primary AI assigned a risk score of ${originalScore}/100 to this contract.

TOP 3 RISK FLAGS IDENTIFIED:
${topFlagTitles}

CONTRACT EXCERPT (first 8000 chars):
${preview}

Task: Review the risk score of ${originalScore}/100. Respond ONLY with JSON:
{
  "confirmedScore": <integer 0-100>,
  "adjustmentReason": "<one sentence explaining any change, or null if score is confirmed>"
}

Rules:
- Your confirmedScore must be within ±15 of the original score (${Math.max(0, originalScore - 15)} to ${Math.min(100, originalScore + 15)}).
- If the score seems accurate, return the same score with adjustmentReason: null.
- Only adjust if you see a clear mismatch between the risk flags and the score.`;

  try {
    const response = await openai.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        { role: "system", content: "You are a contract risk validator. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256,
    });
    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const raw = typeof parsed.confirmedScore === "number" ? parsed.confirmedScore : originalScore;
    // Cap adjustment at ±15
    const confirmedScore = Math.max(
      Math.max(0, originalScore - 15),
      Math.min(Math.min(100, originalScore + 15), raw)
    );
    return {
      confirmedScore,
      adjustmentReason: parsed.adjustmentReason || null,
    };
  } catch (err) {
    console.warn("Validation pass failed, using original score:", err);
    return { confirmedScore: originalScore, adjustmentReason: null };
  }
}

export async function analyzeContractChunked(
  contractText: string,
  industryMode: IndustryMode = "general",
  riskPreferences?: RiskPreferences
): Promise<AnalysisResult & { contractType?: string }> {
  const chunks = splitIntoChunks(contractText);
  let result: AnalysisResult & { contractType?: string };

  if (chunks.length === 1) {
    result = await analyzeContract(contractText, industryMode, riskPreferences);
  } else {
    console.log(`Analyzing contract in ${chunks.length} chunks (${contractText.length} chars total)`);
    const results = await Promise.all(
      chunks.map((chunk, i) => {
        const header = chunks.length > 1 ? `[PART ${i + 1} OF ${chunks.length}]\n` : "";
        return analyzeContract(header + chunk, industryMode, riskPreferences);
      })
    );
    result = mergeAnalysisResults(results, industryMode);
  }

  // Validation pass: confirm or adjust the risk score with a fast secondary check
  if (result.verdict) {
    const { confirmedScore, adjustmentReason } = await validateAndAdjustScore(contractText, result);
    if (confirmedScore !== result.verdict.riskScore) {
      console.log(`Validation pass adjusted score: ${result.verdict.riskScore} → ${confirmedScore}. Reason: ${adjustmentReason}`);
      const verdictLabel: Verdict["verdict"] =
        confirmedScore >= 76 ? "Do Not Sign" :
        confirmedScore >= 51 ? "High Risk" :
        confirmedScore >= 26 ? "Caution" : "Safe";
      result = {
        ...result,
        verdict: {
          ...result.verdict,
          riskScore: confirmedScore,
          verdict: verdictLabel,
          reasoning: adjustmentReason
            ? `${result.verdict.reasoning} [Score adjusted: ${adjustmentReason}]`
            : result.verdict.reasoning,
        },
      };
    }
  }

  return result;
}

export async function explainClause(selectedText: string): Promise<string> {
  const prompt = EXPLAIN_PROMPT.replace("{selectedText}", selectedText.slice(0, 2000));

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You are a helpful contract analyst explaining legal terms in plain English. Be concise and practical." },
      { role: "user", content: prompt },
    ],
    max_completion_tokens: 512,
  });

  return response.choices[0]?.message?.content || "Unable to explain this text.";
}

export async function reanalyzeWithAnswers(
  contractText: string,
  previousAnalysis: AnalysisResult,
  answers: Record<string, string>
): Promise<AnalysisResult> {
  const answersText = Object.entries(answers)
    .map(([id, answer]) => {
      const question = previousAnalysis.clarifyingQuestions?.find(q => q.id === id);
      return `Q: ${question?.question || id}\nA: ${answer}`;
    })
    .join("\n\n");

  const prompt = `Based on the user's answers to clarifying questions, update the contract analysis.

CONTRACT TEXT:
${contractText.slice(0, 40000)}

USER'S ANSWERS:
${answersText}

PREVIOUS ANALYSIS:
${JSON.stringify(previousAnalysis, null, 2)}

Provide an updated analysis incorporating these answers. Return JSON with the same structure as before, but with clarifyingQuestions removed or updated based on answers received.`;

  const response = await openai.chat.completions.create({
    model: FULL_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  return {
    summary: parsed.summary || previousAnalysis.summary,
    keyTerms: parsed.keyTerms || previousAnalysis.keyTerms,
    riskFlags: parsed.riskFlags || previousAnalysis.riskFlags,
    clarifyingQuestions: parsed.clarifyingQuestions?.filter((q: any) => !answers[q.id]) || [],
    overallAssessment: parsed.overallAssessment || previousAnalysis.overallAssessment,
    verdict: parsed.verdict || previousAnalysis.verdict,
    industryMode: previousAnalysis.industryMode,
  };
}

export async function compareContracts(
  contract1Text: string,
  contract2Text: string,
  analysis1: AnalysisResult
): Promise<{
  changes: Array<{ type: "added" | "removed" | "modified"; description: string; riskImpact: "increased" | "decreased" | "neutral" }>;
  newRiskScore: number;
  previousRiskScore: number;
  summary: string;
}> {
  const prompt = `Compare these two contract versions and identify what changed.

VERSION 1 (Original):
${contract1Text.slice(0, 25000)}

VERSION 2 (New):
${contract2Text.slice(0, 25000)}

PREVIOUS ANALYSIS RISK SCORE: ${analysis1.verdict?.riskScore || 50}

Return a JSON object with:
{
  "changes": [
    {
      "type": "added | removed | modified",
      "description": "What changed in plain English",
      "riskImpact": "increased | decreased | neutral"
    }
  ],
  "newRiskScore": 0-100,
  "previousRiskScore": ${analysis1.verdict?.riskScore || 50},
  "summary": "Overall summary of changes and whether v2 is better or worse for the signer"
}`;

  const response = await openai.chat.completions.create({
    model: FULL_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const base64Image = imageBuffer.toString("base64");
  const mimeType = "image/png";

  const response = await openai.chat.completions.create({
    model: FULL_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all text from this contract/document image. Preserve the structure and formatting as much as possible. Return only the extracted text, nothing else.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_completion_tokens: 4096,
  });

  return response.choices[0]?.message?.content || "";
}

// ============================================
// V3 - Living Legal Guardian Layer AI Functions
// ============================================

// Quick Scan (Red Flag Shield) - instant clause analysis
export async function quickAnalyzeClause(text: string): Promise<{
  riskLevel: "safe" | "caution" | "danger";
  flags: { issue: string; explanation: string; severity: string }[];
  summary: string;
}> {
  const prompt = `Analyze this text/clause for legal risks. Be direct and helpful.

TEXT TO ANALYZE:
${text}

Respond in JSON with:
{
  "riskLevel": "safe" | "caution" | "danger",
  "flags": [{ "issue": "Brief issue title", "explanation": "Plain English explanation", "severity": "Low|Medium|High" }],
  "summary": "One sentence summary of what this text means for the person"
}

GUIDELINES:
- "danger" = contains clauses that could seriously harm the reader (waivers of rights, unlimited liability, etc.)
- "caution" = has concerning clauses that should be negotiated
- "safe" = standard/fair terms
- Keep explanations simple and actionable`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You are a legal analyst who explains contract language in plain English. Focus on protecting ordinary people from legal traps." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

// Extract obligations from a contract for monitoring
export async function extractObligations(contractText: string, analysis: any): Promise<{
  title: string;
  description: string;
  type: string;
  dueDate: string | null;
  reminderDays: number;
  isRecurring: boolean;
  recurringInterval: string | null;
}[]> {
  const prompt = `Extract all obligations, deadlines, and important dates from this contract.

CONTRACT TEXT:
${contractText.slice(0, 8000)}

EXISTING ANALYSIS SUMMARY:
${analysis?.summary?.whatItIs || "N/A"}
Key Terms: ${JSON.stringify(analysis?.keyTerms?.slice(0, 5) || [])}

Extract obligations in JSON format:
{
  "obligations": [
    {
      "title": "Brief title (e.g., 'Monthly Rent Payment')",
      "description": "What needs to be done",
      "type": "payment|deliverable|renewal|termination_window|deadline",
      "dueDate": "YYYY-MM-DD or null if ongoing",
      "reminderDays": 7,
      "isRecurring": true/false,
      "recurringInterval": "daily|weekly|monthly|yearly" or null
    }
  ]
}

Focus on:
- Payment deadlines (rent, invoices, fees)
- Renewal/cancellation windows
- Deliverable deadlines
- Notice periods
- Termination windows`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You are a contract analyst extracting actionable obligations and deadlines." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return parsed.obligations || [];
}

// Negotiation coach - generate draft replies
export async function generateNegotiationReplies(
  counterpartyMessage: string,
  context?: { contractType?: string; riskFlags?: any[]; userGoals?: string }
): Promise<{
  strategy: string;
  replies: { tone: string; message: string }[];
}> {
  const prompt = `The user is negotiating a contract. The other party just said:

"${counterpartyMessage}"

${context?.contractType ? `Contract type: ${context.contractType}` : ""}
${context?.riskFlags ? `Key concerns: ${context.riskFlags.map(r => r.title).join(", ")}` : ""}
${context?.userGoals ? `User's goals: ${context.userGoals}` : ""}

Provide negotiation strategy and draft replies in 3 tones.

Respond in JSON:
{
  "strategy": "Brief negotiation strategy advice (1-2 sentences)",
  "replies": [
    { "tone": "Firm", "message": "Direct but professional response..." },
    { "tone": "Friendly", "message": "Warm and collaborative response..." },
    { "tone": "Professional", "message": "Balanced, formal response..." }
  ]
}

GUIDELINES:
- Keep replies concise (2-4 sentences each)
- Make the user sound competent and confident
- Focus on achieving a fair outcome
- Never be aggressive or threatening`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You are a negotiation coach helping ordinary people negotiate contracts confidently. Your tone is supportive and empowering." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}

// Emergency mode - analyze user's legal situation
export async function emergencyAnalysis(
  issue: string,
  signedContracts: any[]
): Promise<{
  relevantContracts: { id: number; name: string; relevance: string }[];
  relevantClauses: { contractId: number; clause: string; implication: string }[];
  immediateSteps: string[];
  lawyerSummary: string;
}> {
  const contractSummaries = signedContracts.map(sc => ({
    id: sc.id,
    contractId: sc.contractId,
    counterparty: sc.counterpartyName,
    signedDate: sc.signedDate,
  }));

  const prompt = `The user has a legal problem and needs help.

USER'S ISSUE:
"${issue}"

THEIR SIGNED CONTRACTS:
${JSON.stringify(contractSummaries, null, 2)}

Analyze and respond in JSON:
{
  "relevantContracts": [
    { "id": 1, "name": "Contract name", "relevance": "Why this contract is relevant" }
  ],
  "relevantClauses": [
    { "contractId": 1, "clause": "Quote the relevant clause", "implication": "What this means for them" }
  ],
  "immediateSteps": [
    "First thing they should do",
    "Second thing they should do"
  ],
  "lawyerSummary": "A brief summary they can share with a lawyer if needed"
}

GUIDELINES:
- Be calm and reassuring
- Focus on actionable steps
- If the issue is serious, recommend consulting a lawyer
- Never provide specific legal advice`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You are a legal triage assistant helping people understand their legal situation in plain English. You are supportive and focus on practical next steps." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2048,
  });

  const emergencyContent = response.choices[0]?.message?.content || "{}";
  return JSON.parse(emergencyContent);
}

// Explain Like I'm 12 - super simple explanation with real-world example
export async function explainLikeImTwelve(
  clauseText: string,
  riskTitle?: string
): Promise<{
  simpleExplanation: string;
  realWorldExample: string;
  bottomLine: string;
}> {
  const prompt = `Explain this contract clause like you're explaining to a 12-year-old. Use simple words and a relatable real-world example.

CLAUSE:
"${clauseText}"
${riskTitle ? `\nRISK: ${riskTitle}` : ""}

Respond in JSON:
{
  "simpleExplanation": "A super simple explanation using everyday words (2-3 sentences max)",
  "realWorldExample": "A relatable real-world example using everyday situations kids understand",
  "bottomLine": "The one thing to remember (one sentence starting with 'This means...')"
}

GUIDELINES:
- NO legal jargon at all
- Use examples like: lending toys, allowance, playground rules, borrowing games
- Keep it SHORT and CLEAR`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You explain complex legal concepts in the simplest possible way. Think: how would you explain this to your little sibling?" },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 512,
  });

  const eli12Content = response.choices[0]?.message?.content || "{}";
  return JSON.parse(eli12Content);
}

// Is This Normal? - Check if a clause is standard or unusual
export async function isThisNormal(
  clauseText: string,
  contractType: string,
  industryMode: string = "general"
): Promise<{
  isNormal: boolean;
  verdict: "Common" | "Unusual" | "Red Flag";
  explanation: string;
  frequency: string;
  betterAlternative?: string;
}> {
  const prompt = `Analyze whether this clause is normal/standard for its contract type.

CLAUSE:
"${clauseText}"

CONTRACT TYPE: ${contractType}
INDUSTRY: ${industryMode}

Respond in JSON:
{
  "isNormal": true/false,
  "verdict": "Common" or "Unusual" or "Red Flag",
  "explanation": "Why this is common/unusual (1-2 sentences)",
  "frequency": "How often this is seen (e.g., 'Very common - seen in ~80% of contracts', 'Rare - only ~10% include this')",
  "betterAlternative": "If unusual, what would be more standard (optional, omit if common)"
}

GUIDELINES:
- Be honest but not alarmist
- Base on typical industry patterns
- "Common" = standard, expected
- "Unusual" = not typical but not necessarily bad
- "Red Flag" = rarely seen and usually disadvantageous`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You are an expert on contract patterns and industry standards. You help people understand if clauses are typical or unusual." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 512,
  });

  const normalContent = response.choices[0]?.message?.content || "{}";
  return JSON.parse(normalContent);
}

// What If? Simulator - answer scenario questions based on contract
export async function whatIfSimulator(
  scenario: string,
  contractText: string,
  contractType: string
): Promise<{
  answer: string;
  relevantClauses: { quote: string; explanation: string }[];
  worstCase: string;
  bestCase: string;
  advice: string;
}> {
  const prompt = `The user wants to know what happens in a specific scenario based on their contract.

SCENARIO:
"${scenario}"

CONTRACT TYPE: ${contractType}

CONTRACT TEXT (relevant excerpts):
${contractText.substring(0, 8000)}

Respond in JSON:
{
  "answer": "Clear answer to what would happen (2-3 sentences)",
  "relevantClauses": [
    { "quote": "Exact quote from contract", "explanation": "What this means for the scenario" }
  ],
  "worstCase": "What could happen in the worst case (1 sentence)",
  "bestCase": "What could happen in the best case (1 sentence)",
  "advice": "Practical advice for this scenario (1-2 sentences)"
}

GUIDELINES:
- Base EVERYTHING on the actual contract text
- If the contract doesn't address this scenario, say so
- Be practical and helpful
- Never invent clauses`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You help people understand their contract by answering 'what if' questions. You only reference actual contract text." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 1024,
  });

  const whatIfContent = response.choices[0]?.message?.content || "{}";
  return JSON.parse(whatIfContent);
}

// Share-Safe Summary - generate a non-legal summary for sharing
export async function generateShareSafeSummary(
  contractName: string,
  analysis: any
): Promise<{
  summary: string;
  keyPoints: string[];
  concerns: string[];
  recommendation: string;
}> {
  const prompt = `Generate a brief, non-legal summary of this contract analysis that someone could share with their partner, parent, or friend.

CONTRACT: ${contractName}
RISK SCORE: ${analysis.verdict?.riskScore || 'Unknown'}
VERDICT: ${analysis.verdict?.verdict || 'Unknown'}
TOP RISKS: ${analysis.verdict?.topRisks?.map((r: any) => r.title).join(", ") || 'None'}
KEY TERMS: ${analysis.keyTerms?.slice(0, 3).map((t: any) => `${t.category}: ${t.value}`).join("; ") || 'None'}

Respond in JSON:
{
  "summary": "A 2-3 sentence casual summary anyone can understand",
  "keyPoints": ["3-4 main things to know about this contract"],
  "concerns": ["Any concerns worth discussing (0-3 items)"],
  "recommendation": "A simple recommendation (e.g., 'Looks okay to sign', 'Worth discussing the termination fee first')"
}

GUIDELINES:
- Write like you're texting a friend
- NO legal jargon
- Be honest but not scary
- Focus on what matters most`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You write casual, friendly summaries that anyone can understand. Think: how would you explain this contract to your mom?" },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 512,
  });

  const shareSafeContent = response.choices[0]?.message?.content || "{}";
  return JSON.parse(shareSafeContent);
}

// ============================================
// V2 - Screenshot Intelligence + Universal Clarity Engine
// ============================================

export async function screenshotIntelligence(text: string, inputType: string = "text"): Promise<{
  whatItIs: string;
  whyItMatters: string;
  whatToDoNext: string;
  deadline: string | null;
  consequenceOfIgnoring: string;
  whatsTheCatch: string | null;
  riskLevel: "safe" | "caution" | "danger";
  flags: { issue: string; explanation: string; severity: string }[];
  summary: string;
}> {
  const prompt = `Analyze this ${inputType === "image" ? "screenshot/image text" : "text"} that someone has shared for clarity and guidance.

TEXT:
"${text.substring(0, 6000)}"

Respond in JSON:
{
  "whatItIs": "What is this document/message/text (1 sentence)",
  "whyItMatters": "Why should they care about this (1-2 sentences)",
  "whatToDoNext": "Clear next steps they should take (2-3 actionable items)",
  "deadline": "Any deadline mentioned (null if none found)",
  "consequenceOfIgnoring": "What happens if they do nothing (1-2 sentences)",
  "whatsTheCatch": "Hidden risks or concerns they might miss (null if genuinely straightforward)",
  "riskLevel": "safe" or "caution" or "danger",
  "flags": [
    { "issue": "Issue title", "explanation": "Why this matters", "severity": "Low/Medium/High" }
  ],
  "summary": "One-paragraph plain-English summary"
}

GUIDELINES:
- Be practical, not alarmist
- Write like you're helping a friend understand something confusing
- Focus on ACTION - what should they actually DO
- If it's genuinely harmless, say so clearly
- Look for hidden fees, auto-renewals, deadlines, commitments
- The "whatsTheCatch" should reveal non-obvious concerns`;

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages: [
      { role: "system", content: "You are a personal advocate who helps people understand confusing documents, messages, emails, and notices. You cut through complexity and tell them what actually matters, what to do, and what to watch out for." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 1024,
  });

  const result = response.choices[0]?.message?.content || "{}";
  return JSON.parse(result);
}

// V2 - Ask-Anytime Advocate Chat (Memory-Enabled)
export async function advocateChat(
  userMessage: string,
  chatHistory: { role: string; content: string }[],
  context: {
    contracts?: { name: string; type: string; riskScore?: number; status: string }[];
    obligations?: { title: string; dueDate?: string; status: string; type: string }[];
    recurringObligations?: { title: string; category: string; nextDueDate?: string; amount?: string; provider?: string }[];
    memories?: { category: string; title: string; content: string }[];
    riskProfile?: string;
  }
): Promise<{
  response: string;
  referencedContracts?: number[];
  memoryUpdate?: { category: string; title: string; content: string } | null;
}> {
  const contextParts: string[] = [];
  
  if (context.contracts?.length) {
    contextParts.push(`USER'S CONTRACTS:\n${context.contracts.map(c => 
      `- ${c.name} (${c.type}, Risk: ${c.riskScore ?? 'N/A'}, Status: ${c.status})`
    ).join("\n")}`);
  }
  
  if (context.obligations?.length) {
    contextParts.push(`UPCOMING OBLIGATIONS:\n${context.obligations.map(o => 
      `- ${o.title} (${o.type}, Due: ${o.dueDate || 'No date'}, ${o.status})`
    ).join("\n")}`);
  }

  if (context.recurringObligations?.length) {
    contextParts.push(`RECURRING OBLIGATIONS:\n${context.recurringObligations.map(r =>
      `- ${r.title} (${r.category}, ${r.amount || ''}, Next: ${r.nextDueDate || 'N/A'}, Provider: ${r.provider || 'Unknown'})`
    ).join("\n")}`);
  }
  
  if (context.memories?.length) {
    contextParts.push(`USER'S STORED MEMORIES/PREFERENCES:\n${context.memories.map(m => 
      `- [${m.category}] ${m.title}: ${m.content}`
    ).join("\n")}`);
  }
  
  if (context.riskProfile) {
    contextParts.push(`USER'S RISK PROFILE: ${context.riskProfile}`);
  }

  const systemPrompt = `You are a personal advocate and advisor - not just for legal matters, but for any situation where someone needs calm, clear guidance. You have access to the user's history and preferences.

${contextParts.length ? "USER CONTEXT:\n" + contextParts.join("\n\n") : "No stored context yet."}

RULES:
1. Be calm, clear, and supportive
2. Reference the user's stored data when relevant (mention specific contracts, obligations by name)
3. Never invent legal citations
4. Give practical, actionable advice
5. If something requires a professional (lawyer, accountant), say so clearly
6. Adapt your tone to the urgency - casual for simple questions, serious for urgent matters
7. If you learn something important about the user's preferences or situation, include a memoryUpdate

Respond in JSON:
{
  "response": "Your clear, helpful response",
  "referencedContracts": [],
  "memoryUpdate": null or { "category": "preference|boundary|life_event|dispute|risk_tolerance", "title": "Brief title", "content": "What to remember" }
}`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-20).map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: FAST_MODEL,
    messages,
    response_format: { type: "json_object" },
    max_completion_tokens: 1024,
  });

  const result = response.choices[0]?.message?.content || '{"response": "I\'m sorry, I couldn\'t process that. Please try again."}';
  return JSON.parse(result);
}
