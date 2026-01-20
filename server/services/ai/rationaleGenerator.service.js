import { createAgent, providerStrategy, tool } from "langchain";
import { z } from "zod";
import IP from "../../models/ip.model.js";

/* =====================================================
   STRUCTURED ADVISORY OUTPUT (SNAPSHOT-ALIGNED)
===================================================== */

export const AdvisoryAnalysisSchema = z.object({
    suggestedConflict: z.boolean(),

    confidence: z.number().min(0).max(1),

    claimAnalysis: z.array(
        z.object({
            targetClaim: z.number(),
            sourceClaims: z.array(z.number()),
            matchType: z.enum(["SINGLE", "COMBINED"]),
            rationale: z.string()
        })
    ),

    diagramSupport: z.object({
        used: z.boolean(),
        explanation: z.string().optional()
    }),

    reasoning: z.string()
});

/* =====================================================
   TOOL: FETCH CANDIDATE CLAIMS ONLY
===================================================== */

const getCandidateClaimsTool = tool(
    async ({ ipId }) => {
        const ip = await IP.findById(ipId);
        if (!ip) {
            return { error: "Candidate IP not found" };
        }

        return {
            title: ip.title,
            claims: (ip.ingestion?.structured?.claims || []).map(c => ({
                claimNo: c.claimNo,
                text: c.expandedText
            }))
        };
    },
    {
        name: "get_candidate_claims",
        description: "Fetch expanded claims of a candidate patent for claim-to-claim comparison",
        schema: z.object({ ipId: z.string() })
    }
);

const tools = [getCandidateClaimsTool];

/* =====================================================
   SYSTEM PROMPT (FINAL, LOCKED)
===================================================== */

const SYSTEM_PROMPT = `
You are an AI assistant supporting a human patent examiner.

STRICT RULES:
- You are NOT a legal authority.
- You provide ADVISORY analysis only.
- Focus STRICTLY on CLAIM-TO-CLAIM comparison.
- Ignore descriptions unless required for clarification.
- Ignore diagrams unless explicitly relevant.

ANTICIPATION STANDARD:
- A claim is anticipated ONLY if all essential elements are present.
- Partial overlap does NOT count.

CONFIDENCE CALIBRATION:
- If uncertain, confidence MUST be below 0.6.
- Use confidence above 0.7 ONLY if anticipation is clear.

OUTPUT REQUIREMENTS:
- Output structured data ONLY.
- Every anticipated claim MUST include:
  - targetClaim
  - sourceClaims
  - matchType
  - rationale
- Be concise, technical, and factual.
`;

/* =====================================================
   MAIN COMPARISON FUNCTION
===================================================== */

export async function runAgenticComparison(targetContext, candidateIpId) {
    try {
        const agent = createAgent({
            model: "groq:llama-3.3-70b-versatile",
            tools,
            responseFormat: providerStrategy(AdvisoryAnalysisSchema),
            temperature: 0
        });

        const result = await agent.invoke({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `
TARGET PATENT CLAIMS:
${JSON.stringify(targetContext.expandedClaims)}

CANDIDATE PATENT ID:
${candidateIpId}

Analyze whether any TARGET claim is anticipated by the CANDIDATE.
Provide claim-level structured analysis.
`
                }
            ]
        });

        const advisory = result.structuredResponse;

        /* =====================================================
           POST-VALIDATION (HALLUCINATION SAFETY)
        ===================================================== */

        const validTargetClaims = new Set(
            targetContext.expandedClaims.map(c => c.claimNo)
        );

        const sanitizedClaimAnalysis = advisory.claimAnalysis.filter(
            ca => validTargetClaims.has(ca.targetClaim)
        );

        return {
            suggestedConflict: advisory.suggestedConflict,
            confidence: advisory.confidence,
            claimAnalysis: sanitizedClaimAnalysis,
            diagramSupport: advisory.diagramSupport,
            reasoning: advisory.reasoning
        };

    } catch (error) {
        console.error("[AGENTIC ANALYSIS FAILED]", error.message);

        return {
            suggestedConflict: false,
            confidence: 0,
            claimAnalysis: [],
            diagramSupport: { used: false },
            reasoning: "Advisory analysis failed or was inconclusive."
        };
    }
}
