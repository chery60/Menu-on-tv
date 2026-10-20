import { describeIssues, fail, ok, readJson } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { getTrackerRepository } from '@/features/tracker/repository';
import { createItemSchema } from '@/features/tracker/schema';

export async function GET(): Promise<Response> {
  try {
    const items = await getTrackerRepository().list();
    return ok(items);
  } catch (error) {
    logger.error('tracker.list_failed', error);
    return fail('We couldn’t load the tracker. Check the data file and try again.', 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (body === undefined) return fail('Send the item as JSON.', 400);

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Check the item and try again.', 422, describeIssues(parsed.error));
  }

  try {
    const item = await getTrackerRepository().create(parsed.data, new Date());
    return ok(item, 201);
  } catch (error) {
    logger.error('tracker.create_failed', error);
    return fail('We couldn’t create the item. Try again.', 500);
  }
}
