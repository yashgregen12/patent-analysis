/**
 * Extracts patent citations (US, EP, WO, etc.) from raw text using regex.
 */
export function extractCitations(text) {
    if (!text) return [];

    const citations = new Set();

    // US Patents: US 1,234,567 or US1234567 or US-1234567
    const usRegex = /US\s?([0-9,]{6,10})/gi;

    // EP Patents: EP 1,234,567 or EP1234567
    const epRegex = /EP\s?([0-0,]{7,10})/gi;

    // WO (PCT) Publications: WO 2024/123456 or WO2024123456
    const woRegex = /WO\s?([0-9/]{10,12})/gi;

    let match;

    while ((match = usRegex.exec(text)) !== null) {
        citations.add({
            type: 'US',
            number: match[1].replace(/,/g, ''),
            raw: match[0],
            url: `https://patents.google.com/patent/US${match[1].replace(/,/g, '')}`
        });
    }

    while ((match = epRegex.exec(text)) !== null) {
        citations.add({
            type: 'EP',
            number: match[1].replace(/,/g, ''),
            raw: match[0],
            url: `https://patents.google.com/patent/EP${match[1].replace(/,/g, '')}`
        });
    }

    while ((match = woRegex.exec(text)) !== null) {
        citations.add({
            type: 'WO',
            number: match[1].replace(/[\/,]/g, ''),
            raw: match[0],
            url: `https://patents.google.com/patent/WO${match[1].replace(/[\/,]/g, '')}`
        });
    }

    return Array.from(citations);
}
