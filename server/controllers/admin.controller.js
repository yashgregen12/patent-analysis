import User from "../models/user.model.js";
import IP from "../models/ip.model.js";
import { createIngestJob } from "../jobs/producers/patentIngest.producer.js";

export const getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;

        const users = await User.find(role ? { role } : {})
            .select('-googleAccessToken -googleRefreshToken')
            .populate('authorizedBy', 'email')
            .lean();
        return res.status(200).json({ success: true, data: users });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id)
            .select('-googleAccessToken -googleRefreshToken')
            .populate('ips', 'title currentStatus createdAt')
            .populate('authorizedBy', 'email')
            .lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getAllIPs = async (req, res) => {
    try {
        const { currentStatus } = req.query;
        const filter = {};
        if (currentStatus) filter.currentStatus = currentStatus;

        const ips = await IP.find(filter)
            .select('title preambleToDescription currentStatus createdAt creator reviewer')
            .populate('reviewer', 'email')
            .populate('creator', 'email applicationNumber')
            .lean();

        console.log("[DEBUG] IP response : ", ips)
        return res.status(200).json({ success: true, data: ips });
    } catch (error) {
        console.error('Error fetching IPs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Authorize a user to become an IP Attorney
 * Only admin can do this
 */
export const authorizeIPAttorney = async (req, res) => {
    try {
        const { email } = req.body;
        const admin = req.user;

        if (admin.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only admins can authorize attorneys' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            await User.create({ email, role: 'IPAttorney', isAuthorizedAttorney: true, authorizedBy: admin._id, authorizedAt: new Date() });
            return res.status(200).json({
                success: true,
                message: 'User authorized as IP Attorney',
                data: {
                    email: user.email,
                    role: user.role,
                    authorizedAt: user.authorizedAt
                }
            });
        }

        if (user.role === "Applicant") {
            return res.status(400).json({ success: false, message: 'User is already an applicant' });
        }

        if (user.role === 'IPAttorney' && user.isAuthorizedAttorney) {
            return res.status(400).json({ success: false, message: 'User is already an authorized IP Attorney' });
        }

        user.role = 'IPAttorney';
        user.isAuthorizedAttorney = true;
        user.authorizedBy = admin._id;
        user.authorizedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'User authorized as IP Attorney',
            data: {
                email: user.email,
                role: user.role,
                authorizedAt: user.authorizedAt
            }
        });
    } catch (error) {
        console.error('Error authorizing IP Attorney:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Revoke IP Attorney authorization
 */
export const revokeIPAttorney = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = req.user;

        if (admin.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only admins can revoke attorney status' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.role = 'user';
        user.isAuthorizedAttorney = false;
        user.authorizedBy = null;
        user.authorizedAt = null;
        await user.save();

        return res.status(200).json({ success: true, message: 'IP Attorney authorization revoked' });
    } catch (error) {
        console.error('Error revoking attorney:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Assign an IP to an IP Attorney for review
 */
export const assignIPToAttorney = async (req, res) => {
    try {
        const { ipId, attorneyId } = req.body;
        const admin = req.user;

        if (admin.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only admins can assign IPs' });
        }

        const attorney = await User.findById(attorneyId);
        if (!attorney || attorney.role !== 'IPAttorney' || !attorney.isAuthorizedAttorney) {
            return res.status(400).json({ success: false, message: 'Invalid or unauthorized attorney' });
        }

        const ip = await IP.findById(ipId);
        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        ip.reviewer = attorneyId;
        ip.currentStatus = 'under_review';
        ip.statusTimeline.push({
            status: 'under_review',
            comment: `Assigned to attorney ${attorney.email} by admin`,
            timestamp: new Date()
        });
        await ip.save();

        return res.status(200).json({
            success: true,
            message: 'IP assigned to attorney',
            data: {
                ipId: ip._id,
                ipTitle: ip.title,
                attorney: attorney.email
            }
        });
    } catch (error) {
        console.error('Error assigning IP:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Create IP for an applicant (Admin only)
 * Admin creates IP application on behalf of applicant
 */
export const createIPForApplicant = async (req, res) => {
    try {
        const { email, applicationNumber, title, preambleToDescription, inventors } = req.body;
        const admin = req.user;

        if (admin.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Only admins can create IPs for applicants' });
        }

        let applicant = await User.findOne({ email });

        if (!applicant) {
            applicant = new User({
                email,
                applicationNumber,
                role: 'Applicant'
            });
            await applicant.save();
        }

        applicant.role = 'Applicant';

        const files = req.files || {};
        const { uploadToCloudinary } = await import('../utils/cloudinary.js');

        const ipData = {
            title,
            preambleToDescription,
            inventors: inventors ? JSON.parse(inventors) : [],
            creator: applicant._id,
            currentStatus: 'submitted',
        };

        if (files.description) {
            const result = await uploadToCloudinary(files.description[0].path);
            ipData.description = { public_id: result.public_id, secure_url: result.secure_url };
        }
        if (files.abstract) {
            const result = await uploadToCloudinary(files.abstract[0].path);
            ipData.abstract = { public_id: result.public_id, secure_url: result.secure_url };
        }
        if (files.claims) {
            const result = await uploadToCloudinary(files.claims[0].path);
            ipData.claims = { public_id: result.public_id, secure_url: result.secure_url };
        }
        if (files.diagrams) {
            const result = await uploadToCloudinary(files.diagrams[0].path);
            ipData.diagrams = { public_id: result.public_id, secure_url: result.secure_url };
        }

        const ip = new IP(ipData);
        await ip.save();

        applicant.ips.push(ip._id);
        await applicant.save();

        // Trigger Ingestion Pipeline (Phase 1, Week 1)
        try {
            await createIngestJob(ip._id);
        } catch (jobError) {
            console.error('[Error] Failed to queue ingestion job:', jobError.message);
        }

        return res.status(201).json({
            success: true,
            message: 'IP created successfully for applicant',
            data: ip
        });
    } catch (error) {
        console.error('Error creating IP for applicant:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get system statistics
 */
export const getSystemStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalApplicants = await User.countDocuments({ role: 'Applicant' });
        const totalAttorneys = await User.countDocuments({ role: 'IPAttorney', isAuthorizedAttorney: true });
        const totalIPs = await IP.countDocuments();
        const pendingIPs = await IP.countDocuments({ currentStatus: 'submitted' });
        const approvedIPs = await IP.countDocuments({ currentStatus: 'granted' });

        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalApplicants,
                totalAttorneys,
                totalIPs,
                pendingIPs,
                approvedIPs
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
