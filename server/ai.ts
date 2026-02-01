import OpenAI from "openai";
import type { AnalysisResult, Summary, KeyTerm, RiskFlag, ClarifyingQuestion } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are an expert contract analyst with the skills of a top-tier contract attorney, risk auditor, and plain-language explainer. Your role is to protect ordinary people from bad contract decisions.

CRITICAL RULES:
1. NO LAW INVENTION: Never claim anything is "illegal" or cite specific statutes. Instead say "This clause may increase your risk because..."
2. GROUNDING REQUIRED: Every risk flag MUST reference an exact quote from the contract text. If no clause supports a risk, do not mention it.
3. UNCERTAINTY HANDLING: If your confidence in an assessment is below 0.70, explicitly state "This is ambiguous; consider professional review."
4. ALWAYS include the disclaimer that this is informational, not legal advice.

When analyzing contracts:
- Translate legal jargon into plain English
- Identify who benefits from each clause
- Expose hidden traps, automatic renewals, unfair terms
- Be specific about what the user should change or negotiate
- Answer the implicit question: "Should I sign this?"

Respond ONLY with valid JSON matching the required schema. Do not include any other text.`;

const ANALYSIS_PROMPT = `Analyze this contract and provide a comprehensive analysis in JSON format:

CONTRACT TEXT:
{contractText}

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
      "confidence": 0.0 to 1.0
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
  "contractType": "lease | employment | freelance | nda | service | purchase | other"
}

Focus on risks that matter most to ordinary people: payment terms, cancellation fees, automatic renewals, liability limits, and dispute resolution.`;

const EXPLAIN_PROMPT = `Explain this contract clause in plain English. Be concise but thorough. The user selected this text:

"{selectedText}"

Explain:
1. What this means in plain English
2. Why it matters to the person signing
3. Any potential concerns

Keep your response under 150 words.`;

export async function analyzeContract(contractText: string): Promise<AnalysisResult & { contractType?: string }> {
  const prompt = ANALYSIS_PROMPT.replace("{contractText}", contractText.slice(0, 50000));

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
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
      }))
      .filter((r: any) => {
        // Enforce grounding requirement: must have clause quote
        if (!r.clauseQuote || r.clauseQuote.length < 10) {
          console.warn(`Filtered out risk "${r.title}" - missing or too short clause quote`);
          return false;
        }
        return true;
      });
    
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
    model: "gpt-5.2",
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
    model: "gpt-5.2",
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
  };
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const base64Image = imageBuffer.toString("base64");
  const mimeType = "image/png";

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
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
