import type { ReactNode } from 'react';
import type { OptionMeta, TagColor } from '../domain/types';

interface TagProps {
  readonly color: TagColor;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Tag({ color, children, className }: TagProps) {
  return <span className={`tag tag-${color} ${className ?? ''}`}>{children}</span>;
}

interface StatusDotProps {
  readonly color: TagColor;
}

export function StatusDot({ color }: StatusDotProps) {
  const dot = ['gray', 'purple', 'blue', 'orange', 'green'].includes(color) ? `dot-${color}` : 'dot-gray';
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${dot}`} />;
}

interface PropertySelectProps<T extends string> {
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly meta: Readonly<Record<T, OptionMeta>>;
  readonly onChange: (value: T) => void;
}

/**
 * Looks like a Notion property chip; behaves like a native select, so keyboard,
 * screen readers and mobile pickers all work without custom menus.
 */
export function PropertySelect<T extends string>({ label, value, options, meta, onChange }: PropertySelectProps<T>) {
  return (
    <span className="relative inline-flex rounded-md hover:bg-hover">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="peer absolute inset-0 w-full cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {meta[option].label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none rounded-md px-1 py-0.5 peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
        <Tag color={meta[value].color}>{meta[value].label}</Tag>
      </span>
    </span>
  );
}
