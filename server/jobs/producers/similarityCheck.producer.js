import { enqueue } from '../../utils/queue.js';
import Job from '../../models/job.model.js';

export async function createSimilarityCheckJob(ipId) {
    try {
        const job = await Job.create({
            type: 'SIMILARITY_CHECK',
            ipId,
            status: 'QUEUED'
        });

        await enqueue({
            id: job._id,
            type: 'SIMILARITY_CHECK',
            ipId
        });

        return job;
    } catch (error) {
        console.error('Failed to create similarity check job:', error);
        throw error;
    }
}
