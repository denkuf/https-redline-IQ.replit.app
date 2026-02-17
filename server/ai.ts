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
  general: `Focus on universal contract risks: unclear terms, hidden fees, unfair termination, one-sided liability.`,
  
  rent_lease: `RENT/LEASE MODE - Focus on:
- Security deposit terms and return conditions
- Rent increase clauses and caps
- Maintenance responsibilities (who pays for what)
- Early termination fees and subletting restrictions
- Automatic renewal traps
- Entry/inspection rights
- Pet policies and extra fees
COMMONLY SEEN vs UNUSUAL: Mark clauses as "commonly seen" if typical for residential leases (e.g., 1-month security deposit), or flag if unusual (e.g., 3-month deposit, unlimited rent increases).`,

  employment: `EMPLOYMENT MODE - Focus on:
- Non-compete clauses (scope, duration, geography)
- Intellectual property assignment (especially for personal projects)
- Termination conditions (at-will vs for-cause)
- Severance terms
- Confidentiality scope
- Non-solicitation clauses
- Arbitration requirements
COMMONLY SEEN vs UNUSUAL: Mark standard employment terms vs unusually restrictive clauses.`,

  freelance: `FREELANCE/CONTRACTOR MODE - Focus on:
- Payment terms and schedules
- Scope creep protections
- Revision limits
- Kill fee / cancellation terms
- IP ownership transfer timing (upon payment vs immediately)
- Indemnification clauses
- Late payment penalties
COMMONLY SEEN vs UNUSUAL: 50% upfront is common, Net-60 payment is risky for freelancers.`,

  insurance: `INSURANCE MODE - Focus on:
- Exclusions and limitations
- Deductibles and caps
- Pre-existing condition clauses
- Claim procedures and timelines
- Cancellation terms
- Automatic renewal and rate changes
- Subrogation rights
COMMONLY SEEN vs UNUSUAL: Standard exclusions vs unusual limitations.`,

  saas_subscription: `SAAS/SUBSCRIPTION MODE - Focus on:
- Automatic renewal and cancellation notice periods
- Price change clauses
- Data ownership and portability
- Service level guarantees (SLA)
- Termination for convenience
- Usage limits and overage fees
- Indemnification for data breaches
COMMONLY SEEN vs UNUSUAL: Monthly billing is common, annual auto-renewal with 60+ day notice is risky.`,

  small_business: `SMALL BUSINESS/VENDOR MODE - Focus on:
- Payment terms (Net-30/60/90)
- Warranty and liability limits
- Exclusivity clauses
- Minimum order quantities
- Price adjustment rights
- Termination penalties
- Force majeure scope
COMMONLY SEEN vs UNUSUAL: Net-30 is standard, unlimited liability is unusual.`,
};

const SYSTEM_PROMPT = `You are an elite contract advocate with the skills of a top-tier contract attorney, risk auditor, and negotiation expert. Your role is to protect ordinary people from bad contract decisions and help them negotiate better terms.

CRITICAL RULES:
1. NO LAW INVENTION: Never claim anything is "illegal" or cite specific statutes. Instead say "This clause may increase your risk because..." or "This is commonly seen in this type of contract" vs "This is unusual and worth negotiating."
2. GROUNDING REQUIRED: Every risk flag MUST reference an exact quote from the contract text. If no clause supports a risk, do not mention it.
3. UNCERTAINTY HANDLING: If your confidence in an assessment is below 0.70, explicitly state "This is ambiguous; consider professional review."
4. ADVOCATE ROLE: Act as an advocate-grade analyzer that is grounded in text, transparent about uncertainty, and offers pathways to negotiate or seek human review.
5. This is INFORMATIONAL, not legal advice.

When analyzing contracts:
- Translate legal jargon into plain English
- Identify who benefits from each clause
- Expose hidden traps, automatic renewals, unfair terms
- Provide specific negotiation suggestions for risky clauses
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

Provide your analysis as a JSON object with this exact structure:
{
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
  "riskFlags": [
    {
      "title": "Short descriptive title",
      "severity": "Low | Medium | High",
      "explanation": "Plain English explanation of why this is risky",
      "clauseQuote": "Exact short quote from the contract (max 100 words)",
      "clauseReference": "Section number or heading reference",
      "confidence": 0.0 to 1.0,
      "isStandard": true/false (whether this is commonly seen in this contract type),
      "negotiation": {
        "whatItDoes": "What this clause actually does",
        "whyItsRisky": "Why it's problematic for the signer",
        "suggestedChangePlain": "Plain English version of a fairer clause",
        "suggestedChangeFormal": "Formal legal language alternative (optional)",
        "negotiationScript": "What to say: 'I'm okay signing if we adjust X to Y...'"
      }
    }
  ],
  "clarifyingQuestions": [
    {
      "id": "q1",
      "question": "Question text if key info is missing or ambiguous",
      "options": ["Option 1", "Option 2"]
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
    max_completion_tokens: 4096,
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
