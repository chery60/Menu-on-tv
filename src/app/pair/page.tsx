import type { Metadata } from 'next';
import { PairScreen } from '@/features/screens/components/pair-screen';

export const metadata: Metadata = {
  title: 'Connect this TV',
  description: 'Show a pairing code on a restaurant TV and connect it to a MenuOnTV screen.',
  robots: { index: false, follow: false },
};

/** Open this short address on a TV: it shows a code to enter in the owner console. */
export default function PairPage() {
  return <PairScreen />;
}
