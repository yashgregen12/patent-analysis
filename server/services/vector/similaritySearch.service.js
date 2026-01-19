import qdrantClient, { COLLECTION_NAME } from '../../utils/qdrantClient.js';

/**
 * Performs a vector similarity search in Qdrant.
 */
export async function vectorSearch(queryEmbedding, section, limit = 10, excludePatentId = null, metadata = {}) {
    try {
        const filter = {
            must: []
        };

        if (section) {
            filter.must.push({
                key: 'section',
                match: { value: section }
            });
        }

        if (excludePatentId) {
            filter.must.push({
                key: 'patentId',
                match: { except: [excludePatentId] }
            });
        }

        if (metadata?.ipcClass) {
            filter.must.push({
                key: 'metadata.ipcClass',
                match: { value: metadata.ipcClass }
            });
        }

        const results = await qdrantClient.search(COLLECTION_NAME, {
            vector: queryEmbedding,
            limit: limit,
            filter: filter.must.length > 0 ? filter : undefined,
            with_payload: true,
            with_vector: false
        });

        return results.map(res => ({
            patentId: res.payload.patentId,
            section: res.payload.section,
            content: res.payload.content,
            metadata: res.payload.metadata,
            score: res.score
        }));
    } catch (error) {
        console.error(`[QDRANT] Vector Search failed for ${section}:`, error.message);
        return [];
    }
}

/**
 * Searches across multiple sections and merges candidates.
 */
export async function findSimilarCandidates(patentId) {
    // 1. Get all points for this patent from Qdrant
    // Note: In a real app, we might store a subset or specific 'search' vectors in MongoDB 
    // to avoid a full scan here, but for now we'll query Qdrant by patentId.
    const vectors = await qdrantClient.scroll(COLLECTION_NAME, {
        filter: {
            must: [
                { key: 'patentId', match: { value: patentId.toString() } }
            ]
        },
        limit: 100,
        with_payload: true,
        with_vector: true
    });

    const candidates = new Map(); // Map of patentId -> { combinedScore, matches: [] }

    for (const v of vectors.points) {
        const results = await vectorSearch(
            v.vector,
            v.payload.section,
            10,
            patentId,
            { ipcClass: v.payload.metadata?.ipcClass }
        );

        for (const res of results) {
            const cid = res.patentId.toString();
            if (!candidates.has(cid)) {
                candidates.set(cid, {
                    patentId: res.patentId,
                    score: 0,
                    matches: []
                });
            }

            const candidate = candidates.get(cid);
            candidate.score += res.score;
            candidate.matches.push({
                sourceSection: v.payload.section,
                matchSection: res.section,
                content: res.content,
                score: res.score,
                metadata: res.metadata
            });
        }
    }

    // Sort by score and return top results
    return Array.from(candidates.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
}
