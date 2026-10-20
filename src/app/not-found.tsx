import Link from 'next/link';
import { notFoundPage } from '@/content/site-content';

/** A link that leads nowhere: the TV shows colour bars, and the way back to the menu. */
export default function NotFound() {
  return (
    <main className="off-air">
      <div className="off-air-set" aria-hidden="true">
        <div className="off-air-screen">
          <span className="off-air-roll" />
          <p className="off-air-code">404</p>
        </div>
      </div>
      <h1 className="off-air-title">{notFoundPage.title}</h1>
      <p className="off-air-body">{notFoundPage.body}</p>
      <Link href="/" className="off-air-home">
        {notFoundPage.home}
      </Link>
    </main>
  );
}
