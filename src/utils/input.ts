import { MAX_SECRET_LENGTH, STDIN_TIMEOUT } from './constants';

// Use the same size limit as secret validation
const MAX_STDIN_SIZE = MAX_SECRET_LENGTH;

/**
 * Read secret content from stdin (for enstash --stdin)
 */
export async function readFromStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        let done = false;
        process.stdin.setEncoding('utf8');
        process.stdin.resume(); // Ensure stdin starts flowing
        // Cleanup function to remove all listeners and prevent double-calls
        function cleanup() {
            if (done)
                return;
            done = true;
            clearTimeout(timeout);
            process.off('SIGINT', sigintHandler);
            process.stdin.off('data', dataHandler);
            process.stdin.off('end', endHandler);
            process.stdin.off('error', errorHandler);
        }
        // Handle Ctrl+C (SIGINT) gracefully
        const sigintHandler = () => {
            cleanup();
            reject(new Error('Interrupted by user (Ctrl+C)'));
        };
        process.on('SIGINT', sigintHandler);
        const dataHandler = (chunk: string) => {
            if (done) return;
            data += chunk;
            // Check if input exceeds maximum size
            if (data.length > MAX_STDIN_SIZE) {
                cleanup();
                reject(new Error(`Stdin input exceeds maximum size (${MAX_SECRET_LENGTH} bytes)`));
                return;
            }
        };
        process.stdin.on('data', dataHandler);
        // Set a timeout for stdin reading
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout waiting for stdin input'));
        }, STDIN_TIMEOUT); // stdin timeout
        const endHandler = () => {
            if (done)
                return;
            cleanup();
            const trimmed = data.trim();
            if (!trimmed) {
                reject(new Error('No data received from stdin'));
            }
            else {
                resolve(trimmed);
            }
        };
        process.stdin.once('end', endHandler);
        const errorHandler = (error: Error) => {
            if (done) return;
            cleanup();
            reject(error);
        };
        process.stdin.once('error', errorHandler);
    });
}
