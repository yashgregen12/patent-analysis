export function extractDependencies(claimText) {
  if (!claimText) return [];

  const deps = new Set();

  const regex = /claim[s]?\s+((?:\d+\s*(?:-|–|—|to)?\s*\d*|\d+)(?:\s*(?:,|and|or)\s*(?:\d+\s*(?:-|–|—|to)?\s*\d*|\d+))*)/gi;

  let match;
  while ((match = regex.exec(claimText)) !== null) {
    const part = match[1];

    // ranges
    const rangeRegex = /(\d+)\s*(?:-|–|—|to)\s*(\d+)/gi;
    let r;
    while ((r = rangeRegex.exec(part)) !== null) {
      const start = parseInt(r[1], 10);
      const end = parseInt(r[2], 10);
      for (let i = start; i <= end; i++) deps.add(i);
    }

    // single numbers
    const nums = part.match(/\b\d+\b/g);
    if (nums) {
      nums.forEach(n => deps.add(parseInt(n, 10)));
    }
  }

  return Array.from(deps).sort((a, b) => a - b);
}
