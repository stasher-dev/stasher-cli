import { readFileSync } from 'fs';
import { DEFAULT_API_BASE_URL } from './constants';

export interface Config {
  apiBaseUrl: string;
}

export function loadEnvConfig(): Config {
    let apiBaseUrl = DEFAULT_API_BASE_URL;
    
    // Check environment variable first
    if (process.env.STASHED_API) {
        apiBaseUrl = process.env.STASHED_API;
    }
    else {
        // Try to load from .env file
        try {
            const envContent = readFileSync('.env', 'utf8');
            const envLines = envContent.split('\n');
            for (const line of envLines) {
                const clean = line.trim();
                if (!clean || clean.startsWith('#')) continue;
                
                const match = clean.match(/^STASHED_API\s*=\s*(.+)$/);
                if (match) {
                    apiBaseUrl = match[1].trim().replace(/["']/g, ''); // Remove quotes and trim
                    break;
                }
            }
        }
        catch {
            // .env file doesn't exist or can't be read, use default
        }
    }
    
    return { apiBaseUrl };
}
