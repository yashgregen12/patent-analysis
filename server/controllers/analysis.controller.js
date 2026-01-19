import IP from '../models/ip.model.js';

/**
 * Get full analysis for an IP
 */
export const getAnalysisByIpId = async (req, res) => {
    try {
        const { ipId } = req.params;
        const ip = await IP.findById(ipId);

        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        return res.status(200).json({ success: true, data: ip });
    } catch (error) {
        console.error('Error fetching analysis:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Inspect raw extracted content
 */
export const getRawContent = async (req, res) => {
    try {
        const { ipId } = req.params;
        const ip = await IP.findById(ipId);

        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                version: ip.ingestionVersion,
                status: ip.ingestionStatus,
                raw: ip.raw
            }
        });
    } catch (error) {
        console.error('Error fetching raw content:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Inspect expanded claims
 */
export const getExpandedClaims = async (req, res) => {
    try {
        const { ipId } = req.params;
        const ip = await IP.findById(ipId);

        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                version: ip.ingestionVersion,
                claims: ip.structured?.claims || [],
                descriptionChunks: ip.structured?.descriptionChunks || []
            }
        });
    } catch (error) {
        console.error('Error fetching claims:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Inspect processed diagrams
 */
export const getProcessedDiagrams = async (req, res) => {
    try {
        const { ipId } = req.params;
        const ip = await IP.findById(ipId);

        if (!ip) {
            return res.status(404).json({ success: false, message: 'IP not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                version: ip.ingestionVersion,
                diagrams: ip.structured?.diagrams || [],
                diagramImages: ip.raw?.diagramImages || []
            }
        });
    } catch (error) {
        console.error('Error fetching diagrams:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
