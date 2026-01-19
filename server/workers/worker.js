import { consume, connectQueue } from '../utils/queue.js';
import Job from '../models/job.model.js';
import { handlePatentIngest } from '../jobs/consumers/patentIngest.consumer.js';
import { handleSimilarityCheck } from '../jobs/consumers/similarityCheck.consumer.js';

async function updateJobStatus(jobId, status, error = null) {
    try {
        await Job.findByIdAndUpdate(jobId, { status, error });
    } catch (e) {
        console.error(`Failed to update job ${jobId} status:`, e);
    }
}

async function processJob(job) {
    console.log(`[JOB] Processing ${job.type} (ID: ${job.id})`);
    await updateJobStatus(job.id, 'RUNNING');

    try {
        if (job.type === 'PATENT_INGEST') {
            await handlePatentIngest(job);
        } else if (job.type === 'SIMILARITY_CHECK') {
            await handleSimilarityCheck(job);
        } else {
            console.warn(`Unknown job type: ${job.type}`);
        }
        await updateJobStatus(job.id, 'COMPLETED');
    } catch (error) {
        console.error(`[JOB ERROR] Job ${job.id} failed:`, error);
        await updateJobStatus(job.id, 'FAILED', error.message);
    }
}

export async function startWorker() {
    await connectQueue();
    console.log('Worker started and waiting for jobs...');

    await consume(async (job) => {
        await processJob(job);
    });
}
