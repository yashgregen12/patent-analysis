import { OpenRouter } from '@openrouter/sdk';
import config from "../../utils/config.js";

const openRouter = new OpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
});

/**
 * Generates an embedding for a given text.
 * @param {string} text - The input text.
 * @returns {Promise<Array<number>>} - The embedding vector.
 */
export async function generateEmbedding(text) {
    if (!text) return null;
    try {
        // Basic cleaning
        const cleanText = text.replace(/[\n\r\t]+/g, ' ').trim();
        return await openRouter.embeddings.generate({
            model: 'openai/text-embedding-3-small',
            input: cleanText,
        });
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        throw error;
    }
}

/**
 * Batch generates embeddings for multiple texts.
 * @param {Array<string>} texts - The input texts.
 * @returns {Promise<Array<Array<number>>>} - The embedding vectors.
 */
export async function generateBatchEmbeddings(texts) {
    if (!texts || texts.length === 0) return [];
    try {
        const cleanTexts = texts.map(t => t.replace(/[\n\r\t]+/g, ' ').trim());
        const response = await openRouter.embeddings.generate({
            model: 'openai/text-embedding-3-small',
            input: cleanTexts,
        });

        // ✅ return pure vectors
        return response.data.map(item => item.embedding);

    } catch (error) {
        console.error('Error generating batch embeddings:', error.message);
        throw error;
    }
}
