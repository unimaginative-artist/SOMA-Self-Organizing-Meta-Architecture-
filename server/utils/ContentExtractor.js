
import fs from 'fs/promises';
import path from 'path';
// Removed broken import - pdf-parse is loaded via require() below
import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Wrapper for PDF Parse if default import fails
const parsePDF = async (buffer) => {
    // pdf-parse is CJS, in ESM we might need to use require
    const parser = require('pdf-parse');
    return parser(buffer);
};

export class ContentExtractor {
    constructor() {
        this.supportedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.json', '.js', '.ts', '.py'];
    }

    async extract(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        
        try {
            if (ext === '.pdf') {
                const dataBuffer = await fs.readFile(filePath);
                const data = await parsePDF(dataBuffer);
                return data.text;
            } 
            else if (ext === '.docx' || ext === '.doc') {
                const dataBuffer = await fs.readFile(filePath);
                const result = await mammoth.extractRawText({ buffer: dataBuffer });
                return result.value;
            }
            else {
                // Default text read
                return await fs.readFile(filePath, 'utf8');
            }
        } catch (error) {
            console.error(`[ContentExtractor] Failed to extract ${filePath}:`, error.message);
            return null; // Return null on failure so indexer can skip or log
        }
    }
}
