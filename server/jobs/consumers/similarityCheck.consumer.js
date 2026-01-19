import IP, { updateIngestionStatus } from '../../models/ip.model.js';
import { findSimilarCandidates } from '../../services/vector/similaritySearch.service.js';
import { runAgenticComparison } from '../../services/ai/analysisAgent.service.js';
import { generateRationale } from '../../services/ai/rationaleGenerator.service.js';
import { logAnalysisMetrics } from '../../services/utils/observability.service.js';

/**
 * Handles the similarity check job.
 * @param {Object} job - The job data containing ipId.
 */
export async function handleSimilarityCheck(job) {
    const startTime = Date.now();
    const ipId = job.ipId;

    const ip = await IP.findById(ipId);
    if (!ip) {
        console.error(`IP ${ipId} not found for similarity check`);
        return;
    }

    try {
        console.log(`[SIMILARITY] Starting search for IP: ${ipId}`);

        // 1. Find candidates using Vector Search (Discovery Phase)
        const candidates = await findSimilarCandidates(ipId);

        // 2. Agentic Reasoning (Verification Phase)
        console.log(`[REASONING] Running agentic deep dive on top 3 candidates...`);
        const topCandidates = candidates.slice(0, 3);
        const targetSummary = {
            title: ip.title,
            claims: ip.structured.claims.map(c => c.expandedText)
        };

        for (const candidate of topCandidates) {
            try {
                // Perform deep-dive comparison
                const analysis = await runAgenticComparison(targetSummary, candidate.ipId);
                candidate.agentReasoning = analysis.reasoning;
                candidate.isConflict = analysis.isConflict;

                // Contrastive Rationale Generation
                console.log(`[RATIONALE] Generating point-by-point comparisons for candidate ${candidate.ipId}...`);
                for (const match of candidate.matches) {
                    let sourceContent = "";
                    if (match.sourceSection === 'CLAIM' && match.metadata?.claimNo) {
                        const targetClaim = ip.structured.claims.find(c => c.claimNo === match.metadata.claimNo);
                        sourceContent = targetClaim ? targetClaim.expandedText : "";
                    } else if (match.sourceSection === 'ABSTRACT') {
                        sourceContent = ip.raw.abstractText;
                    }

                    if (sourceContent && match.content) {
                        const rationaleResult = await generateRationale(sourceContent, match.content);
                        match.rationale = JSON.stringify(rationaleResult);
                    }
                }

                console.log(`[REASONING] Candidate ${candidate.ipId} analyzed. Conflict: ${analysis.isConflict}`);
            } catch (err) {
                console.error(`[REASONING ERROR] Failed for candidate ${candidate.ipId}:`, err.message);
                candidate.agentReasoning = "Reasoning service failed.";
            }
        }

        // 3. Determine final verdict based on candidates
        const conflictCandidate = topCandidates.find(c => c.isConflict);
        const finalVerdict = {
            status: conflictCandidate ? 'CONFLICT' : (topCandidates.length > 0 ? 'POTENTIAL_INFRINGE' : 'CLEAN'),
            summary: conflictCandidate
                ? `Conflict detected with IP ${conflictCandidate.ipId}. ${conflictCandidate.agentReasoning?.substring(0, 200) || ''}...`
                : "No definitive legal conflicts found among top candidates.",
            confidence: conflictCandidate ? 0.9 : 0.7
        };

        await IP.findByIdAndUpdate(ipId, {
            'analysis.similarIPs': candidates,
            'analysis.finalVerdict': finalVerdict,
            ingestionStatus: 'ANALYZED'
        });

        const duration = Date.now() - startTime;
        await logAnalysisMetrics(ipId, { duration, outcome: 'SUCCESS' });

        console.log(`[SUCCESS] AI Analysis complete for ${ipId}. Verdict: ${finalVerdict.status}`);
    } catch (error) {
        console.error(`[ERROR] Similarity/Reasoning failed for ${ipId}:`, error.message);
        await updateIngestionStatus(ipId, 'FAILED');
    }
}
