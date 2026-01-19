import express from 'express';
import { getApprovedIPs, getApprovedIPById } from '../controllers/public.controller.js';

const router = express.Router();

// Public routes - no authentication required
router.get('/ips/approved', getApprovedIPs);
router.get('/ips/approved/:id', getApprovedIPById);

export default router;
