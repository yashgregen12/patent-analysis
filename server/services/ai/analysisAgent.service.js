import { createAgent, providerStrategy, tool } from "langchain";
import { z } from "zod";
import IP from "../../models/ip.model.js";

// Structured Output Schema
const AnalysisResultSchema = z.object({
    isConflict: z.boolean().describe("Whether a legal conflict exists"),
    reasoning: z.string().describe("Detailed legal-technical explanation of the finding"),
    confidence: z.number().min(0).max(1).describe("Confidence score from 0 to 1"),
    verdict: z.enum(["CLEAN", "POTENTIAL_INFRINGE", "CONFLICT"]).describe("Final verdict"),
    anticipatedClaims: z.array(z.number()).optional().describe("List of claim numbers that are anticipated"),
});

// Tool for fetching IP details
const getIPDetailsTool = tool(
    async ({ ipId }) => {
        try {
            const ip = await IP.findById(ipId);
            if (!ip) return "IP not found.";

            return {
                title: ip.title,
                claims: (ip.structured?.claims || []).map(
                    (c) => `Claim ${c.claimNo}: ${c.expandedText}`
                ),
                descriptionChunks: (ip.structured?.descriptionChunks || []).slice(0, 5),
                diagramSummaries: (ip.structured?.diagrams || []).map(
                    (d) => d.semanticSummary
                ),
            };
        } catch (error) {
            return `Error fetching details: ${error.message}`;
        }
    },
    {
        name: "get_ip_details",
        description: "Fetch full structured data for an IP ID, including claims and description chunks.",
        schema: z.object({
            ipId: z.string().describe("ID of the candidate IP to fetch details for"),
        }),
    }
);

const tools = [getIPDetailsTool];

const SYSTEM_PROMPT = `You are a Senior Patent Examiner AI. Your task is to compare a TARGET patent application against a CANDIDATE prior art patent and determine if there is a conflict.

INSTRUCTIONS:
1. Identify the core inventive step of the TARGET patent.
2. Use 'get_ip_details' to drill down into the CANDIDATE if the summary provided is insufficient.
3. Determine if any claim in the TARGET is fully anticipated or made obvious by the CANDIDATE.
4. After your analysis, provide your final structured result.`;

/**
 * Performs a deep agentic comparison between a target patent content and a candidate ID.
 * Returns a structured analysis result.
 */
export async function runAgenticComparison(targetContent, candidateId) {
    try {
        const agent = createAgent({
            model: "groq:llama-3.3-70b-versatile",
            tools,
            responseFormat: providerStrategy(AnalysisResultSchema),
        });

        const result = await agent.invoke({
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: `Compare the following:

Target Patent Content: ${JSON.stringify(targetContent)}

Candidate IP ID: ${candidateId}

Analyze and provide your structured verdict.`,
                },
            ],
        });

        // Return structured response from agent
        return result.structuredResponse || {
            isConflict: false,
            reasoning: "No structured response returned",
            confidence: 0.5,
            verdict: "POTENTIAL_INFRINGE",
            anticipatedClaims: []
        };
    } catch (error) {
        console.error("[AGENT] Comparison Error:", error.message);
        return {
            isConflict: false,
            reasoning: "Analysis service failed: " + error.message,
            confidence: 0,
            verdict: "CLEAN",
            anticipatedClaims: []
        };
    }
}

// Export the schema for use in other services
export { AnalysisResultSchema };
