'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { adminInput } from './admin-ui';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return aa < bb;
}

function isAfterDay(a: Date, b: Date): boolean {
  return isBeforeDay(b, a);
}

function buildCalendarDays(viewMonth: Date): { date: Date; inMonth: boolean }[] {
  const first = startOfMonth(viewMonth);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return { date, inMonth: date.getMonth() === viewMonth.getMonth() };
  });
}

function formatDisplayDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type AdminDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
};

export function AdminDatePicker({
  value,
  onChange,
  id,
  className,
  placeholder = 'Select date',
  min,
  max,
  disabled,
  required,
  'aria-label': ariaLabel,
}: AdminDatePickerProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  const selected = parseIsoDate(value);
  const minDate = min ? parseIsoDate(min) : null;
  const maxDate = max ? parseIsoDate(max) : null;
  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected ?? today));

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setViewMonth(startOfMonth(selected ?? parseIsoDate(min ?? '') ?? now));
  }, [open, selected, min]);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.max(rect.width, 288);
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - panelWidth - 12);
    }
    setPanelStyle({ top: rect.bottom + 8, left, width: panelWidth });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const isDisabledDay = useCallback(
    (date: Date) => {
      if (minDate && isBeforeDay(date, minDate)) return true;
      if (maxDate && isAfterDay(date, maxDate)) return true;
      return false;
    },
    [minDate, maxDate]
  );

  const pickDay = (date: Date) => {
    if (isDisabledDay(date)) return;
    onChange(toIsoDate(date));
    setOpen(false);
  };

  const calendarDays = buildCalendarDays(viewMonth);
  const displayValue = formatDisplayDate(value);

  const panel =
    open && panelStyle && mounted ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="Choose date"
        className="fixed z-[200] rounded-xl border border-white/10 bg-[#161820] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
        style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            className="rounded-md border border-white/10 px-2 py-1 text-sm text-text-muted transition hover:border-white/25 hover:text-white"
            aria-label="Previous month"
            onClick={() =>
              setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <p className="text-sm font-bold text-white">
            {MONTH_LABELS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </p>
          <button
            type="button"
            className="rounded-md border border-white/10 px-2 py-1 text-sm text-text-muted transition hover:border-white/25 hover:text-white"
            aria-label="Next month"
            onClick={() =>
              setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <span
              key={label}
              className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, inMonth }) => {
            const iso = toIsoDate(date);
            const isSelected = selected ? sameDay(date, selected) : false;
            const isToday = sameDay(date, today);
            const dayDisabled = isDisabledDay(date);

            return (
              <button
                key={iso}
                type="button"
                disabled={dayDisabled}
                onClick={() => pickDay(date)}
                className={[
                  'flex h-9 items-center justify-center rounded-lg text-sm font-mono transition',
                  inMonth ? 'text-white' : 'text-text-muted/35',
                  isSelected
                    ? 'bg-brand-cyan font-bold text-[#0f0f0f] shadow-[0_0_16px_rgba(56,194,214,0.35)]'
                    : 'hover:bg-white/8',
                  isToday && !isSelected ? 'border border-brand-cyan/45' : 'border border-transparent',
                  dayDisabled ? 'cursor-not-allowed opacity-30 hover:bg-transparent' : '',
                ].join(' ')}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            className="text-xs font-semibold text-text-muted transition hover:text-brand-pink"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-brand-cyan transition hover:brightness-125"
            onClick={() => {
              if (isDisabledDay(today)) return;
              onChange(toIsoDate(today));
              setOpen(false);
            }}
          >
            Today
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={inputId}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${adminInput} flex w-full items-center justify-between gap-2 text-left ${className ?? ''} ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        }`}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
      >
        <span className={displayValue ? 'text-white' : 'text-text-muted/50'}>
          {displayValue || placeholder}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan font-mono" aria-hidden>
          ▾
        </span>
      </button>

      {required ? (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          aria-hidden
        />
      ) : null}

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
