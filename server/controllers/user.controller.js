import IP from '../models/ip.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { createIngestJob } from '../jobs/producers/patentIngest.producer.js';

export const addIP = async (req, res) => {
    try {
        const { title, preambleToDescription } = req.body;
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Helper to get file by fieldname
        const getFile = (fieldname) => req.files?.find(f => f.fieldname === fieldname);

        const descFile = getFile('description');
        const abstractFile = getFile('abstract');
        const claimsFile = getFile('claims');
        const diagramsFile = getFile('diagrams');

        // Validation - Basic checks
        if (!title || !preambleToDescription) {
            return res.status(400).json({ success: false, message: 'Title and Preamble are required' });
        }
        if (!descFile || !abstractFile || !claimsFile) {
            return res.status(400).json({ success: false, message: 'Description, Abstract, and Claims documents are required.' });
        }

        // Upload files
        const upload = async (file) => {
            if (!file) return null;
            const res = await uploadToCloudinary(file.path);
            return {
                public_id: res.public_id,
                secure_url: res.secure_url
            };
        };

        const description = await upload(descFile);
        const abstract = await upload(abstractFile);
        const claims = await upload(claimsFile);
        const diagrams = diagramsFile ? await upload(diagramsFile) : undefined;

        const newIP = new IP({
            title,
            preambleToDescription,
            description,
            abstract,
            claims,
            diagrams,
            creator: user._id,
        });

        user.ips.push(newIP._id);

        await newIP.save();
        await user.save();

        // Trigger Ingestion Pipeline (Phase 1, Week 1)
        try {
            await createIngestJob(newIP._id);
        } catch (jobError) {
            console.error('[Error] Failed to queue ingestion job:', jobError.message);
        }

        return res.status(201).json({ success: true, data: newIP });
    } catch (error) {
        console.error('Error adding IP:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

export const getIPs = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const ips = await IP.find({ creator: user._id }).select('title preambleToDescription currentStatus createdAt');
        return res.status(200).json({ success: true, data: ips });
    } catch (error) {
        console.error('Error fetching IPs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

export const getIPById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Select IP' });
        }

        const ip = await IP.findOne({ _id: id, creator: user._id }).populate('chats.user', 'name email role applicationNumber');
        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }
        return res.status(200).json({ success: true, data: ip });
    } catch (error) {
        console.error('Error fetching IP by ID:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

export const updateIP = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, preambleToDescription } = req.body;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!id) {
            return res.status(400).json({ success: false, message: 'Select IP' });
        }

        const ip = await IP.findOne({ _id: id, creator: user._id });
        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        if (ip.currentStatus !== 'submitted' && ip.currentStatus !== 'revision_required') {
            return res.status(400).json({ success: false, message: "Approved or rejected IPs can't be changed" });
        }

        if (title) ip.title = title;
        if (preambleToDescription) ip.preambleToDescription = preambleToDescription;

        // Note: For file updates, we recommend creating a new revision or using specific endpoints. 
        // Logic for re-uploading individual files is complex and omitted here for brevity, 
        // focusing on metadata updates.

        await ip.save();
        return res.status(200).json({ success: true, data: ip });
    } catch (error) {
        console.error('Error updating IP:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

export const addReply = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const ip = await IP.findById(id);
        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        if (ip.creator.toString() !== user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (ip.chats.length === 0 || ip.chats[ip.chats.length - 1].type === 'response') {
            return res.status(400).json({ success: false, message: 'Response can be sent after FER only.' });
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
            user: user._id,
            type: 'response',
            documents: documents,
            timestamp: new Date()
        });

        // Update status to indicate response submitted
        ip.currentStatus = 'under_review';
        ip.statusTimeline.push({
            status: 'under_review',
            comment: `Applicant submitted response`,
            timestamp: new Date()
        });

        await ip.save();

        // Trigger AI Re-analysis if documents (amendments) are uploaded
        if (documents.length > 0) {
            try {
                console.log(`[AI] Triggering re-analysis for IP ${id} (Revision Support)...`);
                await createIngestJob(ip._id);
            } catch (error) {
                console.error('[AI Error] Failed to trigger re-analysis:', error.message);
            }
        }

        return res.status(200).json({ success: true, data: ip });
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};