import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';
import { hero } from '@/content/site-content';
import { SHARE_IMAGE } from '@/lib/page-metadata';

export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = 'image/png';

const PAPER = '#f2f0ea';
const INK = '#1d1c19';
const CHILLI = '#f24a14';

/** The share card: paper, the headline in ink, the name and one chilli square. Default font, no request data. */
export default function Image(): ImageResponse {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: PAPER, color: INK, padding: 80 }}>
        <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>{hero.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>{siteConfig.name}</div>
          <div style={{ display: 'flex', width: 40, height: 40, background: CHILLI }} />
        </div>
      </div>
    ),
    size,
  );
}
