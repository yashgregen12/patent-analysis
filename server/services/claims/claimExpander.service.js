export function expandClaim(claim, allClaimsMap, visited = new Set()) {
    // Prevent infinite recursion in case of malformed data
    if (visited.has(claim.claimNo)) return claim.text;
    visited.add(claim.claimNo);

    let baseText = claim.text;

    // Recursive expansion: find the text of the parents
    if (claim.dependsOn && claim.dependsOn.length > 0) {
        const parentTexts = [];

        for (const parentNo of claim.dependsOn) {
            const parent = allClaimsMap.get(parentNo);
            if (parent) {
                // Recursively expand parent if it has its own dependencies
                const expandedParent = expandClaim(parent, allClaimsMap, visited);
                parentTexts.push(expandedParent.replace(/\.$/, ''));
            }
        }

        if (parentTexts.length > 0) {
            // Join parent texts and prepend to current claim
            // Often patent claims are "The system of claim 1, further comprising..."
            // We want the resulting text to be a coherent logical block.
            baseText = parentTexts.join('; ') + '. ' + baseText;
        }
    }

    return baseText;
}
