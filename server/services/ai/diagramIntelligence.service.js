import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";
import config from "../../utils/config.js";

const model = new ChatGroq({
    apiKey: config.GROQ_API_KEY,
    model: "llama-3.2-11b-vision-preview", // Note: Ensure this model supports vision
});

/**
 * Analyzes a diagram image using a Vision model.
 * @param {string} imageUrl - The secure URL of the diagram image.
 * @returns {Promise<Object>} - Structured diagram data.
 */
export async function analyzeDiagram(imageUrl) {
    try {
        const response = await model.invoke([
            new HumanMessage({
                content: [
                    {
                        type: "text",
                        text: `Analyze this patent diagram image and provide a structured JSON response. 
                        1. Classify the type: "Flowchart", "Block Diagram", "Mechanical Diagram", or "Architecture Diagram".
                        2. Provide a "semanticSummary" explaining what the diagram represents (e.g., "Software update workflow").
                        3. For Flowcharts/Block Diagrams: List "components" and "connections".
                        4. For Mechanical Diagrams: List "labels" and "description".

                        Format your entire response as a valid JSON object only.`
                    },
                    {
                        type: "image_url",
                        image_url: { url: imageUrl },
                    },
                ],
            }),
        ]);

        // Attempt to parse JSON from the LLM response
        const content = response.content;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return {
                type: "unknown",
                semanticSummary: "Failed to parse structured JSON from model response.",
                raw: content
            };
        } catch (parseError) {
            console.error("Failed to parse diagram intelligence JSON:", parseError);
            return {
                type: "unknown",
                semanticSummary: "Raw analysis: " + content.substring(0, 100) + "...",
            };
        }
    } catch (error) {
        console.error("Error in diagram intelligence service:", error.message);
        return {
            type: "error",
            semanticSummary: "Intelligence service unavailable.",
            error: error.message
        };
    }
}
