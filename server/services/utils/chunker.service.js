/**
 * Chunks text into smaller pieces for semantic indexing.
 * @param {string} text - The raw text to chunk.
 * @param {number} maxWords - Maximum words per chunk.
 * @param {number} overlap - Number of overlapping words between chunks.
 * @returns {Array<string>} - The resulting chunks.
 */
export function chunkDescription(text, maxWords = 400, overlap = 50) {
    if (!text) return [];

    // Guard against misuse
    if (/^\s*\d+\./m.test(text)) {
        throw new Error('Claims must not be chunked');
    }

    // Split by sentences or paragraphs for more semantic chunking
    // Here we split by paragraphs first
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;

    for (const para of paragraphs) {
        const paraWords = para.split(/\s+/).filter(w => w.length > 0);

        if (currentWordCount + paraWords.length > maxWords && currentChunk.length > 0) {
            // Save current chunk
            chunks.push(currentChunk.join(' '));

            // Handle overlap: keep last N words
            const overlapWords = currentChunk.slice(-overlap);
            currentChunk = [...overlapWords];
            currentWordCount = currentChunk.length;
        }

        currentChunk.push(...paraWords);
        currentWordCount += paraWords.length;

        while (currentWordCount > maxWords) {
            chunks.push(currentChunk.slice(0, maxWords).join(' '));
            currentChunk = currentChunk.slice(maxWords - overlap);
            currentWordCount = currentChunk.length;
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    return chunks;
}
