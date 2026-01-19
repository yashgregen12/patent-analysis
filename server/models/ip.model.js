import mongoose from 'mongoose';

const ipSchema = new mongoose.Schema({
    title: { type: String, required: true },
    preambleToDescription: {
        type: String,
        enum: ["Provisional", "Complete"],
        required: true,
    },

    // Inventors/Applicants information
    inventors: [{
        name: String,
        nationality: String,
        address: String,
    }],

    description: {
        public_id: String,
        secure_url: String,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    abstract: {
        public_id: String,
        secure_url: String,
    },
    claims: {
        public_id: String,
        secure_url: String,
    },
    diagrams: {
        public_id: String,
        secure_url: String,
    },
    // Track status changes with timestamps
    statusTimeline: [{
        status: {
            type: String,
            enum: [
                "submitted",
                "under_review",
                "revision_required",
                "approved",
                "rejected"
            ],
            required: true
        },
        timestamp: {
            type: Date,
            required: true,
            default: Date.now
        },
        comment: String // optional note about the change
    }],
    // Current status for quick access and queries
    currentStatus: {
        type: String,
        enum: [
            "submitted",
            "under_review",
            "revision_required",
            "approved",
            "rejected"
        ],
        default: "submitted",
    },
    ipcClass: String, // e.g., "G06F", "H04L"
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    // ========== AI INGESTION FIELDS (merged from Patent model) ==========
    ingestionStatus: {
        type: String,
        enum: ['PENDING', 'QUEUED', 'INGESTING', 'RAW_EXTRACTED', 'PROCESSED', 'ANALYZED', 'FAILED'],
        default: 'PENDING'
    },
    ingestionVersion: {
        type: Number,
        default: 1
    },
    raw: {
        abstractText: String,
        claimsText: String,
        descriptionText: String,
        diagramImages: [{
            page: Number,
            imageRef: String,
            secure_url: String
        }],
        citations: [{
            type: String,
            number: String,
            raw: String,
            url: String
        }]
    },
    structured: {
        claims: [{
            claimNo: Number,
            text: String,
            dependsOn: [Number],
            expandedText: String
        }],
        descriptionChunks: [String],
        diagrams: [{
            type: String,
            representation: mongoose.Schema.Types.Mixed,
            semanticSummary: String
        }]
    },
    analysis: {
        similarIPs: [{
            ipId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'IP'
            },
            score: Number,
            matches: [{
                sourceSection: String,
                matchSection: String,
                content: String,
                score: Number,
                metadata: mongoose.Schema.Types.Mixed,
                rationale: String
            }],
            agentReasoning: String,
            isConflict: { type: Boolean, default: false }
        }],
        finalVerdict: {
            status: { type: String, enum: ['CLEAN', 'POTENTIAL_INFRINGE', 'CONFLICT'], default: 'CLEAN' },
            summary: String,
            confidence: Number
        },
        analysisReport: {
            title: String,
            content: String,
            generatedAt: Date
        }
    },
    // ========== END AI INGESTION FIELDS ==========

    similarIPs: [{
        ip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IP'
        },
        info: {
            sectionWiseAnalysis: {
                abstractSimilarity: String,
                technicalApproachSimilarity: String,
                architectureSimilarity: String,
                claimsSimilarity: String,
            },
            overlappingConcepts: [String],
            noveltyInIPB: [String],
            overallAssessment: {
                similarityLevel: Number,
                explanation: String,
            }
        }
    }],
    blockchain: {
        txHash: String,
        blockNumber: Number,
        network: String,
        contractAddress: String,
        documentHash: String,
        ownerWallet: String,
        timestamp: Date
    },
    chats: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        type: {
            type: String,
            enum: ['FER', 'response'],
            required: true
        },
        documents: [{
            public_id: String,
            secure_url: String,
            name: String
        }],
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    certificate: {
        url: String,
        issuedDate: Date
    }
},
    { timestamps: true }
);

const IP = mongoose.model('IP', ipSchema);

export default IP;

// ========== HELPER FUNCTIONS FOR INGESTION ==========
export const getIP = async (id) => {
    return await IP.findById(id);
};

export const updateIngestionStatus = async (id, status) => {
    return await IP.findByIdAndUpdate(id, { ingestionStatus: status }, { new: true });
};

export const addRawContent = async (id, rawContent) => {
    return await IP.findByIdAndUpdate(id, {
        raw: rawContent,
        ingestionStatus: 'RAW_EXTRACTED'
    }, { new: true });
};

// ========== END HELPER FUNCTIONS ==========

ipSchema.pre('save', function (next) {
    if (this.isModified('chats')) {
        const chats = this.chats;
        for (let i = 0; i < chats.length; i++) {
            if (i === 0 && chats[i].type === 'response') {
                return next(new Error('A response cannot be sent without a preceding FER.'));
            }
            if (i > 0 && chats[i].type === chats[i - 1].type) {
                return next(new Error(`Consecutive ${chats[i].type} types are not allowed.`));
            }
        }
    }
    next();
});
