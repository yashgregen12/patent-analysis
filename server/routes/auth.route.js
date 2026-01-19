import express from 'express';
import { googleCallback, logoutUser, refreshToken } from '../controllers/auth.controller.js';
import { loginApplicant } from '../controllers/applicant.controller.js';
import passport from '../utils/authPassport.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get("/google", passport.authenticate("login", {
    scope: [
        "profile",
        "email",
    ],
    accessType: 'offline',
    prompt: 'consent',
}));

// Callback route
router.get("/google/callback",
    passport.authenticate("login", {
        failureRedirect: "/login",
        session: true,
    }),
    googleCallback
);

// Applicant Login Route
router.post("/login-applicant", loginApplicant);

// Refresh token route
router.post("/refresh-token", refreshToken);

// Check if authenticated route
router.get("/me", authMiddleware, (req, res) => {
    return res.json({
        success: true,
        user: {
            _id: req.user._id,
            email: req.user.email,
            role: req.user.role,
            applicationNumber: req.user.applicationNumber,
            isAuthorizedAttorney: req.user.isAuthorizedAttorney
        }
    });
});

// Logout routeq
router.get("/logout", authMiddleware, logoutUser);

export default router;