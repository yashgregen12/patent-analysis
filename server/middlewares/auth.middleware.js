import jwt from 'jsonwebtoken';
import User from "../models/user.model.js"


export const authMiddleware = async (req, res, next) => {
    const accessToken = req.cookies.accessToken;

    console.log("Tokens :", req.cookies);

    if (!accessToken) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

