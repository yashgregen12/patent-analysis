import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { providerStrategy } from "@langchain/core/structured_output";

/* ----------------------------- */
/* Structured Vision Schema */
/* ----------------------------- */

const DiagramVisionSchema = z.object({
    type: z.enum([
        "flowchart",
        "block_diagram",
        "mechanical",
        "architecture",
        "unknown"
    ]),
    semanticSummary: z.string(),
    components: z.array(z.string()).default([]),
    connections: z.array(z.string()).default([]),
    labels: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1)
});


/* ----------------------------- */
/* Agent (Structured Output) */
/* ----------------------------- */

const agent = createAgent({
    model: "groq:llama-3.3-70b-versatile",
    responseFormat: providerStrategy(DiagramVisionSchema)
});

/* ----------------------------- */
/* Analyzer */
/* ----------------------------- */

/**
 * Analyze a patent diagram image (BUFFER INPUT ONLY)
 */
export async function analyzeDiagram(
    imageBuffer
) {
    try {
        const base64Image = imageBuffer.toString("base64");

        const result = await agent.invoke([
            new HumanMessage({
                content: [
                    {
                        type: "text",
                        text: `
You are analyzing a patent diagram image.

Populate all fields.
Be concise, technical, and factual.
`
                    },
                    {
                        type: "image",
                        image: {
                            data: base64Image,
                            mime_type: "image/png"
                        }
                    }
                ]
            })
        ]);

        // providerStrategy guarantees this matches DiagramVisionSchema
        return result.structuredResponse;

    } catch (error) {
        console.error("[DIAGRAM ANALYSIS FAILED]", error.message);

        return {
            type: "unknown",
            semanticSummary: "Diagram analysis failed.",
            components: [],
            connections: [],
            labels: [],
            confidence: 0
        };
    }
}
