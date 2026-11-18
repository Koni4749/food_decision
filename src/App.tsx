import { Utensils } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RestaurantManager } from './components/RestaurantManager.tsx';
import { SlotMachine } from './components/SlotMachine.tsx';
import { ZoneFilterBar } from './components/ZoneFilterBar.tsx';
import { SEED_RESTAURANTS } from './data/seedRestaurants.ts';
import {
  ApiRequestError,
  fetchRestaurants,
  getStoredAdminPassword,
  saveRestaurants,
  setStoredAdminPassword,
  verifyAdminPassword,
} from './lib/api.ts';
import { Restaurant, ZONES, ZoneId } from './types.ts';

const ALL_ZONE_IDS: ZoneId[] = ZONES.map((z) => z.id);

export default function App() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(SEED_RESTAURANTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [selectedZones, setSelectedZones] = useState<Set<ZoneId>>(
    () => new Set(ALL_ZONE_IDS),
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [adminPassword, setAdminPassword] = useState<string | null>(() =>
    getStoredAdminPassword(),
  );

  // Load shared list on mount and revalidate any stored admin password
  useEffect(() => {
    let active = true;

    async function init() {
      setIsLoading(true);
      try {
        const payload = await fetchRestaurants();
        if (!active) return;
        setRestaurants(payload.restaurants);
        setGlobalError(null);
      } catch (err) {
        if (!active) return;
        setGlobalError(
          err instanceof Error ? err.message : '식당 목록을 불러오지 못했습니다.',
        );
      } finally {
        if (active) setIsLoading(false);
      }

      const storedPw = getStoredAdminPassword();
      if (storedPw) {
        try {
          const valid = await verifyAdminPassword(storedPw);
          if (active && !valid) {
            setStoredAdminPassword(null);
            setAdminPassword(null);
          }
        } catch {
          // Keep current session if offline/unavailable
        }
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, []);

  const countsByZone = useMemo<Record<ZoneId, number>>(() => {
    const counts: Record<ZoneId, number> = {
      michuhol: 0,
      songhyuna: 0,
      triple_abc_b: 0,
      triple_abc_g: 0,
      triple_d: 0,
    };
    for (const item of restaurants) {
      counts[item.zone] += 1;
    }
    return counts;
  }, [restaurants]);

  const filteredCandidates = useMemo(
    () => restaurants.filter((item) => selectedZones.has(item.zone)),
    [restaurants, selectedZones],
  );

  const handleToggleZone = useCallback((zone: ZoneId) => {
    setSelectedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) {
        next.delete(zone);
      } else {
        next.add(zone);
      }
      return next;
    });
  }, []);

  const handleSelectAllZones = useCallback(() => {
    setSelectedZones(new Set(ALL_ZONE_IDS));
  }, []);

  const handleClearZones = useCallback(() => {
    setSelectedZones(new Set());
  }, []);

  const handleUnlockAdmin = useCallback(async (password: string): Promise<boolean> => {
    const ok = await verifyAdminPassword(password);
    if (ok) {
      setStoredAdminPassword(password);
      setAdminPassword(password);
    }
    return ok;
  }, []);

  const handleLockAdmin = useCallback(() => {
    setStoredAdminPassword(null);
    setAdminPassword(null);
  }, []);

  const handleSaveRestaurants = useCallback(
    async (next: Restaurant[]): Promise<boolean> => {
      if (!adminPassword) return false;
      setIsSaving(true);
      setGlobalError(null);
      try {
        const result = await saveRestaurants(next, adminPassword);
        setRestaurants(result.restaurants);
        return true;
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) {
          setStoredAdminPassword(null);
          setAdminPassword(null);
          setGlobalError('관리자 비밀번호가 변경되었거나 올바르지 않아 잠금 처리되었습니다.');
        } else {
          setGlobalError(err instanceof Error ? err.message : '저장에 실패했습니다.');
        }
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [adminPassword],
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* Compact Header */}
      <header className="border-b border-black/[0.07] bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-3.5 sm:px-6">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white"
            aria-hidden="true"
          >
            <Utensils className="h-4 w-4 text-[#F04438]" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate break-keep text-base font-bold tracking-tight text-[#111827] sm:text-lg">
              미추홀캠 오늘 뭐 먹지?
            </h1>
            <p className="truncate break-keep text-xs text-[#6B7280]">
              인천대 미추홀캠퍼스 · 송현아 · 트리플스트리트
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        {globalError && (
          <div
            role="alert"
            className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-xs font-medium text-[#B42318]"
          >
            <span>{globalError}</span>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              className="shrink-0 font-semibold underline"
            >
              닫기
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
          {/* Left Column: Zone Filter + Slot Machine */}
          <div className="space-y-4 lg:col-span-7">
            <ZoneFilterBar
              selectedZones={selectedZones}
              countsByZone={countsByZone}
              onToggleZone={handleToggleZone}
              onSelectAll={handleSelectAllZones}
              onClearAll={handleClearZones}
              disabled={isLoading}
            />

            <SlotMachine
              candidates={filteredCandidates}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled((v) => !v)}
            />
          </div>

          {/* Right Column: Full List + Admin Mode */}
          <div className="lg:col-span-5">
            <RestaurantManager
              restaurants={restaurants}
              countsByZone={countsByZone}
              isAdmin={adminPassword !== null}
              isSaving={isSaving}
              onUnlockAdmin={handleUnlockAdmin}
              onLockAdmin={handleLockAdmin}
              onSaveRestaurants={handleSaveRestaurants}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
