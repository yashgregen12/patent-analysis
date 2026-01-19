import { createAgent, providerStrategy } from "langchain";
import { z } from "zod";

// Structured Output Schema for Rationales
const RationaleSchema = z.object({
    overlaps: z.array(z.object({
        element: z.string().describe("The overlapping element or concept"),
        explanation: z.string().describe("Why this is considered an overlap"),
    })).describe("List of identified overlaps between target and candidate"),
    distinctions: z.array(z.object({
        element: z.string().describe("The distinguishing element or concept"),
        explanation: z.string().describe("Why this is different"),
    })).describe("List of key distinctions between target and candidate"),
    overallAssessment: z.enum(["HIGH_OVERLAP", "PARTIAL_OVERLAP", "LOW_OVERLAP", "NO_OVERLAP"]),
    summary: z.string().describe("Concise technical summary of the comparison"),
});

/**
 * Generates a structured contrastive rationale between a target fragment and a candidate fragment.
 * @param {string} targetText - The text of the target patent (e.g., a claim).
 * @param {string} candidateText - The text of the candidate prior art.
 * @returns {Promise<Object>} - The structured rationale object.
 */
export async function generateRationale(targetText, candidateText) {
    if (!targetText || !candidateText) {
        return {
            overlaps: [],
            distinctions: [],
            overallAssessment: "NO_OVERLAP",
            summary: "Insufficient text for comparison."
        };
    }

    try {
        const agent = createAgent({
            model: "groq:llama-3.3-70b-versatile",
            responseFormat: providerStrategy(RationaleSchema),
        });

        const result = await agent.invoke({
            messages: [
                {
                    role: "system",
                    content: "You are a patent examiner analyzing technical similarities between patent claims. Provide a structured comparison."
                },
                {
                    role: "user",
                    content: `Compare the following two patent fragments:

TARGET FRAGMENT:
"${targetText}"

CANDIDATE FRAGMENT (Potential Prior Art):
"${candidateText}"

Provide a structured analysis of overlaps and distinctions.`
                }
            ]
        });

        return result.structuredResponse || {
            overlaps: [],
            distinctions: [],
            overallAssessment: "LOW_OVERLAP",
            summary: "No structured response returned"
        };
    } catch (error) {
        console.error("[RATIONALE] Generation Error:", error.message);
        return {
            overlaps: [],
            distinctions: [],
            overallAssessment: "NO_OVERLAP",
            summary: "Failed to generate detailed rationale: " + error.message
        };
    }
}

// Export schema for use in other services
export { RationaleSchema };
