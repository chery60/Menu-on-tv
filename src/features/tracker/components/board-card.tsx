import { CheckSquare } from 'lucide-react';
import { checklistProgress, iceScore } from '../domain/board';
import {
  AREA_META,
  EFFORT_META,
  PHASE_META,
  PRIORITY_META,
  STATUS_META,
  type GroupBy,
  type TrackerItem,
} from '../domain/types';
import { Tag } from './tag';

interface BoardCardBodyProps {
  readonly item: TrackerItem;
  readonly groupBy: GroupBy;
}

/** Card content shared by the board and the drag overlay. */
export function BoardCardBody({ item, groupBy }: BoardCardBodyProps) {
  const checklist = checklistProgress(item);
  return (
    <>
      <span className="flex items-start gap-2">
        <span aria-hidden="true" className="mt-px text-base leading-5">
          {item.icon}
        </span>
        <span className="line-clamp-3 font-medium leading-5 text-ink">{item.title}</span>
      </span>
      {item.summary ? <span className="mt-1.5 line-clamp-2 block text-[13px] leading-[1.45] text-ink-dim">{item.summary}</span> : null}
      <span className="mt-2.5 flex flex-wrap gap-1">
        {groupBy !== 'status' ? <Tag color={STATUS_META[item.status].color}>{STATUS_META[item.status].label}</Tag> : null}
        {groupBy !== 'priority' ? <Tag color={PRIORITY_META[item.priority].color}>{PRIORITY_META[item.priority].label}</Tag> : null}
        {groupBy !== 'area' ? <Tag color={AREA_META[item.area].color}>{AREA_META[item.area].label}</Tag> : null}
        {groupBy !== 'phase' ? (
          <Tag color={PHASE_META[item.phase].color}>
            {PHASE_META[item.phase].short} {PHASE_META[item.phase].label}
          </Tag>
        ) : null}
      </span>
      <span className="mt-2.5 flex items-center gap-3 text-xs text-ink-faint tabular">
        <span>{item.key}</span>
        <span title="Effort">{EFFORT_META[item.effort].label}</span>
        <span title="Impact × confidence ÷ effort">ICE {iceScore(item).toFixed(1)}</span>
        {checklist.total > 0 ? (
          <span className="inline-flex items-center gap-1" title="Done when">
            <CheckSquare className="size-3" aria-hidden="true" />
            {checklist.done}/{checklist.total}
          </span>
        ) : null}
        {item.owner ? (
          <span className="ml-auto grid size-5 place-items-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary" title={item.owner}>
            {item.owner.slice(0, 1).toUpperCase()}
          </span>
        ) : null}
      </span>
    </>
  );
}
