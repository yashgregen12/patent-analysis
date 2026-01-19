import mupdf from 'mupdf';
import { uploadToCloudinary } from '../../utils/cloudinary.js';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import os from 'os';

/**
 * Extracts images from a PDF buffer by rendering each page as a PNG.
 * @param {Buffer} pdfBuffer - The PDF content.
 * @returns {Promise<Array>} - List of image objects with page numbers and secure URLs.
 */
export async function extractImages(pdfBuffer) {
    try {
        // 1. Load the PDF document
        const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
        const pageCount = doc.countPages();
        const extractedImages = [];

        for (let i = 0; i < pageCount; i++) {
            const page = doc.loadPage(i);
            const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.deviceRGB, false);
            const pngBuffer = pixmap.asPNG();

            // 2. Save temporarily to disk for Cloudinary upload (uploadToCloudinary expects a path)
            const tempPath = path.join(os.tmpdir(), `diagram_${uuidv4()}.png`);
            await fs.writeFile(tempPath, pngBuffer);

            // 3. Upload to Cloudinary
            const uploadResult = await uploadToCloudinary(tempPath);

            extractedImages.push({
                page: i + 1,
                imageRef: `page_${i + 1}`,
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id
            });

            // 4. Cleanup temp file
            await fs.unlink(tempPath);
        }

        return extractedImages;
    } catch (error) {
        console.error('Error in diagramExtractor:', error.message);
        return [];
    }
}
