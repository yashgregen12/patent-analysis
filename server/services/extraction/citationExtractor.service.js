export function extractCitations(text) {
    if (!text) return [];

    const map = new Map();

    const patterns = [
        {
            type: 'US',
            regex: /US\s?-?\s?([0-9,]{6,10})/gi,
            url: n => `https://patents.google.com/patent/US${n}`
        },
        {
            type: 'EP',
            regex: /EP\s?-?\s?([0-9,]{6,10})/gi,
            url: n => `https://patents.google.com/patent/EP${n}`
        },
        {
            type: 'WO',
            regex: /WO\s?-?\s?([0-9/]{6,12})/gi,
            url: n => `https://patents.google.com/patent/WO${n.replace('/', '')}`
        },
        {
            // 🇮🇳 India patents
            type: 'IN',
            regex: /IN\s?-?\s?([0-9]{3,5}(?:\/[A-Z]{3}\/[0-9]{4})|[0-9]{6,15})\s?[A-Z]?/gi,
            url: n => {
                const clean = n.replace(/[^0-9]/g, '');
                return `https://patents.google.com/patent/IN${clean}`;
            }
        }
    ];

    for (const { type, regex, url } of patterns) {
        let match;
        while ((match = regex.exec(text)) !== null) {
            const num = match[1].replace(/[,/]/g, '');
            const key = `${type}-${num}`;
            if (!map.has(key)) {
                map.set(key, {
                    type,
                    number: num,
                    raw: match[0],
                    url: url(match[1])
                });
            }
        }
    }

    return Array.from(map.values());
}
