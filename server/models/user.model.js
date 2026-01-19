import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    // Basic Information
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    name: { type: String },
    avatar: { type: String },

    // Authentication
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    googleAccessToken: { type: String, select: false },
    googleRefreshToken: { type: String, select: false },

    // Role & Authorization
    role: {
        type: String,
        enum: ["User", "Applicant", "IPAttorney", "Admin"],
        required: true,
        default: "User",
    },

    // Applicant-specific fields
    applicationNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },

    // IP Attorney-specific fields
    isAuthorizedAttorney: {
        type: Boolean,
        default: false
    },
    authorizedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    authorizedAt: { type: Date },
    walletAddress: {
        type: String,
        unique: true,
        sparse: true,
        match: /^0x[a-fA-F0-9]{40}$/,
    },

    // Relations
    ips: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IP'
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ applicationNumber: 1 });

const User = mongoose.model('User', userSchema);

export default User;