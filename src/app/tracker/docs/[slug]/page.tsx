import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Markdown } from '@/features/tracker/components/markdown';
import { TRACKER_DOCS } from '@/features/tracker/docs/links';
import { readTrackerDoc } from '@/features/tracker/docs/registry';

type Params = Promise<{ slug: string }>;

interface DocPageProps {
  readonly params: Params;
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = TRACKER_DOCS.find((entry) => entry.slug === slug);
  return { title: doc?.title ?? 'Document' };
}

function DocSkeleton() {
  return (
    <div className="mx-auto max-w-[860px] animate-pulse px-4 py-10 sm:px-8" aria-label="Loading the document">
      <div className="size-10 rounded-lg bg-hover" />
      <div className="mt-4 h-9 w-2/3 rounded-md bg-hover" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-4 rounded bg-hover" style={{ width: `${90 - index * 6}%` }} />
        ))}
      </div>
    </div>
  );
}

async function DocContent({ params }: DocPageProps) {
  const { slug } = await params;
  const result = await readTrackerDoc(slug);
  if (!result) notFound();

  return (
    <article className="mx-auto max-w-[860px] px-4 py-10 sm:px-8">
      <div aria-hidden="true" className="text-[2.6rem] leading-none">
        {result.doc.icon}
      </div>
      <p className="mt-3 text-xs text-ink-faint">Source file: {result.doc.file}</p>
      <Markdown source={result.markdown} className="mt-6" />
    </article>
  );
}

export default function DocPage({ params }: DocPageProps) {
  return (
    <Suspense fallback={<DocSkeleton />}>
      <DocContent params={params} />
    </Suspense>
  );
}
