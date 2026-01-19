import axios from 'axios';

/**
 * Fetches content from a URL as a Buffer.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<Buffer>} - The content as a Buffer.
 */
export async function fetch(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch buffer from ${url}:`, error.message);
        throw error;
    }
}
