import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["PATENT_INGEST", "SIMILARITY_CHECK"],
        required: true
    },
    status: {
        type: String,
        enum: ["QUEUED", "RUNNING", "COMPLETED", "FAILED"],
        default: "QUEUED"
    },
    ipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IP',
        required: true
    },
    error: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const Job = mongoose.model('Job', jobSchema);

export default Job;

