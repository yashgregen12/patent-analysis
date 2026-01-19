import express from "express";
import { changeStatus, getAllIPs, getIPById, createApplicant, addFER, runAnalysis } from "../controllers/ip-attorney.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.use(authMiddleware); // Protected routes

router.get("/ips", getAllIPs);
router.get("/ips/:id", getIPById);
router.post("/ips/:id/status", changeStatus);
router.post("/ips/:id/run-analysis", runAnalysis);
router.post("/ips/:id/fer", upload.any(), addFER);
router.post("/create-applicant", createApplicant);

export default router;