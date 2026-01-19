import { PDFParse } from 'pdf-parse';

export async function extractText(pdfBuffer) {
    try {
        const pdfData = new Uint8Array(pdfBuffer);
        const data = new PDFParse(pdfData);

        console.log("[DEBUG] PDF data:",data);
        const result = await data.getText();
        console.log("[DEBUG] PDF result:",result.text);
        return result.text
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    } catch (error) {
        console.error('Error in pdfTextExtractor:', error.message);
        return '';
    }
}
