import confetti from 'canvas-confetti';
import { Dices, MapPin, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playReelTick, playWinChime, primeAudio } from '../lib/sound.ts';
import { Restaurant, ZONE_MAP } from '../types.ts';

interface SlotMachineProps {
  candidates: Restaurant[];
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const ITEM_HEIGHT = 72;
const REEL_TARGET_INDEX = 32;
const REEL_TOTAL_ITEMS = 34;
const SPIN_DURATION_MS = 2300;

/** Cryptographically unbiased random integer in [0, max). */
function secureRandomInt(max: number): number {
  if (max <= 1) return 0;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / max) * max;
    let value = 0;
    do {
      crypto.getRandomValues(array);
      value = array[0];
    } while (value >= limit);
    return value % max;
  }
  return Math.floor(Math.random() * max);
}

function pickRandomOther(
  pool: Restaurant[],
  excludeId?: string,
): Restaurant {
  if (pool.length === 1) return pool[0];
  const filtered = excludeId ? pool.filter((r) => r.id !== excludeId) : pool;
  const source = filtered.length > 0 ? filtered : pool;
  return source[secureRandomInt(source.length)];
}

function buildCenteredStrip(pool: Restaurant[], center: Restaurant): Restaurant[] {
  const above = pickRandomOther(pool, center.id);
  const below = pickRandomOther(pool, center.id);
  return [above, center, below];
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Tactile vertical-reel slot machine for picking one restaurant from filtered zones. */
export function SlotMachine({
  candidates,
  soundEnabled,
  onToggleSound,
}: SlotMachineProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [history, setHistory] = useState<Restaurant[]>([]);
  const [reelItems, setReelItems] = useState<Restaurant[]>([]);
  const [translateY, setTranslateY] = useState(0);

  const rafRef = useRef<number | null>(null);
  const lastCenteredRef = useRef<Restaurant | null>(null);
  const isSpinningRef = useRef(false);

  const candidatesSignature = useMemo(
    () => candidates.map((c) => `${c.id}:${c.name}:${c.zone}`).join('|'),
    [candidates],
  );

  // Sync the idle 3-row preview only when the candidate pool changes,
  // never when a spin ends (so the reel stays locked on the winning row).
  useEffect(() => {
    if (isSpinningRef.current) return;

    if (candidates.length === 0) {
      lastCenteredRef.current = null;
      setReelItems([]);
      setTranslateY(0);
      setWinner(null);
      return;
    }

    const matchedCenter = lastCenteredRef.current
      ? candidates.find((c) => c.id === lastCenteredRef.current?.id)
      : undefined;
    const center = matchedCenter ?? candidates[0];
    lastCenteredRef.current = center;

    setReelItems(buildCenteredStrip(candidates, center));
    setTranslateY(0);
    setWinner((prev) => (prev ? (candidates.find((c) => c.id === prev.id) ?? null) : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatesSignature]);

  useEffect(() => {
    return () => {
      isSpinningRef.current = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning || candidates.length === 0) return;

    if (soundEnabled) {
      primeAudio();
    }

    // Avoid immediate back-to-back repeats when 2+ candidates are available
    const chosenWinner = pickRandomOther(candidates, winner?.id);
    const reduced = prefersReducedMotion();

    if (reduced) {
      lastCenteredRef.current = chosenWinner;
      setReelItems(buildCenteredStrip(candidates, chosenWinner));
      setTranslateY(0);
      setWinner(chosenWinner);
      setHistory((prev) => [chosenWinner, ...prev].slice(0, 5));
      if (soundEnabled) playWinChime();
      return;
    }

    // Snapshot the currently visible 3 rows so the spin starts with zero jump
    const currentCenter =
      reelItems.length >= 3
        ? reelItems[Math.min(reelItems.length - 2, Math.max(1, Math.round(-translateY / ITEM_HEIGHT) + 1))]
        : (candidates[0]);
    const currentAbove =
      reelItems.length >= 3
        ? reelItems[Math.max(0, Math.round(-translateY / ITEM_HEIGHT))]
        : pickRandomOther(candidates, currentCenter.id);
    const currentBelow =
      reelItems.length >= 3
        ? reelItems[Math.min(reelItems.length - 1, Math.round(-translateY / ITEM_HEIGHT) + 2)]
        : pickRandomOther(candidates, currentCenter.id);

    const nextStrip: Restaurant[] = [currentAbove, currentCenter, currentBelow];
    for (let i = 3; i < REEL_TOTAL_ITEMS; i++) {
      if (i === REEL_TARGET_INDEX) {
        nextStrip.push(chosenWinner);
      } else {
        const prevItem = nextStrip[i - 1];
        const nextCandidate = pickRandomOther(candidates, prevItem?.id);
        // Also avoid matching chosenWinner right before it if possible
        if (
          i === REEL_TARGET_INDEX - 1 &&
          candidates.length > 2 &&
          nextCandidate.id === chosenWinner.id
        ) {
          nextStrip.push(pickRandomOther(candidates, chosenWinner.id));
        } else {
          nextStrip.push(nextCandidate);
        }
      }
    }

    isSpinningRef.current = true;
    setReelItems(nextStrip);
    setTranslateY(0);
    setIsSpinning(true);

    const finalTranslateY = -((REEL_TARGET_INDEX - 1) * ITEM_HEIGHT);
    const startTime = performance.now();
    let lastTickStep = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / SPIN_DURATION_MS);
      // Quartic ease-out for crisp physical deceleration into the slot detent
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentY = finalTranslateY * eased;

      setTranslateY(currentY);

      const currentStep = Math.floor(-currentY / ITEM_HEIGHT);
      if (currentStep > lastTickStep) {
        lastTickStep = currentStep;
        if (soundEnabled) {
          playReelTick(progress);
        }
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setTranslateY(finalTranslateY);
        lastCenteredRef.current = chosenWinner;
        isSpinningRef.current = false;
        setIsSpinning(false);
        setWinner(chosenWinner);
        setHistory((prev) => [chosenWinner, ...prev].slice(0, 5));

        if (soundEnabled) {
          playWinChime();
        }

        confetti({
          particleCount: 42,
          spread: 58,
          origin: { y: 0.56 },
          colors: ['#F04438', '#111827', '#F79009', '#12B76A'],
          disableForReducedMotion: true,
        });
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [candidates, isSpinning, reelItems, soundEnabled, translateY, winner?.id]);

  const hasCandidates = candidates.length > 0;
  const activeDisplayWinner = !isSpinning ? winner : null;

  return (
    <section
      aria-label="랜덤 슬롯머신"
      className="rounded-2xl border border-black/[0.08] bg-white p-5 sm:p-6"
    >
      {/* Top Bar */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isSpinning
                ? 'animate-pulse bg-[#F04438]'
                : hasCandidates
                  ? 'bg-[#12B76A]'
                  : 'bg-[#9CA3AF]'
            }`}
            aria-hidden="true"
          />
          <span className="break-keep text-xs font-semibold text-[#4B5563]">
            {isSpinning
              ? '슬롯 돌아가는 중...'
              : hasCandidates
                ? `추첨 가능 식당 ${candidates.length}곳`
                : '추첨할 구역을 선택해 주세요'}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-2.5 py-1 text-xs font-medium text-[#4B5563] transition-colors duration-150 hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="h-3.5 w-3.5 text-[#111827]" aria-hidden="true" />
              <span>소리 켜짐</span>
            </>
          ) : (
            <>
              <VolumeX className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden="true" />
              <span>음소거</span>
            </>
          )}
        </button>
      </div>

      {/* Slot Machine Viewport */}
      <div className="relative overflow-hidden rounded-2xl border border-black/[0.1] bg-[#F9FAFB]">
        {hasCandidates ? (
          <div className="relative h-[216px] select-none overflow-hidden">
            {/* Center Selection Highlight Band */}
            <div
              className={`pointer-events-none absolute inset-x-0 top-[72px] z-10 h-[72px] border-y transition-colors duration-200 ${
                activeDisplayWinner
                  ? 'border-[#F04438]/40 bg-[#FEF3F2]/55'
                  : 'border-black/[0.09] bg-white/85'
              }`}
              aria-hidden="true"
            />

            {/* Left & Right Mechanical Marker Pointers */}
            <div
              className="pointer-events-none absolute left-2 top-[102px] z-20 h-3 w-1.5 rounded-full bg-[#F04438]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute right-2 top-[102px] z-20 h-3 w-1.5 rounded-full bg-[#F04438]"
              aria-hidden="true"
            />

            {/* Reel Strip */}
            <div
              className="relative z-10 will-change-transform"
              style={{ transform: `translate3d(0, ${translateY}px, 0)` }}
            >
              {reelItems.map((item, idx) => {
                const isWinningRow =
                  activeDisplayWinner !== null &&
                  ((reelItems.length === 3 && idx === 1) ||
                    (reelItems.length > 3 && idx === REEL_TARGET_INDEX)) &&
                  item.id === activeDisplayWinner.id;

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex h-[72px] items-center justify-between gap-3 px-6 sm:px-7"
                  >
                    <span
                      className={`min-w-0 truncate break-keep text-lg transition-colors sm:text-xl ${
                        isWinningRow
                          ? 'font-bold text-[#111827]'
                          : isSpinning
                            ? 'font-semibold text-[#1F2937]'
                            : 'font-semibold text-[#374151]'
                      }`}
                    >
                      {item.name}
                    </span>

                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        isWinningRow
                          ? 'bg-[#F04438] text-white'
                          : 'bg-black/[0.06] text-[#4B5563]'
                      }`}
                    >
                      {ZONE_MAP[item.zone].shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Top & Bottom Depth Fade Masks */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[66px] bg-gradient-to-b from-[#F9FAFB] via-[#F9FAFB]/85 to-transparent"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[66px] bg-gradient-to-t from-[#F9FAFB] via-[#F9FAFB]/85 to-transparent"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="flex h-[216px] flex-col items-center justify-center px-6 text-center">
            <p className="break-keep text-sm font-medium text-[#4B5563]">
              선택된 구역에 등록된 식당이 없습니다.
            </p>
            <p className="mt-1 break-keep text-xs text-[#6B7280]">
              위에서 구역을 하나 이상 선택하거나 관리자 모드에서 식당을 추가해 주세요.
            </p>
          </div>
        )}
      </div>

      {/* Winner Result Summary Card */}
      {activeDisplayWinner && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#D92D20]">오늘의 당첨 식당</p>
            <p className="mt-0.5 truncate break-keep text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">
              {activeDisplayWinner.name}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#FECDCA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B42318]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {ZONE_MAP[activeDisplayWinner.zone].label}
          </span>
        </div>
      )}

      {/* Primary CTA Button */}
      <div className="mt-4">
        <button
          type="button"
          disabled={!hasCandidates || isSpinning}
          onClick={handleSpin}
          className={`flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-bold text-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04438] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#D1D5DB] disabled:text-[#6B7280] ${
            winner && !isSpinning
              ? 'bg-[#F04438] hover:bg-[#D92D20]'
              : 'bg-[#111827] hover:bg-[#1F2937]'
          }`}
        >
          {isSpinning ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span>뽑는 중...</span>
            </>
          ) : winner ? (
            <>
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              <span>안 땡기면 다시 돌리기</span>
            </>
          ) : (
            <>
              <Dices className="h-5 w-5" aria-hidden="true" />
              <span>오늘의 밥집 뽑기</span>
            </>
          )}
        </button>
      </div>

      {/* Recent Picks History */}
      {history.length > 0 && (
        <div className="mt-4 border-t border-black/[0.06] pt-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-[#6B7280]">방금 나온 곳:</span>
            {history.map((item, idx) => (
              <span
                key={`${item.id}-${idx}`}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${
                  idx === 0
                    ? 'bg-[#FEF3F2] font-semibold text-[#B42318]'
                    : 'bg-[#F3F4F6] font-medium text-[#4B5563]'
                }`}
              >
                <span className="tabular-nums opacity-60">{idx + 1}.</span>
                <span className="max-w-[130px] truncate">{item.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
