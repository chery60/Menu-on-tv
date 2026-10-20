import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { TrackerApp } from '@/features/tracker/components/tracker-app';
import type { TrackerItem } from '@/features/tracker/domain/types';
import { getTrackerRepository } from '@/features/tracker/repository';
import { logger } from '@/lib/logger';

export const metadata: Metadata = { title: 'Roadmap' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface TrackerPageProps {
  readonly searchParams: SearchParams;
}

function BoardSkeleton() {
  return (
    <div className="animate-pulse px-4 pt-10 sm:px-8" aria-label="Loading the roadmap">
      <div className="size-10 rounded-lg bg-hover" />
      <div className="mt-4 h-9 w-72 rounded-md bg-hover" />
      <div className="mt-8 flex gap-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-80 w-[286px] shrink-0 rounded-xl bg-sidebar" />
        ))}
      </div>
    </div>
  );
}

type LoadResult = { readonly items: readonly TrackerItem[] } | { readonly error: string };

async function loadItems(): Promise<LoadResult> {
  try {
    return { items: await getTrackerRepository().list() };
  } catch (error) {
    logger.error('tracker.page_load_failed', error);
    return { error: error instanceof Error ? error.message : 'Check the data file and try again.' };
  }
}

async function TrackerLoader({ searchParams }: TrackerPageProps) {
  await connection();
  const params = await searchParams;
  const view = params.view === 'table' ? 'table' : 'board';
  const selectedId = typeof params.item === 'string' ? params.item : null;
  const result = await loadItems();

  if ('error' in result) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">The tracker couldn’t load</h1>
        <p className="mt-3 text-ink-dim">{result.error}</p>
      </div>
    );
  }
  return <TrackerApp initialItems={result.items} initialView={view} initialSelectedId={selectedId} />;
}

export default function TrackerPage({ searchParams }: TrackerPageProps) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <TrackerLoader searchParams={searchParams} />
    </Suspense>
  );
}
