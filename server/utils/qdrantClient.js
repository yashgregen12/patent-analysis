import { QdrantClient } from '@qdrant/js-client-rest';
import config from './config.js';

const client = new QdrantClient({
    url: config.QDRANT_URL,
    apiKey: config.QDRANT_API_KEY,
});

export const COLLECTION_NAME = 'patent_vectors';

/**
 * Initializes the Qdrant collection if it doesn't exist.
 */
export async function initializeQdrant() {
    try {
        const collections = await client.getCollections();
        const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

        if (!exists) {
            console.log(`[QDRANT] Creating collection: ${COLLECTION_NAME}`);
            await client.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: 1536, // Dimensions for Google's embedding-001
                    distance: 'Cosine',
                },
                optimizers_config: {
                    default_segment_number: 2,
                },
                replication_factor: 2,
            });

            // Create payload index for IPC filtering
            await client.createPayloadIndex(COLLECTION_NAME, {
                field_name: 'metadata.ipcClass',
                field_schema: 'keyword',
            });

            await client.createPayloadIndex(COLLECTION_NAME, {
                field_name: 'section',
                field_schema: 'keyword',
            });

            await client.createPayloadIndex(COLLECTION_NAME, {
                field_name: 'patentId',
                field_schema: 'keyword',
            });
        }
    } catch (error) {
        console.error('[QDRANT] Initialization failed:', error.message);
    }
}

export default client;
