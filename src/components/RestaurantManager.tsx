import {
  ArrowRightLeft,
  Check,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { SEED_RESTAURANTS } from '../data/seedRestaurants.ts';
import { createRestaurantId } from '../lib/restaurantSchema.ts';
import { Restaurant, ZONES, ZONE_MAP, ZoneId } from '../types.ts';

interface RestaurantManagerProps {
  restaurants: Restaurant[];
  countsByZone: Record<ZoneId, number>;
  isAdmin: boolean;
  isSaving: boolean;
  onUnlockAdmin: (password: string) => Promise<boolean>;
  onLockAdmin: () => void;
  onSaveRestaurants: (next: Restaurant[]) => Promise<boolean>;
}

type ZoneTab = 'all' | ZoneId;

/** Browse, search, and (in admin mode) batch-manage campus restaurants. */
export function RestaurantManager({
  restaurants,
  countsByZone,
  isAdmin,
  isSaving,
  onUnlockAdmin,
  onLockAdmin,
  onSaveRestaurants,
}: RestaurantManagerProps) {
  const [activeTab, setActiveTab] = useState<ZoneTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin login prompt state
  const [showAuthBox, setShowAuthBox] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Quick-add state
  const [quickZone, setQuickZone] = useState<ZoneId>('michuhol');
  const [quickName, setQuickName] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Multi-select bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoveZone, setBulkMoveZone] = useState<ZoneId>('songhyuna');

  // Inline row edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editZone, setEditZone] = useState<ZoneId>('michuhol');

  // Sync quick-add zone when the user switches to a specific zone tab
  useEffect(() => {
    if (activeTab !== 'all') {
      setQuickZone(activeTab);
    }
  }, [activeTab]);

  // Prune stale selections whenever the restaurant list updates
  useEffect(() => {
    const validIds = new Set(restaurants.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [restaurants]);

  // Auto-dismiss transient feedback toast
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return restaurants.filter((item) => {
      if (activeTab !== 'all' && item.zone !== activeTab) return false;
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeTab, restaurants, searchQuery]);

  const allFilteredSelected =
    filteredRestaurants.length > 0 &&
    filteredRestaurants.every((item) => selectedIds.has(item.id));

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim() || isVerifying) return;

    setIsVerifying(true);
    setAuthError(null);
    try {
      const ok = await onUnlockAdmin(passwordInput);
      if (ok) {
        setShowAuthBox(false);
        setPasswordInput('');
        setFeedback({ type: 'ok', text: '관리자 모드가 활성화되었습니다.' });
        window.setTimeout(() => addInputRef.current?.focus(), 60);
      } else {
        setAuthError('비밀번호가 일치하지 않습니다.');
      }
    } catch {
      setAuthError('인증 확인 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = quickName.trim();
    if (!trimmed || isSaving) return;

    const duplicate = restaurants.some(
      (r) => r.zone === quickZone && r.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setFeedback({ type: 'err', text: `'${trimmed}'은(는) 이미 해당 구역에 있습니다.` });
      addInputRef.current?.select();
      return;
    }

    const created: Restaurant = {
      id: createRestaurantId(),
      name: trimmed,
      zone: quickZone,
    };

    const ok = await onSaveRestaurants([created, ...restaurants]);
    if (ok) {
      setQuickName('');
      setFeedback({
        type: 'ok',
        text: `'${trimmed}' (${ZONE_MAP[quickZone].shortLabel}) 추가됨`,
      });
      // Keep focus so user can add many restaurants back-to-back with Enter
      window.requestAnimationFrame(() => addInputRef.current?.focus());
    }
  };

  const handleDeleteOne = async (target: Restaurant) => {
    if (isSaving) return;
    const next = restaurants.filter((r) => r.id !== target.id);
    const ok = await onSaveRestaurants(next);
    if (ok) {
      setFeedback({ type: 'ok', text: `'${target.name}' 삭제됨` });
    }
  };

  const startEdit = (item: Restaurant) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditZone(item.zone);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async () => {
    if (!editingId || isSaving) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setFeedback({ type: 'err', text: '식당 이름을 입력해 주세요.' });
      return;
    }

    const next = restaurants.map((r) =>
      r.id === editingId ? { ...r, name: trimmed, zone: editZone } : r,
    );
    const ok = await onSaveRestaurants(next);
    if (ok) {
      setEditingId(null);
      setFeedback({ type: 'ok', text: '식당 정보가 수정되었습니다.' });
    }
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredRestaurants.forEach((r) => next.delete(r.id));
      } else {
        filteredRestaurants.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || isSaving) return;
    const count = selectedIds.size;
    if (count > 1 && !window.confirm(`선택한 식당 ${count}곳을 모두 삭제할까요?`)) {
      return;
    }
    const next = restaurants.filter((r) => !selectedIds.has(r.id));
    const ok = await onSaveRestaurants(next);
    if (ok) {
      setSelectedIds(new Set());
      setFeedback({ type: 'ok', text: `식당 ${count}곳이 삭제되었습니다.` });
    }
  };

  const handleBulkMoveZone = async () => {
    if (selectedIds.size === 0 || isSaving) return;
    const count = selectedIds.size;
    const next = restaurants.map((r) =>
      selectedIds.has(r.id) ? { ...r, zone: bulkMoveZone } : r,
    );
    const ok = await onSaveRestaurants(next);
    if (ok) {
      setSelectedIds(new Set());
      setFeedback({
        type: 'ok',
        text: `${count}곳을 '${ZONE_MAP[bulkMoveZone].shortLabel}'(으)로 이동했습니다.`,
      });
    }
  };

  const handleResetToSeed = async () => {
    if (isSaving) return;
    if (
      !window.confirm(
        `현재 목록을 초기 기본 리스트(${SEED_RESTAURANTS.length}곳)로 되돌릴까요? 직접 추가/수정한 내용은 초기화됩니다.`,
      )
    ) {
      return;
    }
    const ok = await onSaveRestaurants(SEED_RESTAURANTS);
    if (ok) {
      setSelectedIds(new Set());
      setEditingId(null);
      setFeedback({ type: 'ok', text: '초기 식당 목록으로 복원되었습니다.' });
    }
  };

  return (
    <section
      aria-label="전체 식당 목록 및 관리"
      className="flex flex-col rounded-2xl border border-black/[0.08] bg-white"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.07] px-5 py-4">
        <div className="flex items-baseline gap-2">
          <h2 className="break-keep text-base font-bold text-[#111827]">전체 식당 목록</h2>
          <span className="tabular-nums text-xs font-semibold text-[#6B7280]">
            총 {restaurants.length}곳
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleResetToSeed}
                title="코드에 내장된 초기 리스트로 복원"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-black/[0.08] bg-[#F9FAFB] px-2.5 py-1 text-xs font-medium text-[#4B5563] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>초기화</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onLockAdmin();
                  setSelectedIds(new Set());
                  setEditingId(null);
                }}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#111827] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#1F2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
              >
                <LockOpen className="h-3.5 w-3.5 text-[#12B76A]" aria-hidden="true" />
                <span>관리자 잠금</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowAuthBox((v) => !v);
                setAuthError(null);
              }}
              aria-expanded={showAuthBox}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-1 text-xs font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
            >
              <Lock className="h-3.5 w-3.5 text-[#6B7280]" aria-hidden="true" />
              <span>관리자 모드</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Password Login Box */}
      {!isAdmin && showAuthBox && (
        <form
          onSubmit={handleAuthSubmit}
          className="border-b border-black/[0.07] bg-[#F9FAFB] px-5 py-4"
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label htmlFor="admin-password-input" className="sr-only">
              관리자 비밀번호
            </label>
            <input
              id="admin-password-input"
              type="password"
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="관리자 비밀번호 입력"
              className="min-h-[42px] flex-1 rounded-xl border border-black/[0.12] bg-white px-3.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isVerifying || !passwordInput.trim()}
                className="min-h-[42px] flex-1 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1F2937] disabled:bg-[#D1D5DB] disabled:text-[#6B7280] sm:flex-initial"
              >
                {isVerifying ? '확인 중...' : '잠금 해제'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAuthBox(false);
                  setPasswordInput('');
                  setAuthError(null);
                }}
                className="min-h-[42px] rounded-xl border border-black/[0.1] bg-white px-3 text-sm font-medium text-[#4B5563] hover:bg-[#F3F4F6]"
              >
                취소
              </button>
            </div>
          </div>
          {authError ? (
            <p className="mt-2 text-xs font-medium text-[#D92D20]" role="alert">
              {authError}
            </p>
          ) : (
            <p className="mt-2 break-keep text-xs text-[#6B7280]">
              한 번 해제하면 이 브라우저에 로그인 상태가 유지됩니다. (환경변수 미설정 시 기본값: 1234)
            </p>
          )}
        </form>
      )}

      {/* Admin Quick Continuous Add Bar */}
      {isAdmin && (
        <form
          onSubmit={handleQuickAdd}
          className="border-b border-black/[0.07] bg-[#FEF3F2]/55 px-5 py-3.5"
        >
          <p className="mb-2 break-keep text-xs font-semibold text-[#B42318]">
            빠른 연속 추가 — 구역을 고르고 이름 입력 후 Enter를 누르세요
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="quick-zone-select" className="sr-only">
              추가할 구역
            </label>
            <select
              id="quick-zone-select"
              value={quickZone}
              disabled={isSaving}
              onChange={(e) => setQuickZone(e.target.value as ZoneId)}
              className="min-h-[44px] rounded-xl border border-black/[0.12] bg-white px-3 text-sm font-medium text-[#111827] focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
            >
              {ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>

            <div className="flex flex-1 gap-2">
              <label htmlFor="quick-name-input" className="sr-only">
                새 식당 이름
              </label>
              <input
                ref={addInputRef}
                id="quick-name-input"
                type="text"
                maxLength={80}
                value={quickName}
                disabled={isSaving}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="새 식당 이름 입력 후 Enter..."
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/[0.12] bg-white px-3.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
              />
              <button
                type="submit"
                disabled={isSaving || !quickName.trim()}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl bg-[#F04438] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#D92D20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04438] disabled:bg-[#D1D5DB] disabled:text-[#6B7280]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>추가</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`border-b px-5 py-2.5 text-xs font-medium ${
            feedback.type === 'ok'
              ? 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]'
              : 'border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Search + Zone Filter Tabs */}
      <div className="space-y-3 border-b border-black/[0.07] px-5 py-3.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
            aria-hidden="true"
          />
          <label htmlFor="restaurant-search" className="sr-only">
            식당 이름 검색
          </label>
          <input
            id="restaurant-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="식당 이름 검색..."
            className="min-h-[40px] w-full rounded-xl border border-black/[0.09] bg-[#F9FAFB] pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="tablist" aria-label="구역별 보기">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-[#111827] text-white'
                : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB] hover:text-[#111827]'
            }`}
          >
            <span>전체</span>
            <span className="tabular-nums opacity-80">{restaurants.length}</span>
          </button>

          {ZONES.map((zone) => {
            const active = activeTab === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(zone.id)}
                className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#111827] text-white'
                    : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB] hover:text-[#111827]'
                }`}
              >
                <span>{zone.shortLabel}</span>
                <span className="tabular-nums opacity-80">{countsByZone[zone.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin Bulk Action Bar */}
      {isAdmin && filteredRestaurants.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.07] bg-[#F9FAFB] px-5 py-2.5">
          <label className="inline-flex min-h-[34px] cursor-pointer select-none items-center gap-2 text-xs font-semibold text-[#374151]">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="h-4 w-4 rounded border-[#D1D5DB] text-[#111827] focus:ring-[#111827]"
            />
            <span>현재 목록 전체 선택</span>
          </label>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="tabular-nums mr-1 text-xs font-bold text-[#111827]">
                {selectedIds.size}개 선택
              </span>

              <select
                aria-label="일괄 이동할 구역"
                value={bulkMoveZone}
                disabled={isSaving}
                onChange={(e) => setBulkMoveZone(e.target.value as ZoneId)}
                className="min-h-[32px] rounded-lg border border-black/[0.12] bg-white px-2 text-xs font-medium text-[#111827]"
              >
                {ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.shortLabel}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleBulkMoveZone}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-black/[0.12] bg-white px-2.5 text-xs font-semibold text-[#111827] hover:bg-[#F3F4F6] disabled:opacity-50"
              >
                <ArrowRightLeft className="h-3 w-3" aria-hidden="true" />
                <span>구역 이동</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleBulkDelete}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-[#F04438] px-2.5 text-xs font-semibold text-white hover:bg-[#D92D20] disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                <span>선택 삭제</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Restaurant List */}
      <div className="max-h-[460px] divide-y divide-black/[0.06] overflow-y-auto">
        {filteredRestaurants.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="break-keep text-sm font-medium text-[#4B5563]">
              조건에 맞는 식당이 없습니다.
            </p>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold text-[#F04438] hover:underline"
              >
                검색어 지우기
              </button>
            )}
          </div>
        ) : (
          filteredRestaurants.map((item) => {
            const isEditing = isAdmin && editingId === item.id;
            const isChecked = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`flex min-h-[52px] items-center justify-between gap-2 px-5 py-2.5 transition-colors ${
                  isChecked ? 'bg-[#FEF3F2]/50' : 'hover:bg-[#F9FAFB]'
                }`}
              >
                {isEditing ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      maxLength={80}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      aria-label="식당 이름 수정"
                      className="min-h-[36px] min-w-[140px] flex-1 rounded-lg border border-black/[0.2] bg-white px-2.5 text-sm font-medium text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
                    />
                    <select
                      value={editZone}
                      onChange={(e) => setEditZone(e.target.value as ZoneId)}
                      aria-label="구역 수정"
                      className="min-h-[36px] rounded-lg border border-black/[0.15] bg-white px-2 text-xs font-medium text-[#111827]"
                    >
                      {ZONES.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.shortLabel}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={saveEdit}
                        aria-label="수정 저장"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-white hover:bg-[#1F2937]"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        aria-label="수정 취소"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.1] bg-white text-[#4B5563] hover:bg-[#F3F4F6]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {isAdmin && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          aria-label={`${item.name} 선택`}
                          className="h-4 w-4 shrink-0 rounded border-[#D1D5DB] text-[#111827] focus:ring-[#111827]"
                        />
                      )}
                      <span className="min-w-0 truncate break-keep text-sm font-medium text-[#111827]">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-md bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#4B5563]">
                        {ZONE_MAP[item.zone].shortLabel}
                      </span>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => startEdit(item)}
                            aria-label={`${item.name} 수정`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleDeleteOne(item)}
                            aria-label={`${item.name} 삭제`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#FEF3F2] hover:text-[#D92D20]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
