import IP from '../../models/ip.model.js';

/**
 * Logs metrics for a completed analysis job.
 * @param {string} ipId - The IP analyzed.
 * @param {Object} metrics - Data including duration, token usage estimate, etc.
 */
export async function logAnalysisMetrics(ipId, metrics) {
    try {
        console.log(`[OBSERVABILITY] Metric for IP ${ipId}:`, {
            durationMs: metrics.duration,
            timestamp: new Date(),
            outcome: metrics.outcome
        });

        // In a production app, we would write this to a dedicated Analytics DB 
        // or a monitoring service like Datadog/NewRelic.
        // For now, we'll use console logging as our "Observability" layer.
    } catch (error) {
        console.error("Observability logging failed:", error.message);
    }
}

/**
 * Retrieves system-wide analysis statistics for the Admin dashboard.
 */
export async function getSystemStats() {
    const totalIPs = await IP.countDocuments();
    const analyzedIPs = await IP.countDocuments({ ingestionStatus: 'ANALYZED' });
    const failedIPs = await IP.countDocuments({ ingestionStatus: 'FAILED' });

    return {
        totalIPs,
        analyzedIPs,
        failedIPs,
        successRate: totalIPs > 0 ? (analyzedIPs / totalIPs) * 100 : 0
    };
}
