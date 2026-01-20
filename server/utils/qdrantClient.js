import { QdrantClient } from '@qdrant/js-client-rest';
import config from './config.js';

export const COLLECTIONS = {
    ABSTRACT: 'ip_abstract_vectors',
    CLAIM: 'ip_claim_vectors',
    DESCRIPTION: 'ip_description_vectors',
    DIAGRAM: 'ip_diagram_vectors'
};

export const VECTOR_SIZE = 1536; // text-embedding-3-small
export const DISTANCE = 'Cosine';

const client = new QdrantClient({
    url: config.QDRANT_URL,
    apiKey: config.QDRANT_API_KEY,
});

async function ensureCollection(name) {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === name);

    if (exists) return;

    console.log(`[QDRANT] Creating collection: ${name}`);

    await client.createCollection(name, {
        vectors: {
            size: VECTOR_SIZE,
            distance: DISTANCE,
        }
    });

    // Flat payload indexes (IMPORTANT)
    await client.createPayloadIndex(name, {
        field_name: 'ipId',
        field_schema: 'keyword',
    });

    await client.createPayloadIndex(name, {
        field_name: 'type',
        field_schema: 'keyword',
    });

    await client.createPayloadIndex(name, {
        field_name: 'ipcClass',
        field_schema: 'keyword',
    });
}

/**
 * Call once at app startup
 */
export async function initializeQdrant() {
    try {
        for (const name of Object.values(COLLECTIONS)) {
            await ensureCollection(name);
        }
        console.log('[QDRANT] All collections ready');
    } catch (err) {
        console.error('[QDRANT] Initialization failed:', err.message);
        throw err;
    }
}

export default client;
