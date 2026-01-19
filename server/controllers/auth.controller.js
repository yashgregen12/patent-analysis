import jwt from "jsonwebtoken";
import config from "../utils/config.js";
import { generateTokens } from "../utils/generateTokens.js";

export const googleCallback = (req, res) => {
    try {

        console.log("[DEBUG] Google Callback Started : ", req.user);
        const user = req.user;
        if (!user) {
            throw new Error("User not found in request");
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(req.user);


        console.log(`User ${user.id} successfully authenticated`);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // Redirect based on role
        let redirectUrl = `${process.env.CLIENT_URL}/dashboard`;
        if (user.role === 'IPAttorney') {
            redirectUrl = `${process.env.CLIENT_URL}/attorney/dashboard`;
        } else if (user.role === 'Admin') {
            redirectUrl = `${process.env.CLIENT_URL}/admin/dashboard`;
        } else if (user.role === 'Applicant') {
            redirectUrl = `${process.env.CLIENT_URL}/dashboard`;
        }

        res.redirect(redirectUrl);

    } catch (error) {
        console.error("Error in Google callback:", error);
        res.redirect(`${config.CLIENT_URL}/login?error=auth_failed`);
    }
};

export const logoutUser = (req, res) => {
    try {
        // Clear cookies
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ error: "Failed to logout" });
            }

            // Logout passport
            req.logout(() => {
                console.log("User logged out successfully");
                res.redirect(config.CLIENT_URL);
            });
        });
    } catch (error) {
        console.error("Error in logout:", error);
        res.status(500).json({ error: "Failed to logout" });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            console.error("No refresh token provided");
            return res.status(401).json({
                error: "No refresh token provided",
            });
        }

        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        if (!payload || !payload.id) {
            return res.status(403).json({
                error: "Invalid refresh token",
            });
        }

        const accessToken = jwt.sign(
            { id: payload.id },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: "15m" }
        );

        console.log(`Token refreshed for user ${payload.id}`);
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        return res.status(200).json({ message: "Token refreshed successfully" });
    } catch (error) {
        console.error("Error refreshing token:", error);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                error: "Refresh token expired",
                redirect: true
            });
        }

        res.status(403).json({
            error: "Invalid refresh token",
            redirect: true
        });
    }
};