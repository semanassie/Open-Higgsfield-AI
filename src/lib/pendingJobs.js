import { MUAPI_OUTPUT_RETENTION_MS } from './generationHistory.js';

const PENDING_KEY = 'muapi_pending_jobs';
/** Pending jobs older than this are dropped (MuAPI outputs won't be retrievable after 30 days). */
const MAX_JOB_AGE_MS = MUAPI_OUTPUT_RETENTION_MS;

export function savePendingJob(job) {
    try {
        const jobs = pruneStaleJobs(getAllPendingJobs()).filter(j => j.requestId !== job.requestId);
        jobs.push({ ...job, submittedAt: job.submittedAt || Date.now() });
        localStorage.setItem(PENDING_KEY, JSON.stringify(jobs));
    } catch (e) {
        console.warn('[PendingJobs] Failed to save:', e);
    }
}

export function removePendingJob(requestId) {
    try {
        const jobs = getAllPendingJobs().filter(j => j.requestId !== requestId);
        localStorage.setItem(PENDING_KEY, JSON.stringify(jobs));
    } catch (e) {
        console.warn('[PendingJobs] Failed to remove:', e);
    }
}

export function getPendingJobs(studioType) {
    const all = pruneStaleJobs(getAllPendingJobs());
    if (all.length !== getAllPendingJobs().length) {
        localStorage.setItem(PENDING_KEY, JSON.stringify(all));
    }
    return studioType ? all.filter(j => j.studioType === studioType) : all;
}

function getAllPendingJobs() {
    try {
        return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    } catch {
        return [];
    }
}

function pruneStaleJobs(jobs) {
    const cutoff = Date.now() - MAX_JOB_AGE_MS;
    return (jobs || []).filter(j => (j.submittedAt || 0) > cutoff);
}
