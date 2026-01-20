import User from "../models/user.model.js";
import IPAttorney from "../models/ip-attorney.model.js";
import IP from "../models/ip.model.js";
import { createSimilarityCheckJob } from "../jobs/producers/similarityCheck.producer.js";
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * Create Applicant
 * Allows an IP Attorney to create a new applicant user with an application number.
 */
export const createApplicant = async (req, res) => {
    try {
        const { email, name } = req.body;
        const attorney = req.user;

        // Check if user is authorized attorney
        if (attorney.role !== 'IPAttorney' || !attorney.isAuthorizedAttorney) {
            return res.status(403).json({ success: false, message: 'Only authorized IP Attorneys can create applicants' });
        }

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Generate unique application number
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const applicationNumber = `APP-${new Date().getFullYear()}-${timestamp}-${random}`;

        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            // Update existing user
            if (user.applicationNumber) {
                return res.status(400).json({
                    success: false,
                    message: 'User already has an application number',
                    data: { applicationNumber: user.applicationNumber }
                });
            }
            user.applicationNumber = applicationNumber;
            user.role = 'Applicant';
            if (name) user.name = name;
        } else {
            // Create new user
            user = new User({
                email,
                name: name || '',
                applicationNumber,
                role: 'Applicant',
                isVerified: false
            });
        }

        await user.save();

        return res.status(201).json({
            success: true,
            message: 'Applicant created successfully',
            data: {
                email: user.email,
                name: user.name,
                applicationNumber: user.applicationNumber,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error creating applicant:', error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const addFER = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const attorney = req.user;

        if (attorney.role !== 'IPAttorney' || !attorney.isAuthorizedAttorney) {
            return res.status(403).json({ success: false, message: 'Only authorized IP Attorneys can issue FERs' });
        }

        const ip = await IP.findById(id);
        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        // Check if this attorney is assigned to this IP
        if (ip.reviewer && ip.reviewer.toString() !== attorney._id.toString()) {
            return res.status(403).json({ success: false, message: 'You are not assigned to review this IP' });
        }

        const documents = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadToCloudinary(file.path);
                documents.push({
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                    name: file.originalname
                });
            }
        }

        ip.chats.push({
            user: attorney._id,
            message: message,
            type: 'FER',
            documents: documents,
            timestamp: new Date()
        });

        ip.currentStatus = 'revision_required';
        ip.statusTimeline.push({
            status: 'revision_required',
            comment: 'FER Issued',
            timestamp: new Date()
        });

        await ip.save();
        return res.status(200).json({ success: true, data: ip });
    } catch (error) {
        console.error('Error adding FER:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getAllIPs = async (req, res) => {
    try {
        const attorney = req.user;
        const ips = await IP.find({ reviewer: attorney._id })
            .populate('creator', 'name email applicationNumber')
            .sort({ updatedAt: -1 });
        return res.status(200).json({ success: true, data: ips });
    } catch (error) {
        console.error('Error fetching IPs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getIPById = async (req, res) => {
    try {
        const { id } = req.params;
        const ip = await IP.findById(id).populate('creator', 'name email applicationNumber').populate('chats.user', 'name email role');
        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }
        return res.status(200).json({ success: true, data: ip });
    } catch (error) {
        console.error('Error fetching IP by ID:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const user = req.user;

        if (user.role !== 'IPAttorney') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const ip = await IP.findById(id);
        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        if (status) {
            ip.currentStatus = status;
            ip.statusTimeline.push({
                status: status,
                comment: comment || '',
                timestamp: new Date()
            });
        }

        await ip.save();
        return res.status(200).json({ success: true, data: ip });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Trigger AI Similarity Analysis
 */
export const runAnalysis = async (req, res) => {
    try {
        const { id } = req.params;
        const attorney = req.user;

        if (attorney.role !== 'IPAttorney' || !attorney.isAuthorizedAttorney) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const ip = await IP.findById(id);

        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found.' });
        }

        if (['QUEUED', 'INGESTING', 'RAW_EXTRACTED'].includes(ip.ingestionStatus)) {
            return res.status(400).json({ success: false, message: 'Ingestion is still in progress.' });
        }

        if (ip.ingestionStatus === 'PENDING') {
            return res.status(400).json({ success: false, message: 'IP has not been ingested yet. Please wait for ingestion.' });
        }

        // Trigger similarity check job
        await createSimilarityCheckJob(id);

        return res.status(200).json({
            success: true,
            message: 'AI Similarity Analysis triggered successfully.',
            data: { ipId: id, status: 'QUEUED' }
        });
    } catch (error) {
        console.error('Error triggering analysis:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};