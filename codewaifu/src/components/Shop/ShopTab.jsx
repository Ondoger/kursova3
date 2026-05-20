import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shopApi, ApiError } from "../../utils/api";
import { CreateShopItemModal } from "./CreateShopItemModal";
import { PurchasesModal } from "./PurchasesModal";

/*
 * Shop catalog inside a room. Two modes:
 *
 * - Teacher: grid of items + edit/archive actions, "+ Add item" button,
 *            "All purchases" button.
 * - Student: grid of items + buy button (disabled when stock=0 or coins
 *            insufficient), balance badge, "My purchases" button.
 *
 * Buying is one-tap (no confirmation modal). Re-clicks are debounced by
 * disabling the button while a request is in flight.
 */
const KIND_ICONS = {
  auto_pass: "🎓",
  retake: "🔁",
  extra_attempt: "➕",
  title: "🏷",
  cosmetic: "🎨",
  custom: "⭐",
};

export function ShopTab({ room, isStaff }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | item
  const [showPurchases, setShowPurchases] = useState(false);
  const [busy, setBusy] = useState(null); // id currently being bought

  const refresh = async () => {
    try {
      const data = await shopApi.listInRoom(room.id);
      setData(data);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось завантажити магазин");
    }
  };

  useEffect(() => {
    let cancelled = false;
    shopApi
      .listInRoom(room.id)
      .then((data) => {
        if (cancelled) return;
        setData(data);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Не вдалось завантажити магазин");
      });
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  const handleBuy = async (item) => {
    if (busy) return;
    setBusy(item.id);
    try {
      const r = await shopApi.buy(item.id);
      // Update local state immediately so the UI feels responsive.
      setData((d) => {
        if (!d) return d;
        return {
          ...d,
          items: d.items.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  myPurchaseCount: (i.myPurchaseCount ?? 0) + 1,
                  stock: r.item?.stock ?? i.stock,
                }
              : i,
          ),
          balance: r.balance ?? d.balance,
        };
      });
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Не вдалось купити";
      alert(msg);
      // Refresh from server in case of any inconsistency (e.g. refund).
      refresh();
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid md:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-md skeleton" />
        ))}
      </div>
    );
  }

  const visibleItems = isStaff
    ? data.items
    : data.items.filter((i) => !i.archived);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BalancePill coins={data.balance.coins} />
          <button
            onClick={() => setShowPurchases(true)}
            className="btn-gh"
          >
            {isStaff ? "Усі покупки" : "Мої покупки"}
          </button>
        </div>
        {isStaff && (
          <button
            onClick={() => setEditing("new")}
            className="btn-gh btn-gh-primary"
          >
            + Новий товар
          </button>
        )}
      </div>

      {/* Empty state */}
      {visibleItems.length === 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-8 text-center">
          <div className="text-[40px] mb-2 opacity-60">🛒</div>
          <h3 className="text-[16px] font-semibold text-gh-fg mb-1">
            Магазин порожній
          </h3>
          <p className="text-gh-muted text-[13px]">
            {isStaff
              ? "Створи перший товар — наприклад «Автомат на іспит за 1000 коїнів»."
              : "Викладач ще не додав нагород. Зачекай або накопичуй коїни."}
          </p>
        </div>
      )}

      {/* Catalog */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {visibleItems.map((item) => (
            <ShopCard
              key={item.id}
              item={item}
              balance={data.balance.coins}
              isStaff={isStaff}
              busy={busy === item.id}
              onBuy={() => handleBuy(item)}
              onEdit={() => setEditing(item)}
            />
          ))}
        </AnimatePresence>
      </div>

      <CreateShopItemModal
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        roomId={room.id}
        initial={editing && editing !== "new" ? editing : null}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />

      <PurchasesModal
        open={showPurchases}
        onClose={() => setShowPurchases(false)}
        roomId={room.id}
        isStaff={isStaff}
      />
    </div>
  );
}

function BalancePill({ coins }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#30363d] bg-[#161b22]">
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="#d29922"
        aria-hidden
      >
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm.75 4.75a.75.75 0 0 0-1.5 0v3.5c0 .414.336.75.75.75h3a.75.75 0 0 0 0-1.5h-2.25v-2.75Z" />
      </svg>
      <span className="text-mono font-semibold text-gh-fg">{coins}</span>
      <span className="text-[11px] text-gh-muted">коїнів</span>
    </div>
  );
}

