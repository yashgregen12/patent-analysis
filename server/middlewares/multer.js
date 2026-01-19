// middlewares/multer.js
import multer from "multer";
import fs from "fs";
import path from "path";

const tempDir = path.join(process.cwd(), "public", "temp");

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, tempDir);
    },
    filename(req, file, cb) {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        cb(null, `${Date.now()}-${cleanName}`);
    },
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter(req, file, cb) {
        if (
            file.mimetype.startsWith("image/") ||
            file.mimetype === "application/pdf"
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only image and PDF files are allowed"));
        }
    },
});
