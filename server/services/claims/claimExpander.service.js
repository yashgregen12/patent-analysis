export function expandClaim(claim, allClaimsMap, visited = new Set()) {
    if (visited.has(claim.claimNo)) return claim.text;
    visited.add(claim.claimNo);

    let baseText = claim.text;

    // Remove dependency boilerplate
    baseText = baseText.replace(
        /^the\s+(?:system|method|apparatus|device)\s+of\s+claim[s]?\s+[\d,\sandor\-to]+,?\s*/i,
        ''
    );

    if (claim.dependsOn && claim.dependsOn.length > 0) {
        const parentTexts = claim.dependsOn
            .sort((a, b) => a - b)
            .map(parentNo => {
                const parent = allClaimsMap.get(parentNo);
                if (!parent) return null;
                return expandClaim(parent, allClaimsMap, visited).replace(/\.$/, '');
            })
            .filter(Boolean);

        if (parentTexts.length > 0) {
            baseText = parentTexts.join('. ') + '. ' + baseText;
        }
    }

    return baseText.trim();
}
