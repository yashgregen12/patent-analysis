import { ACTIVE_EMBEDDING } from '../../utils/embeddingConfig.js';
import qdrantClient from '../../utils/qdrantClient.js';
import { generateEmbedding, generateBatchEmbeddings } from './embedding.service.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Vector collections (DO NOT MERGE THESE)
 */
const COLLECTIONS = {
    ABSTRACT: 'ip_abstract_vectors',
    CLAIM: 'ip_claim_vectors',
    DESCRIPTION: 'ip_description_vectors',
    DIAGRAM: 'ip_diagram_vectors'
};

/**
 * Base payload builder (flat & filterable)
 */
export function buildPayload({
    ipId,
    type,
    ipcClass,
    embeddingVersion,
    ingestionVersion,
    claimNo,
    chunkId,
    diagramId
}) {
    return {
        ipId,
        type,
        ipcClass,
        embeddingVersion,
        ingestionVersion,
        claimNo,
        chunkId,
        diagramId
    };
}

/**
 * Store a single vector
 */
export async function storeVector(text, payload, collectionType) {
    if (!text || !collectionType) return;

    const embedding = await generateEmbedding(text);
    const vector = embedding?.data?.[0]?.embedding;

    if (!vector) {
        throw new Error('Embedding generation failed');
    }

    const collection = COLLECTIONS[collectionType];
    if (!collection) {
        throw new Error(`Invalid collection type: ${collectionType}`);
    }

    return qdrantClient.upsert(collection, {
        wait: true,
        points: [{
            id: uuidv4(),
            vector,
            payload: {
                ...payload,
                embeddingModel: ACTIVE_EMBEDDING.model,
                embeddingVersion: ACTIVE_EMBEDDING.version
            }
        }]
    });
}

/**
 * Store multiple vectors safely
 */
export async function storeBatchVectors(texts, payloads, collectionType) {
    if (!texts || texts.length === 0) return;

    const embeddings = await generateBatchEmbeddings(texts);

    if (!embeddings || embeddings.length !== texts.length) {
        throw new Error('Batch embedding count mismatch');
    }

    const collection = COLLECTIONS[collectionType];
    if (!collection) {
        throw new Error(`Invalid collection type: ${collectionType}`);
    }

    const points = embeddings.map((vector, i) => ({
        id: uuidv4(),
        vector,
        payload: {
            ...payloads[i],
            embeddingModel: ACTIVE_EMBEDDING.model,
            embeddingVersion: ACTIVE_EMBEDDING.version
        }
    }));

    return qdrantClient.upsert(collection, {
        wait: true,
        points
    });
}
