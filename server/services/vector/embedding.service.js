import { OpenRouter } from '@openrouter/sdk';
import config from "../../utils/config.js";

const openRouter = new OpenRouter({
    apiKey: config.OPENROUTER_API_KEY,
});

const MODEL = 'openai/text-embedding-3-small';

/**
 * Minimal, patent-safe normalization
 */
function normalize(text) {
    return text
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function generateEmbedding(text) {
    if (!text) return null;

    const cleanText = normalize(text);

    const response = await openRouter.embeddings.generate({
        model: MODEL,
        input: cleanText,
    });

    return response.data[0].embedding;
}

export async function generateBatchEmbeddings(texts) {
    if (!texts || texts.length === 0) return [];

    const cleanTexts = texts.map(normalize);

    const response = await openRouter.embeddings.generate({
        model: MODEL,
        input: cleanTexts,
    });

    return response.data.map(item => item.embedding);
}
