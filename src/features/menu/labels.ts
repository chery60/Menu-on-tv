import type { Badge } from '@/features/screen/types';

/** Badge names as owners see them in the editor. The screen's own labels live in the screen parts. */
export const BADGE_LABELS: Readonly<Record<Badge, string>> = { bestseller: 'Bestseller', new: 'New', chef: 'Chef’s pick', spicy: 'Spicy', jain: 'Jain option' };
