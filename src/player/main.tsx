import { createRoot } from 'react-dom/client';
import { LivePlayer } from '@/features/screen/components/live-player';
import type { PlayerData } from '@/features/screens/player-page';
import { startLab } from './lab-panel';
import { TvCheck } from './tv-check';
import './player.css';

/*
 * The standalone TV player (ADR-005). scripts/build-player.mjs compiles this, with Preact standing in for
 * React, into public/player. It plays the same LivePlayer and ScreenStage as the owner app's previews.
 * The same bundle runs /tv-check (MT-12), so a TV that passes the check can run the player.
 */

const data = document.getElementById('screen-data');
const host = document.getElementById('screen');
const checkData = document.getElementById('tv-check-data');
const checkHost = document.getElementById('tv-check');
if (data?.textContent && host) {
  const { token, bundle, pairUrl } = JSON.parse(data.textContent) as PlayerData;
  createRoot(host).render(<LivePlayer token={token} initialBundle={bundle} pairUrl={pairUrl} />);
  const lab = new URLSearchParams(location.search).get('lab');
  if (lab !== null) startLab(lab === 'reset');
} else if (checkData?.textContent && checkHost) {
  const { pairUrl } = JSON.parse(checkData.textContent) as { pairUrl: string };
  // Replace the "too old" fallback inside the host with the check itself.
  checkHost.removeAttribute('class');
  checkHost.textContent = '';
  createRoot(checkHost).render(<TvCheck pairUrl={pairUrl} />);
}
