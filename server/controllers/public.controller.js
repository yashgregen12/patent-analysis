import IP from '../models/ip.model.js';

/**
 * Get all approved IPs (public access)
 * Regular users can view granted/approved patents
 */
export const getApprovedIPs = async (req, res) => {
    try {
        const ips = await IP.find({ currentStatus: 'granted' })
            .select('title preambleToDescription abstract createdAt')
            .populate('creator', 'name')
            .lean();

        return res.status(200).json({ success: true, data: ips });
    } catch (error) {
        console.error('Error fetching approved IPs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get single approved IP details (public access)
 */
export const getApprovedIPById = async (req, res) => {
    try {
        const { id } = req.params;

        const ip = await IP.findOne({ _id: id, currentStatus: 'granted' })
            .select('title preambleToDescription abstract description claims diagrams createdAt')
            .populate('creator', 'name')
            .lean();

        if (!ip) {
            return res.status(404).json({ success: false, message: 'Approved IP not found' });
        }

        return res.status(200).json({ success: true, data: ip });
    } catch (error) {
        console.error('Error fetching approved IP:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
