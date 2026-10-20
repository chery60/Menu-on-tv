import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Serverless hosts (Vercel, Netlify on AWS Lambda) only let the app write to the temp dir. */
const onServerlessHost = (): boolean => Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Where a JSON data file (or the photo folder) lives when there is no database or blob store.
 * - An explicit override (env var) always wins.
 * - On a serverless host the deployment filesystem is read-only except the temp dir, so files go there.
 *   They are per-instance and temporary; on Netlify, Netlify Database and Blobs keep the real data.
 * - Locally, files live in ./data.
 */
export function dataFilePath(fileName: string, override: string | undefined, serverless: boolean = onServerlessHost()): string {
  if (override) return override;
  if (serverless) return join(tmpdir(), fileName);
  return join(process.cwd(), 'data', fileName);
}
