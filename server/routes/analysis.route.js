import express from 'express';
import {
    getAnalysisByIpId,
    getRawContent,
    getExpandedClaims,
    getProcessedDiagrams
} from '../controllers/analysis.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Main analysis endpoint
router.get('/:ipId', authMiddleware, getAnalysisByIpId);

// Inspection endpoints (per audit requirements)
router.get('/:ipId/raw', authMiddleware, getRawContent);
router.get('/:ipId/claims', authMiddleware, getExpandedClaims);
router.get('/:ipId/diagrams', authMiddleware, getProcessedDiagrams);

export default router;
