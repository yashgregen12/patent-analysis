import mongoose from 'mongoose';

const ipAttorneySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    ipActions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IP'
    }],
    walletAddress: {
        type: String,
        unique: true,
        sparse: true,
        match: /^0x[a-fA-F0-9]{40}$/,
    },
    createdAt: { type: Date, default: Date.now }
});

const IPAttorney = mongoose.model('IPAttorney', ipAttorneySchema);

export default IPAttorney;