import IP, { updateIngestionStatus, addRawContent } from '../../models/ip.model.js';
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
import { storeVector, storeBatchVectors } from '../../services/vector/vectorStore.service.js';
import { fetch } from '../../utils/fetcher.js';

export async function handlePatentIngest(job) {
    const ipId = job.ipId;
    const ip = await IP.findById(ipId);

    if (!ip) {
        console.error(`IP ${ipId} not found`);
        return;
    }
    
    await updateIngestionStatus(ipId, 'INGESTING');
    const ipcClass = ip.ipcClass;

    try {
        console.log(`[INGEST] Starting extraction for IP: ${ip.title}`);

        // 1. Fetch buffers from Cloudinary
        const [abstract, claims, desc, diagrams] = await Promise.all([
            ip.abstract?.secure_url ? fetch(ip.abstract.secure_url) : Promise.resolve(null),
            ip.claims?.secure_url ? fetch(ip.claims.secure_url) : Promise.resolve(null),
            ip.description?.secure_url ? fetch(ip.description.secure_url) : Promise.resolve(null),
            ip.diagrams?.secure_url ? fetch(ip.diagrams.secure_url) : Promise.resolve(null),
        ]);
        console.log("abstract", abstract, " and type is ", typeof abstract);
        console.log("claims", claims, " and type is ", typeof claims);
        console.log("desc", desc, " and type is ", typeof desc);
        console.log("diagrams", diagrams, " and type is ", typeof diagrams);

        // 2. Extract content
        console.log(`[INGEST] Extracting text and images...`);
        const abstractText = abstract ? await extractText(abstract) : '';
        const claimsText = claims ? await extractText(claims) : '';
        const descriptionText = desc ? await extractText(desc) : '';
        const diagramImages = diagrams ? await extractImages(diagrams) : [];

        // 3. Store raw content
        const citations = extractCitations(descriptionText + " " + claimsText);

        await addRawContent(ipId, {
            abstractText,
            claimsText,
            descriptionText,
            diagramImages,
            citations
        });

        // 4. Initial Claims & Description Analysis
        console.log(`[INGEST] Normalizing claims and chunking description...`);

        // Parse claims and identify dependencies
        const rawClaims = parseClaims(claimsText);
        rawClaims.forEach(c => {
            c.dependsOn = extractDependencies(c.text);
        });

        const claimMap = new Map(rawClaims.map(c => [c.claimNo, c]));

        // Expand claims recursively
        const expandedClaims = rawClaims.map(c => ({
            ...c,
            expandedText: expandClaim(c, claimMap)
        }));

        // Semantic chunking of description
        const descriptionChunks = chunkDescription(descriptionText);

        // 5. Diagram Intelligence
        console.log(`[INGEST] Identifying diagram intelligence...`);
        const structuredDiagrams = [];
        for (const img of diagramImages) {
            if (img.secure_url) {
                const intelligence = await analyzeDiagram(img.secure_url);
                structuredDiagrams.push({
                    type: intelligence.type || "unknown",
                    representation: intelligence,
                    semanticSummary: intelligence.semanticSummary || ""
                });
            }
        }

        // Update structured content directly on IP
        await IP.findByIdAndUpdate(ipId, {
            'structured.claims': expandedClaims,
            'structured.descriptionChunks': descriptionChunks,
            'structured.diagrams': structuredDiagrams,
            ingestionStatus: 'PROCESSED'
        });

        // 6. Vector Storage
        console.log(`[INGEST] Generating embeddings and storing in Vector DB...`);

        // Store Abstract vector
        if (abstractText) {
            await storeVector(ipId, 'ABSTRACT', abstractText, { ipcClass });
        }

        // Store Claim vectors (expanded)
        if (expandedClaims.length > 0) {
            await storeBatchVectors(
                ipId,
                'CLAIM',
                expandedClaims.map(c => c.expandedText),
                expandedClaims.map(c => ({ claimNo: c.claimNo, ipcClass }))
            );
        }

        // Store Description Chunks
        if (descriptionChunks.length > 0) {
            await storeBatchVectors(
                ipId,
                'DESCRIPTION',
                descriptionChunks,
                descriptionChunks.map((_, i) => ({ chunkIndex: i, ipcClass }))
            );
        }

        // Store Diagram Summaries
        if (structuredDiagrams.length > 0) {
            await storeBatchVectors(
                ipId,
                'DIAGRAM',
                structuredDiagrams.map(d => d.semanticSummary),
                structuredDiagrams.map((_, i) => ({ diagramPage: i + 1, ipcClass }))
            );
        }

        console.log(`[SUCCESS] IP ${ipId} ingestion complete`);
    } catch (error) {
        console.error(`[ERROR] Ingest failed for ${ipId}:`, error);
        await updateIngestionStatus(ipId, 'FAILED');
    }
}
