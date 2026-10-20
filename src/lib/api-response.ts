import type { z } from 'zod';

/** Consistent JSON envelope for every API route. */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly details?: readonly string[];
}

export function ok<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  return Response.json(body, { status });
}

export function fail(error: string, status: number, details?: readonly string[]): Response {
  const body: ApiResponse<never> = details?.length ? { success: false, error, details } : { success: false, error };
  return Response.json(body, { status });
}

/** Turns zod issues into short, field-named messages safe to show to a person. */
export function describeIssues(error: z.ZodError): readonly string[] {
  return error.issues.map((issue) => {
    const field = issue.path.join('.');
    return field ? `${field}: ${issue.message}` : issue.message;
  });
}

/** Reads a JSON body without throwing; returns undefined when the body is not valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
