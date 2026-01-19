import express from 'express';
import {
    getAllUsers,
    getUser,
    getAllIPs,
    authorizeIPAttorney,
    revokeIPAttorney,
    assignIPToAttorney,
    getSystemStats,
    createIPForApplicant
} from '../controllers/admin.controller.js';
import { upload } from '../middlewares/multer.js';

const router = express.Router();

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);

// IP management
router.get('/ips', getAllIPs);
router.post('/ips/assign', assignIPToAttorney);
router.post(
    '/ips/create',
    upload.fields([
        { name: 'description', maxCount: 1 },
        { name: 'abstract', maxCount: 1 },
        { name: 'claims', maxCount: 1 },
        { name: 'diagrams', maxCount: 1 }
    ]),
    createIPForApplicant
);

// IP Attorney management
router.post('/attorneys/authorize', authorizeIPAttorney);
router.delete('/attorneys/:id/revoke', revokeIPAttorney);

// System stats
router.get('/stats', getSystemStats);

export default router;