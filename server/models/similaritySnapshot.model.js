import mongoose from "mongoose";

/* =====================================================
   SIMILARITY SNAPSHOT (IMMUTABLE, AUDITABLE)
===================================================== */

const similaritySnapshotSchema = new mongoose.Schema({

    /* ---------- IDENTITY ---------- */

    targetIP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IP',
        required: true,
        index: true
    },

    comparedIP: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IP',
        required: true,
        index: true
    },

    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },

    /* ---------- VERSIONING (CRITICAL) ---------- */

    targetIngestionVersion: {
        type: Number,
        required: true
    },

    comparedIngestionVersion: {
        type: Number,
        required: true
    },

    embeddingVersion: {
        type: Number,
        required: true
    },

    /* ---------- SIMILARITY SCORE (EXPLAINABLE) ---------- */

    similarityScore: {
        overall: {
            type: Number,
            required: true
        },
        breakdown: {
            claim: Number,
            abstract: Number,
            description: Number,
            diagram: Number
        }
    },

    /* ---------- SYSTEM CONFIDENCE ---------- */

    confidenceLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        required: true
    },

    confidenceSource: {
        type: String,
        enum: ['SYSTEM', 'AI', 'EXAMINER'],
        default: 'SYSTEM'
    },

    explicitLowConfidenceNote: {
        type: String
        // required only if confidenceLevel === 'LOW' (validated at service layer)
    },

    /* ---------- CLAIM-LEVEL LEGAL ANALYSIS ---------- */

    claimAnalysis: [{
        targetClaim: {
            type: Number,
            required: true
        },
        sourceClaims: {
            type: [Number],
            required: true
        },
        matchType: {
            type: String,
            enum: ['SINGLE', 'COMBINED'],
            required: true
        },
        rationale: {
            type: String,
            required: true
        }
    }],

    /* ---------- DIAGRAM SUPPORT (OPTIONAL) ---------- */

    diagramSupport: {
        used: {
            type: Boolean,
            default: false
        },
        diagramIds: [String],
        explanation: String
    },

    /* ---------- AGENT TRACE (AUDIT ONLY) ---------- */

    agentTrace: {
        prompt: String,
        retrievedEvidence: [mongoose.Schema.Types.Mixed],
        advisoryOutput: mongoose.Schema.Types.Mixed
        // NEVER chain-of-thought, only structured output
    }

}, {
    timestamps: false
});

/* ---------- IMMUTABILITY GUARARD ---------- */
similaritySnapshotSchema.pre('save', function (next) {
    if (!this.isNew) {
        return next(new Error("SimilaritySnapshot is immutable once created."));
    }
    next();
});

export const SimilaritySnapshot =
    mongoose.model('SimilaritySnapshot', similaritySnapshotSchema);
