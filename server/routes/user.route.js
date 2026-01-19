import express from 'express';
import {
    addIP,
    getIPById,
    getIPs,
    updateIP,
    addReply
} from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

// Create IP (may include files)
router.post('/ip', upload.any(), addIP);

// Get IPs
router.get('/my-ips', getIPs);
router.get('/ip/:id', getIPById);

// Update IP (no files)
router.put('/ip/:id', updateIP);

// Add reply with attachments
router.post('/ip/:id/reply', upload.any(), addReply);

export default router;