function ShopCard({ item, balance, isStaff, busy, onBuy, onEdit }) {
  const outOfStock = !item.unlimited && item.stock <= 0;
  const cantAfford = !isStaff && balance < item.cost;
  const alreadyOwnedCosmetic =
    !isStaff &&
    ["title", "cosmetic"].includes(item.kind) &&
    item.myPurchaseCount > 0;
  const buyDisabled = busy || outOfStock || cantAfford || alreadyOwnedCosmetic;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-[#161b22] border rounded-md p-4 flex flex-col transition-colors ${
        item.archived
          ? "border-[#30363d] opacity-60"
          : "border-[#30363d] hover:border-[#8b949e]"
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-[24px] leading-none">
          {KIND_ICONS[item.kind] ?? "⭐"}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-gh-fg leading-tight">
            {item.title}
          </h3>
          <div className="text-[10px] uppercase tracking-wider text-gh-subtle mt-0.5">
            {item.kindLabel}
            {item.archived && " · архів"}
          </div>
        </div>
      </div>

      {item.description && (
        <p className="text-[13px] text-gh-muted leading-relaxed line-clamp-3 mb-3 flex-1">
          {item.description}
        </p>
      )}

      {(item.kind === "title" || item.kind === "cosmetic") && (
        <RewardPreview item={item} />
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-mono font-semibold text-gh-attention">
            {item.cost}
          </span>
          <span className="text-[11px] text-gh-muted">коїнів</span>
        </div>
        <div className="text-[11px] text-gh-subtle text-right">
          {item.unlimited ? (
            <span>необмежено</span>
          ) : (
            <span
              className={item.stock <= 0 ? "text-gh-danger" : ""}
            >
              {item.stock <= 0 ? "немає" : `залишилось ${item.stock}`}
            </span>
          )}
          {item.myPurchaseCount > 0 && (
            <div className="text-gh-success">
              ✓ куплено {item.myPurchaseCount}×
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {isStaff ? (
          <button onClick={onEdit} className="btn-gh w-full">
            Редагувати
          </button>
        ) : (
          <button
            onClick={onBuy}
            disabled={buyDisabled}
            className={`btn-gh w-full ${
              !buyDisabled ? "btn-gh-primary" : ""
            }`}
            title={
              cantAfford
                ? `Потрібно ще ${item.cost - balance} коїнів`
                : outOfStock
                  ? "Закінчилось"
                  : alreadyOwnedCosmetic
                    ? "Це оформлення вже є в інвентарі"
                  : ""
            }
          >
            {busy
              ? "Купуємо..."
              : outOfStock
                ? "Закінчилось"
                : alreadyOwnedCosmetic
                  ? "Вже в інвентарі"
                : cantAfford
                  ? `Не вистачає ${item.cost - balance}`
                  : "Купити"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function RewardPreview({ item }) {
  const payload = item.payload ?? {};
  const type = payload.cosmeticType ?? (item.kind === "title" ? "title" : "accent");
  if (type === "title") {
    return (
      <div className="mb-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border bg-[#0d1117]"
        style={{ color: payload.color ?? "#58a6ff", borderColor: `${payload.color ?? "#58a6ff"}66` }}
      >
        <span>{payload.emoji ?? "🏷"}</span>
        <span className="text-[12px] font-semibold">
          {payload.title ?? payload.label ?? item.title}
        </span>
      </div>
    );
  }
  if (type === "banner") {
    return (
      <div
        className="mb-3 h-12 rounded-md border border-[#30363d] overflow-hidden flex items-center justify-center text-[12px] text-white/80"
        style={{ backgroundImage: payload.bannerStyle }}
      >
        {payload.label ?? "Банер профілю"}
      </div>
    );
  }
  return (
    <div className="mb-3 flex items-center gap-2 text-[12px] text-gh-muted">
      <span
        className="w-6 h-6 rounded-full border border-[#30363d]"
        style={{ background: payload.color ?? payload.accentColor ?? payload.frameColor ?? "#58a6ff" }}
      />
      {type === "frame" ? "Рамка аватарки" : "Акцент профілю"}
    </div>
  );
}
