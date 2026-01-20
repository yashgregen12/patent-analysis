import User from "../models/user.model.js";
import { generateTokens } from "../utils/generateTokens.js";

/**
 * Login Applicant
 * Authenticates an applicant using Application Number and Email.
 * These users are pre-created by the IP Attorney.
 */
export const loginApplicant = async (req, res) => {
    try {
        const { applicationNumber, email } = req.body;

        if (!applicationNumber || !email) {
            return res.status(400).json({ message: "Application number and email are required" });
        }

        // Find user matching both application number and email
        const user = await User.findOne({
            applicationNumber: applicationNumber,
            email: email
        });
 
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials. Please check your application number and email." });
        }

        // Generate tokens (Reuse existing utility)
        const { accessToken, refreshToken } = generateTokens(user);

        // Set cookies
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });

        // If this is the first time login, we mark them as verified/claimed
        if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                applicationNumber: user.applicationNumber
            }
        });

    } catch (error) {
        console.error("Error in applicant login:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
