import qdrantClient, { COLLECTIONS } from '../../utils/qdrantClient.js';
import { ACTIVE_EMBEDDING } from '../../config/embeddingConfig.js';

/* =========================
   CONFIG
========================= */

const SECTION_WEIGHTS = {
    CLAIM: 1.0,
    ABSTRACT: 0.6,
    DESCRIPTION: 0.4,
    DIAGRAM: 0.3
};

const TOP_K_PER_QUERY = 10;
const MAX_CANDIDATES = 20;

/* =========================
   MAIN ENTRY
========================= */

export async function findSimilarCandidates(ipId, options = {}) {
    const {
        ipcClass = null
    } = options;

    // 1️⃣ Get representative query vectors
    const queryVectors = await getRepresentativeVectors(ipId);

    const candidateMap = new Map();

    // 2️⃣ Run similarity search per query vector
    for (const q of queryVectors) {
        const results = await searchSimilarVectors(q, ipcClass);

        for (const res of results) {
            const cid = res.ipId.toString();
            if (cid === ipId.toString()) continue;

            if (!candidateMap.has(cid)) {
                candidateMap.set(cid, initCandidate(cid));
            }

            mergeMatch(candidateMap.get(cid), q, res);
        }
    }

    // 3️⃣ Final scoring
    const candidates = Array.from(candidateMap.values())
        .map(c => finalizeScore(c))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_CANDIDATES);

    return candidates;
}

/* =========================
   REPRESENTATIVE QUERIES
========================= */

async function getRepresentativeVectors(ipId) {
    const queries = [];

    // Abstract (1)
    queries.push(
        ...(await fetchVectors(ipId, 'ABSTRACT', 1))
    );

    // Independent claims (top 3)
    queries.push(
        ...(await fetchVectors(ipId, 'CLAIM', 3))
    );

    // Description (top 2)
    queries.push(
        ...(await fetchVectors(ipId, 'DESCRIPTION', 2))
    );

    // Diagrams (top 1, optional)
    queries.push(
        ...(await fetchVectors(ipId, 'DIAGRAM', 1))
    );

    return queries;
}

async function fetchVectors(ipId, section, limit) {
    const collection = COLLECTIONS[section];
    if (!collection) return [];

    const res = await qdrantClient.scroll(collection, {
        filter: {
            must: [
                { key: 'ipId', match: { value: ipId.toString() } },
                { key: 'embeddingVersion', match: { value: ACTIVE_EMBEDDING.version } }
            ]
        },
        limit,
        with_vector: true,
        with_payload: true
    });

    return res.points.map(p => ({
        vector: p.vector,
        section,
        payload: p.payload // Contains claimNo, chunkIndex etc.
    }));
}


/* =========================
   VECTOR SEARCH
========================= */

async function searchSimilarVectors(query, ipcClass) {
    const collection = COLLECTIONS[query.section];
    if (!collection) return [];

    // Soft IPC hint
    const baseFilter = {
        must: [
            { key: 'embeddingVersion', match: { value: ACTIVE_EMBEDDING.version } }
        ]
    };

    if (ipcClass) {
        baseFilter.should = [{
            key: 'ipcClass',
            match: { value: ipcClass }
        }];
    }

    const results = await qdrantClient.search(collection, {
        vector: query.vector,
        limit: TOP_K_PER_QUERY,
        filter: baseFilter,
        with_payload: true,
        with_vector: false
    });

    return results.map(r => ({
        ipId: r.payload.ipId,
        score: r.score,
        section: query.section,
        content: r.payload.content,
        metadata: r.payload
    }));
}

/* =========================
   AGGREGATION
========================= */

function initCandidate(ipId) {
    return {
        ipId,
        perSectionMax: {},
        matches: [],
        score: 0
    };
}

function mergeMatch(candidate, query, res) {
    const section = query.section;
    const prev = candidate.perSectionMax[section] || 0;
    candidate.perSectionMax[section] = Math.max(prev, res.score);

    candidate.matches.push({
        sourceSection: section,
        matchSection: section,
        content: res.content,
        score: res.score,
        metadata: res.metadata, // Candidate's metadata
        queryMetadata: query.payload || {} // Target's metadata (e.g. claimNo)
    });
}

function finalizeScore(candidate) {
    let score = 0;

    for (const [section, rawScore] of Object.entries(candidate.perSectionMax)) {
        const weight = SECTION_WEIGHTS[section] || 0;
        score += rawScore * weight;
    }

    return {
        ipId: candidate.ipId,
        score: Number(score.toFixed(4)),
        matches: candidate.matches
    };
}
