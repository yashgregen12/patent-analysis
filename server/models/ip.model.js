import mongoose from 'mongoose';

/* =========================
   CORE PATENT / IP SCHEMA
========================= */

const ipSchema = new mongoose.Schema({

    /* ---------- BASIC METADATA ---------- */

    title: { type: String, required: true },

    preambleToDescription: {
        type: String,
        enum: ["Provisional", "Complete"],
        required: true,
    },

    ipc: {
        class: String,          // e.g. "G06F"
        source: {
            type: String,
            enum: ['APPLICANT', 'EXAMINER', 'AI'],
            required: true
        },
        confidence: {
            type: Number,
            validate: {
                validator: function (v) {
                    return this.ipc.source === 'AI' || typeof v === 'number';
                },
                message: 'AI IPC must include confidence'
            }
        }
    },

    inventors: [{
        name: String,
        nationality: String,
        address: String,
    }],

    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    /* ---------- FILE REFERENCES (RAW PDFs) ---------- */

    abstract: { public_id: String, secure_url: String },
    claims: { public_id: String, secure_url: String },
    description: { public_id: String, secure_url: String },
    diagrams: { public_id: String, secure_url: String },

    /* ---------- BUSINESS / LEGAL WORKFLOW ---------- */

    currentStatus: {
        type: String,
        enum: [
            "submitted",
            "under_review",
            "revision_required",
            "approved",
            "rejected"
        ],
        default: "submitted"
    },

    statusTimeline: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        comment: String
    }],

    /* =========================
       AI INGESTION PIPELINE
    ========================= */

    ingestion: {

        status: {
            type: String,
            enum: [
                'PENDING',
                'QUEUED',
                'INGESTING',
                'RAW_EXTRACTED',
                'CLAIMS_PROCESSED',
                'DIAGRAMS_PROCESSED',
                'INDEXED',
                'FAILED'
            ],
            default: 'PENDING'
        },

        version: { type: Number, default: 1 },

        /* ---------- RAW EXTRACTION ---------- */

        raw: {
            abstractText: String,
            claimsText: String,
            descriptionText: String,
            diagramImages: [{
                page: Number,
                secure_url: String
            }],
            citations: [{
                type: {
                    type: String,
                    enum: ['US', 'EP', 'WO', 'IN']
                },
                number: String,
                raw: String,
                url: String
            }]

        },

        /* ---------- STRUCTURED DATA ---------- */

        structured: {

            /* Claims (Week 3) */
            claims: [{
                claimNo: Number,
                text: String,
                dependsOn: [Number],
                expandedText: String,
                isExpanded: { type: Boolean, default: true }
            }],

            /* Description chunks (Week 3) */
            descriptionChunks: [{
                chunkId: String,
                text: String
            }],

            /* Diagrams (Week 4) */
            diagrams: [{
                diagramId: String,
                type: {
                    type: String,
                    enum: ['flowchart', 'block_diagram', 'mechanical', 'unknown']
                },
                representation: {
                    nodes: [mongoose.Schema.Types.Mixed],
                    edges: [mongoose.Schema.Types.Mixed],
                    components: [String],
                    visionEmbeddingRef: String
                },
                semanticSummary: String,
                confidence: Number
            }]
        }
    },

    /* =========================
       ANALYSIS REFERENCES ONLY
       (Snapshots live elsewhere)
    ========================= */

    analysisRefs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SimilaritySnapshot'
    }],

    /* ---------- CERTIFICATE / BLOCKCHAIN (OPTIONAL) ---------- */

    certificate: {
        url: String,
        issuedDate: Date
    },

    blockchain: {
        txHash: String,
        blockNumber: Number,
        network: String,
        documentHash: String,
        timestamp: Date
    }

}, { timestamps: true });

export default mongoose.model('IP', ipSchema);
