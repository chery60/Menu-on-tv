import { describeIssues, fail, ok, readJson } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { getTrackerRepository } from '@/features/tracker/repository';
import { updateItemSchema } from '@/features/tracker/schema';

interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

const NOT_FOUND = 'This item doesn’t exist. It may have been removed.';

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  try {
    const item = await getTrackerRepository().get(id);
    return item ? ok(item) : fail(NOT_FOUND, 404);
  } catch (error) {
    logger.error('tracker.get_failed', error);
    return fail('We couldn’t load this item. Try again.', 500);
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  const body = await readJson(request);
  if (body === undefined) return fail('Send the changes as JSON.', 400);

  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Check the changes and try again.', 422, describeIssues(parsed.error));
  }

  try {
    const item = await getTrackerRepository().update(id, parsed.data, new Date());
    return item ? ok(item) : fail(NOT_FOUND, 404);
  } catch (error) {
    logger.error('tracker.update_failed', error);
    return fail('We couldn’t save your changes. Try again.', 500);
  }
}

/** Moves the item to the trash (archived). Nothing is permanently deleted. */
export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  try {
    const item = await getTrackerRepository().archive(id, new Date());
    return item ? ok(item) : fail(NOT_FOUND, 404);
  } catch (error) {
    logger.error('tracker.archive_failed', error);
    return fail('We couldn’t move this item to the trash. Try again.', 500);
  }
}
