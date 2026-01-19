export function parseClaims(rawClaimsText) {
    if (!rawClaimsText) return [];

    const claims = [];
    // More robust regex for claim boundaries (handles common patent formats)
    const regex = /(?:^|\n)\s*(\d+)\.(?:\s+|)([\s\S]*?)(?=(?:\n\s*\d+\.|$))/g;

    let match;
    while ((match = regex.exec(rawClaimsText)) !== null) {
        claims.push({
            claimNo: parseInt(match[1], 10),
            text: match[2].trim(),
            dependsOn: []
        });
    }
    return claims;
}
