import IP from '../../models/ip.model.js';
import { SimilaritySnapshot } from '../../models/similaritySnapshot.model.js';

import { findSimilarCandidates } from '../../services/vector/similaritySearch.service.js';
import { runAgenticComparison } from '../../services/ai/analysisAgent.service.js';
import { generateRationale } from '../../services/ai/rationaleGenerator.service.js';
import { ACTIVE_EMBEDDING } from '../../config/embeddingConfig.js';
import { logAnalysisMetrics } from '../../services/utils/observability.service.js';

/* =====================================================
   FINAL-STATE SIMILARITY CHECK CONSUMER
===================================================== */

export async function handleSimilarityCheck(job) {
    const startTime = Date.now();
    const { ipId } = job;

    const targetIP = await IP.findById(ipId);
    if (!targetIP) {
        console.error(`[SIMILARITY] Target IP ${ipId} not found`);
        return;
    }

    if (targetIP.ingestion.status !== 'INDEXED') {
        console.warn(`[SIMILARITY] Target IP ${ipId} not indexed`);
        return;
    }

    try {
        /* =========================
           STEP 1 — VECTOR DISCOVERY
        ========================= */

        const candidates = await findSimilarCandidates(ipId);

        const TOP_K = 3;
        const topCandidates = candidates.slice(0, TOP_K);

        /* =========================
           STEP 2 — TARGET CONTEXT
        ========================= */

        const targetContext = {
            ipId,
            expandedClaims: targetIP.ingestion.structured.claims.map(c => ({
                claimNo: c.claimNo,
                text: c.expandedText
            }))
        };

        const analyzedCandidates = [];

        /* =========================
           STEP 3 — AGENTIC ANALYSIS
        ========================= */

        for (const candidate of topCandidates) {
            const candidateIP = await IP.findById(candidate.ipId, {
                'ingestion.version': 1
            });

            if (!candidateIP) continue;

            let agentResult;

            try {
                agentResult = await runAgenticComparison(
                    targetContext,
                    candidate.ipId
                );
            } catch {
                agentResult = {
                    suggestedConflict: false,
                    confidence: 0,
                    claimAnalysis: [],
                    diagramSupport: { used: false },
                    reasoning: 'Agentic analysis failed'
                };
            }

            /* =========================
               STEP 4 — MATCH RATIONALES
            ========================= */

            const enrichedMatches = await enrichMatchesWithRationale(
                targetIP,
                candidate.matches,
                candidateIP
            );

            /* =========================
               STEP 5 — CONFIDENCE DERIVATION
            ========================= */

            const confidenceLevel =
                agentResult.confidence < 0.4
                    ? 'LOW'
                    : agentResult.confidence >= 0.7
                        ? 'HIGH'
                        : 'MEDIUM';

            /* =========================
               STEP 6 — SNAPSHOT CREATION
            ========================= */

            const snapshot = await SimilaritySnapshot.create({
                targetIP: ipId,
                comparedIP: candidate.ipId,

                targetIngestionVersion: targetIP.ingestion.version,
                comparedIngestionVersion: candidateIP.ingestion.version,
                embeddingVersion: ACTIVE_EMBEDDING.version,

                similarityScore: {
                    overall: candidate.score,
                    breakdown: candidate.scoreBreakdown || {}
                },

                confidenceLevel,
                confidenceSource: 'SYSTEM',

                explicitLowConfidenceNote:
                    confidenceLevel === 'LOW'
                        ? 'Similarity assessment has low confidence due to limited overlap.'
                        : undefined,

                claimAnalysis: agentResult.claimAnalysis,
                diagramSupport: agentResult.diagramSupport,

                agentTrace: {
                    advisoryOutput: agentResult,
                    retrievedEvidence: enrichedMatches
                }
            });

            await IP.findByIdAndUpdate(ipId, {
                $push: { analysisRefs: snapshot._id }
            });

            analyzedCandidates.push({
                ipId: candidate.ipId,
                advisory: agentResult,
                similarityScore: candidate.score
            });
        }

        /* =========================
           STEP 7 — FINAL VERDICT (SYSTEM)
        ========================= */

        const finalVerdict = computeFinalVerdict(analyzedCandidates);

        await IP.findByIdAndUpdate(ipId, {
            'analysis.finalVerdict': finalVerdict
        });

        /* =========================
           STEP 8 — OBSERVABILITY
        ========================= */

        await logAnalysisMetrics(ipId, {
            durationMs: Date.now() - startTime,
            candidateCount: analyzedCandidates.length,
            verdict: finalVerdict.status
        });

        console.log(`[SIMILARITY] Completed for IP ${ipId}`);

    } catch (error) {
        console.error(`[SIMILARITY FAILED] IP ${ipId}`, error.message);
    }
}

/* =====================================================
   HELPERS (PURE & DETERMINISTIC)
===================================================== */

async function enrichMatchesWithRationale(targetIP, matches = [], candidateIP) {
    const enriched = [];

    for (const match of matches) {
        let sourceText = '';

        if (match.sourceSection === 'CLAIM' && match.queryMetadata?.claimNo) {
            // Use the claimNo from the TARGET'S usage (queryMetadata), not the Candidate's match metadata
            const claim = targetIP.ingestion.structured.claims.find(
                c => c.claimNo === match.queryMetadata.claimNo
            );
            sourceText = claim?.expandedText || '';
        }

        if (!sourceText || !match.content) {
            enriched.push(match);
            continue;
        }

        try {
            let rationale = null;
            if (match.sourceSection === 'CLAIM' && match.metadata?.claimNo && candidateIP) {
                const candidateClaim = candidateIP.ingestion.structured.claims.find(
                    c => c.claimNo === match.metadata.claimNo
                );

                if (candidateClaim) {
                    rationale = await generateRationale(
                        sourceText,                     // TARGET claim
                        candidateClaim.expandedText     // CANDIDATE claim
                    );
                }
            } else {
                // Optional supporting rationale
                rationale = await generateRationale(
                    sourceText,
                    match.content
                );
            }


            enriched.push({
                ...match,
                rationale
            });
        } catch {
            enriched.push(match);
        }
    }

    return enriched;
}

function computeFinalVerdict(analyzedCandidates) {
    if (!analyzedCandidates.length) {
        return {
            status: 'CLEAN',
            confidence: 0.8,
            summary: 'No similar prior art detected'
        };
    }

    const strongConflicts = analyzedCandidates.filter(
        c => c.advisory.suggestedConflict && c.advisory.confidence >= 0.7
    );

    if (strongConflicts.length > 0) {
        return {
            status: 'CONFLICT',
            confidence: Math.min(
                0.95,
                Math.max(...strongConflicts.map(c => c.advisory.confidence))
            ),
            summary: `Potential conflict detected with IP ${strongConflicts[0].ipId}`
        };
    }

    return {
        status: 'POTENTIAL_INFRINGE',
        confidence: 0.6,
        summary: 'Similar prior art found; examiner review recommended'
    };
}
