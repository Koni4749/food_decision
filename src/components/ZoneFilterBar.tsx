import { Check, RotateCcw } from 'lucide-react';
import { ZONES, ZoneId } from '../types.ts';

interface ZoneFilterBarProps {
  selectedZones: Set<ZoneId>;
  countsByZone: Record<ZoneId, number>;
  onToggleZone: (zone: ZoneId) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  disabled?: boolean;
}

/** Multi-select zone toggle bar for filtering random draw candidates. */
export function ZoneFilterBar({
  selectedZones,
  countsByZone,
  onToggleZone,
  onSelectAll,
  onClearAll,
  disabled = false,
}: ZoneFilterBarProps) {
  const allSelected = selectedZones.size === ZONES.length;
  const totalSelectedCount = ZONES.reduce(
    (sum, zone) => sum + (selectedZones.has(zone.id) ? countsByZone[zone.id] : 0),
    0,
  );

  return (
    <section
      aria-label="구역 필터"
      className="rounded-2xl border border-black/[0.08] bg-white p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="break-keep text-sm font-semibold text-[#111827]">어디 쪽으로 갈까요?</h2>
          <span className="tabular-nums text-xs font-medium text-[#6B7280]">
            후보 {totalSelectedCount}곳
          </span>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={allSelected ? onClearAll : onSelectAll}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[#4B5563] transition-colors duration-150 hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] disabled:pointer-events-none disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {allSelected ? '선택 해제' : '전체 선택'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ZONES.map((zone) => {
          const active = selectedZones.has(zone.id);
          const count = countsByZone[zone.id] ?? 0;

          return (
            <button
              key={zone.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              title={zone.description}
              onClick={() => onToggleZone(zone.id)}
              className={`group inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04438] focus-visible:ring-offset-1 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
                active
                  ? 'border-[#111827] bg-[#111827] text-white'
                  : 'border-black/[0.09] bg-[#F9FAFB] text-[#4B5563] hover:border-black/20 hover:bg-white hover:text-[#111827]'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  active
                    ? 'border-[#F04438] bg-[#F04438] text-white'
                    : 'border-[#D1D5DB] bg-white text-transparent'
                }`}
                aria-hidden="true"
              >
                <Check className="h-3 w-3 stroke-[2.75]" />
              </span>

              <span className="break-keep leading-tight">{zone.label}</span>

              <span
                className={`tabular-nums rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                  active ? 'bg-white/15 text-white' : 'bg-black/[0.05] text-[#6B7280]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
