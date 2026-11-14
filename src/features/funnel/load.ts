import 'server-only';
import { getAccountsRepository } from '@/features/accounts/repository';
import { getScreensRepository } from '@/features/screens/repository';
import { getFunnelRepository } from './repository';
import { funnelReport, type FunnelOptions, type FunnelReport } from './sums';

/** The funnel page's data: the three documents read together and worked out by funnelReport. */
export async function loadFunnelReport(options: FunnelOptions): Promise<FunnelReport> {
  const [funnel, accounts, screens] = await Promise.all([getFunnelRepository().read(), getAccountsRepository().read(), getScreensRepository().read()]);
  return funnelReport({ funnel, accounts, screens: screens.screens }, options);
}
