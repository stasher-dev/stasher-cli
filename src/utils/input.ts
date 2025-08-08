import { MAX_SECRET_LENGTH, STDIN_TIMEOUT } from './constants';

const MAX_STDIN_SIZE = MAX_SECRET_LENGTH;

/**
 * Read secret content from stdin as binary data (for enstash --stdin)
 * Returns Buffer to minimize string copies in memory
 */
export async function readFromStdin(signal?: AbortSignal): Promise<Buffer> {
  if (process.stdin.isTTY) {
    throw new Error('No stdin detected (TTY). Pipe data in or use command line arguments.');
  }

  // Immediate EOF detection - if stdin is already closed/ended
  if ((process.stdin as any).readableEnded) {
    throw new Error('No data received from stdin');
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let done = false;

    const onAbort = () => finish(new Error('Aborted by caller'));

    const finish = (err?: Error, out?: Buffer) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      process.off('SIGINT', onSigint);
      process.stdin.off('data', onData);
      process.stdin.off('end', onEnd);
      process.stdin.off('error', onErr);
      process.stdin.pause();
      // Zero intermediate chunks after we're done with them
      if (chunks.length) {
        for (const b of chunks) b.fill(0);
        chunks.length = 0;
      }
      if (err) reject(err);
      else resolve(out!);
    };

    // Check for abort signal
    if (signal) {
      if (signal.aborted) return reject(new Error('Aborted by caller'));
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const onSigint = () => finish(new Error('Interrupted by user (Ctrl+C)'));

    const onData = (chunk: Buffer) => {
      if (done) return;
      total += chunk.length;
      if (total > MAX_STDIN_SIZE) {
        return finish(new Error(`Stdin input exceeds maximum size (${MAX_STDIN_SIZE} bytes)`));
      }
      chunks.push(chunk);
      // Activity: extend the timeout
      resetTimer();
    };

    const onEnd = () => {
      if (done) return;
      if (!total) return finish(new Error('No data received from stdin'));
      // Single allocation for output
      const out = Buffer.concat(chunks, total);
      return finish(undefined, out);
    };

    const onErr = (e: Error) => finish(e);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(new Error('Timeout waiting for stdin input')), STDIN_TIMEOUT);
      // Don't keep process alive solely because of the timer - safer unref() call
      // @ts-ignore - not all typings expose unref
      if (typeof (timer as any).unref === 'function') (timer as any).unref();
    };

    // Declare timer variable and setup handlers
    let timer: NodeJS.Timeout;
    
    process.once('SIGINT', onSigint);
    process.stdin.on('data', onData);
    process.stdin.once('end', onEnd);
    process.stdin.once('error', onErr);
    process.stdin.resume();
    
    // Start the timer after all handlers are set up
    resetTimer();
  });
}