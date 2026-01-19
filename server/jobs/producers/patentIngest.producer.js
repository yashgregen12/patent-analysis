import { enqueue } from '../../utils/queue.js';
import IP from '../../models/ip.model.js';
import Job from '../../models/job.model.js';

/**
 * Creates an ingestion job for an IP.
 * @param {string} ipId - The ID of the IP to ingest.
 * @param {boolean} isRevision - Whether this is a re-analysis after amendment.
 */
export async function createIngestJob(ipId, isRevision = false) {
    try {
        const ip = await IP.findById(ipId);
        if (!ip) throw new Error('IP not found');

        // Increment version if this is a revision
        const updateData = {
            ingestionStatus: 'QUEUED'
        };

        if (isRevision) {
            updateData.ingestionVersion = (ip.ingestionVersion || 1) + 1;
        }

        await IP.findByIdAndUpdate(ipId, updateData);

        // Create Job record (for tracking)
        const job = await Job.create({
            type: 'PATENT_INGEST',
            ipId: ipId,  // Changed from patentId to ipId
            status: 'QUEUED'
        });

        // Send to queue
        await enqueue({
            id: job._id,
            type: 'PATENT_INGEST',
            ipId: ipId  // Changed from patentId to ipId
        });

        return job;
    } catch (error) {
        console.error('Failed to create ingest job:', error);
        throw error;
    }
}
