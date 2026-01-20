import IP, {
    updateIngestionStatus,
    addRawContent
} from '../../models/ip.model.js';

import { extractText } from '../../services/extraction/pdfTextExtractor.service.js';
import { extractImages } from '../../services/extraction/diagramExtractor.service.js';
import {
    parseClaims,
    extractDependencies,
    expandClaim,
    chunkDescription
} from '../../services/claims/claimProcessor.js';

import { extractCitations } from '../../services/extraction/citationExtractor.service.js';
import { analyzeDiagram } from '../../services/ai/diagramIntelligence.service.js';
import {
    storeVector,
    storeBatchVectors,
    buildPayload
} from '../../services/vector/vectorStore.service.js';

import { fetch } from '../../utils/fetcher.js';
import { ACTIVE_EMBEDDING } from '../../utils/embeddingConfig.js';

const EMBEDDING_VERSION = ACTIVE_EMBEDDING.version;
const DIAGRAM_CONFIDENCE_THRESHOLD = 0.6;

export async function handlePatentIngest(job) {

    if (EMBEDDING_VERSION !== ACTIVE_EMBEDDING.version) {
        throw new Error('Embedding version mismatch');
    }

    const { ipId } = job;

    const ip = await IP.findById(ipId);
    if (!ip) {
        console.error(`[INGEST] IP ${ipId} not found`);
        return;
    }

    if (ip.ingestion.status === 'INDEXED') {
        console.log(`[INGEST] IP ${ipId} already indexed`);
        return;
    }

    try {
        /* =========================
           STEP 1 — INGESTION START
        ========================= */

        await updateIngestionStatus(ipId, 'INGESTING');

        const ipcClass =
            ip.ipc?.source === 'AI' && ip.ipc.confidence < 0.6
                ? null
                : ip.ipc?.class || null;
        const ingestionVersion = ip.ingestion.version;

        /* =========================
           STEP 2 — FETCH PDF BUFFERS
        ========================= */

        const [
            abstractBuf,
            claimsBuf,
            descBuf,
            diagramBuf
        ] = await Promise.all([
            ip.abstract?.secure_url ? fetch(ip.abstract.secure_url) : null,
            ip.claims?.secure_url ? fetch(ip.claims.secure_url) : null,
            ip.description?.secure_url ? fetch(ip.description.secure_url) : null,
            ip.diagrams?.secure_url ? fetch(ip.diagrams.secure_url) : null
        ]);

        /* =========================
           STEP 3 — RAW EXTRACTION
        ========================= */

        const abstractText = abstractBuf ? await extractText(abstractBuf) : '';
        const claimsText = claimsBuf ? await extractText(claimsBuf) : '';
        const descriptionText = descBuf ? await extractText(descBuf) : '';
        const diagramImages = diagramBuf ? await extractImages(diagramBuf) : [];

        const citations = extractCitations(`${claimsText} ${descriptionText}`);

        await addRawContent(ipId, {
            abstractText,
            claimsText,
            descriptionText,
            diagramImages,
            citations
        });

        await updateIngestionStatus(ipId, 'RAW_EXTRACTED');

        /* =========================
           STEP 4 — CLAIM PROCESSING
        ========================= */

        const parsedClaims = parseClaims(claimsText);

        parsedClaims.forEach(c => {
            c.dependsOn = extractDependencies(c.text);
        });

        const claimMap = new Map(parsedClaims.map(c => [c.claimNo, c]));

        const expandedClaims = parsedClaims.map(c => ({
            claimNo: c.claimNo,
            dependsOn: c.dependsOn,
            text: c.text,
            expandedText: expandClaim(c, claimMap),
            isExpanded: true
        }));

        const descriptionChunks = chunkDescription(descriptionText).map(
            (text, i) => ({
                chunkId: `${ipId}_desc_${i}`,
                text
            })
        );

        await IP.findByIdAndUpdate(ipId, {
            'ingestion.structured.claims': expandedClaims,
            'ingestion.structured.descriptionChunks': descriptionChunks
        });

        await updateIngestionStatus(ipId, 'CLAIMS_PROCESSED');

        /* =========================
           STEP 5 — DIAGRAM INTELLIGENCE
        ========================= */

        const structuredDiagrams = [];

        await Promise.all(diagramImages.map(async (img) => {
            if (!img.secure_url) return;

            const imgBuffer = await fetch(img.secure_url);
            const intelligence = await analyzeDiagram(imgBuffer);

            structuredDiagrams.push({
                diagramId: img.page,
                type: intelligence.type || 'unknown',
                representation: intelligence.representation || {},
                semanticSummary: intelligence.semanticSummary || '',
                confidence: intelligence.confidence || 0
            });
        }));

        await IP.findByIdAndUpdate(ipId, {
            'ingestion.structured.diagrams': structuredDiagrams
        });

        await updateIngestionStatus(ipId, 'DIAGRAMS_PROCESSED');

        /* =========================
           STEP 6 — VECTOR STORAGE (QDRANT)
        ========================= */


        // ABSTRACT
        if (abstractText) {
            await storeVector(
                abstractText,
                buildPayload({
                    ipId: ipId.toString(),
                    type: 'ABSTRACT',
                    ipcClass,
                    ingestionVersion,
                    embeddingVersion: EMBEDDING_VERSION
                }),
                'ABSTRACT'
            );

        }

        // CLAIMS
        if (expandedClaims.length > 0) {
            const claimPayloads = expandedClaims.map(c =>
                buildPayload({
                    ipId: ipId.toString(),
                    type: 'CLAIM',
                    ipcClass,
                    ingestionVersion,
                    embeddingVersion: EMBEDDING_VERSION,
                    claimNo: c.claimNo
                })
            );

            await storeBatchVectors(
                expandedClaims.map(c => c.expandedText),
                claimPayloads,
                'CLAIM'
            );

        }

        // DESCRIPTION
        if (descriptionChunks.length > 0) {
            const descPayloads = descriptionChunks.map(c =>
                buildPayload({
                    ipId: ipId.toString(),
                    type: 'DESCRIPTION',
                    ipcClass,
                    ingestionVersion,
                    embeddingVersion: EMBEDDING_VERSION,
                    chunkId: c.chunkId
                })
            );

            await storeBatchVectors(
                descriptionChunks.map(c => c.text),
                descPayloads,
                'DESCRIPTION'
            );

        }

        // DIAGRAMS (confidence-gated)
        const validDiagrams = structuredDiagrams.filter(
            d => d.confidence >= DIAGRAM_CONFIDENCE_THRESHOLD && d.semanticSummary
        );

        if (validDiagrams.length > 0) {
            const diagramPayloads = validDiagrams.map(d =>
                buildPayload({
                    ipId: ipId.toString(),
                    type: 'DIAGRAM',
                    ipcClass,
                    ingestionVersion,
                    embeddingVersion: EMBEDDING_VERSION,
                    diagramId: d.diagramId
                })
            );

            await storeBatchVectors(
                validDiagrams.map(d => d.semanticSummary),
                diagramPayloads,
                'DIAGRAM'
            );

        }

        await updateIngestionStatus(ipId, 'INDEXED');

        console.log(`[INGEST SUCCESS] IP ${ipId} fully ingested`);

    } catch (err) {
        console.error(`[INGEST FAILED] IP ${ipId}`, err);
        await updateIngestionStatus(ipId, 'FAILED');
        throw err;
    }
}
