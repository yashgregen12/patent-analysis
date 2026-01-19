import qdrantClient, { COLLECTION_NAME } from '../../utils/qdrantClient.js';
import { generateEmbedding, generateBatchEmbeddings } from './embedding.service.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Stores a vector in Qdrant.
 */
export async function storeVector(patentId, section, content, metadata = {}) {
    try {

        console.log("[DEBUG] storeVector called for patentId: ", patentId, " and section: ", section, "and content : ", content);
        const embedding = await generateEmbedding(content);

        console.log("[DEBUG] Abstract embedding : ", embedding)
        const vector = embedding?.data?.[0]?.embedding;

        console.log("[DEBUG] Abstract vectors", vector)

        if (!vector) return null;


        return await qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points: [{
                id: uuidv4(),
                vector,
                payload: {
                    patentId: patentId.toString(),
                    section,
                    content,
                    metadata: {
                        ...metadata,
                        embeddingVersion: 'v1-google-genai'
                    }
                }
            }]
        });
    } catch (error) {
        console.error(`[QDRANT] Failed to store vector for ${section}:`, error.message);
    }
}

/**
 * Stores multiple vectors in Qdrant.
 */
export async function storeBatchVectors(patentId, section, contents, metadatas = []) {
    if (!contents || contents.length === 0) return;

    try {
        const embeddings = await generateBatchEmbeddings(contents);
        const points = contents.map((content, i) => ({
            id: uuidv4(),
            vector: embeddings[i],
            payload: {
                patentId: patentId.toString(),
                section,
                content,
                metadata: {
                    ...(metadatas[i] || {}),
                    embeddingVersion: 'v1-google-genai'
                }
            }
        }));

        return await qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points
        });
    } catch (error) {
        console.error(`[QDRANT] Failed to store batch vectors for ${section}:`, error.message);
    }
}
