export function extractDependencies(claimText) {
    const deps = new Set();
    // Match patterns like "claim 1", "claims 1 and 2", "claims 1-3", "claim 1, 2, or 3"
    const regex = /claim[s]?\s+([\d,\s\---toandor]+)/gi;

    let match;
    while ((match = regex.exec(claimText)) !== null) {
        const potentialContent = match[1];

        // Handle ranges like 1-5 or 1 to 5
        const rangeMatch = potentialContent.match(/(\d+)\s*(?:\-|–|—|to)\s*(\d+)/i);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) deps.add(i);
            }
        }

        // Handle lists like 1, 2, 3
        const numbers = potentialContent.match(/\d+/g);
        if (numbers) {
            numbers.forEach(num => deps.add(parseInt(num, 10)));
        }
    }

    // A claim cannot depend on itself
    const claimNoMatch = claimText.match(/^\d+/);
    if (claimNoMatch) {
        const currentNo = parseInt(claimNoMatch[0], 10);
        deps.delete(currentNo);
    }

    return Array.from(deps).sort((a, b) => a - b);
}
