import { checklistProgress, iceScore, type Group } from '../domain/board';
import { AREA_META, EFFORT_META, PHASE_META, PRIORITY_META, STATUS_META } from '../domain/types';
import { StatusDot, Tag } from './tag';

interface TableViewProps {
  readonly groups: readonly Group[];
  readonly selectedId: string | null;
  readonly onOpen: (id: string) => void;
}

/** Local time for the reader; the server's zone can differ, so date cells allow a hydration text difference. */
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

const HEADERS = ['Name', 'Status', 'Priority', 'Phase', 'Area', 'Effort', 'ICE', 'Done when', 'Updated'] as const;

/** Notion-style database table, grouped the same way as the board. */
export function TableView({ groups, selectedId, onOpen }: TableViewProps) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  if (visibleGroups.length === 0) {
    return <p className="py-16 text-center text-sm text-ink-dim">No items match these choices. Change your filters.</p>;
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-8 sm:-mx-8 sm:px-8">
      <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-rule text-xs text-ink-faint">
            {HEADERS.map((header) => (
              <th key={header} scope="col" className="px-2 py-2 font-normal first:pl-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        {visibleGroups.map((group) => (
          <tbody key={group.key}>
            <tr>
              <th colSpan={HEADERS.length} scope="colgroup" className="pt-6 pb-2 text-left">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                  <StatusDot color={group.meta.color} />
                  {group.meta.short ? `${group.meta.short} ` : ''}
                  {group.meta.label}
                  <span className="font-normal text-ink-faint tabular">{group.items.length}</span>
                </span>
              </th>
            </tr>
            {group.items.map((item) => {
              const checklist = checklistProgress(item);
              return (
                <tr
                  key={item.id}
                  onClick={() => onOpen(item.id)}
                  className={`cursor-pointer border-b border-rule hover:bg-hover ${item.id === selectedId ? 'bg-primary-soft' : ''}`}
                >
                  <td className="max-w-[340px] py-2 pr-2">
                    <button type="button" onClick={() => onOpen(item.id)} className="flex w-full items-center gap-2 text-left">
                      <span aria-hidden="true">{item.icon}</span>
                      <span className="truncate font-medium text-ink">{item.title}</span>
                      <span className="shrink-0 text-xs text-ink-faint tabular">{item.key}</span>
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <Tag color={STATUS_META[item.status].color}>{STATUS_META[item.status].label}</Tag>
                  </td>
                  <td className="px-2 py-2">
                    <Tag color={PRIORITY_META[item.priority].color}>{PRIORITY_META[item.priority].label}</Tag>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-ink-dim">
                    {PHASE_META[item.phase].short} {PHASE_META[item.phase].label}
                  </td>
                  <td className="px-2 py-2">
                    <Tag color={AREA_META[item.area].color}>{AREA_META[item.area].label}</Tag>
                  </td>
                  <td className="px-2 py-2 text-ink-dim">{EFFORT_META[item.effort].label}</td>
                  <td className="px-2 py-2 text-ink-dim tabular">{iceScore(item).toFixed(1)}</td>
                  <td className="px-2 py-2 text-ink-dim tabular">{checklist.total ? `${checklist.done}/${checklist.total}` : '—'}</td>
                  <td className="px-2 py-2 whitespace-nowrap text-ink-faint tabular" suppressHydrationWarning>
                    {dateFormat.format(new Date(item.updatedAt))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
