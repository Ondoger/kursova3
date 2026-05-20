import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { cosmeticsApi, profileApi } from "../utils/api";
import { useStore } from "../store/useStore";

const DEFAULT_BANNER = "linear-gradient(135deg,#1f6feb 0%,#161b22 55%,#0d1117 100%)";
const DEFAULT_ACCENT = "#58a6ff";

export function ProfilePage() {
  const { id } = useParams();
  if (id) return <PublicProfilePage userId={id} />;
  return <MyProfilePage />;
}

function MyProfilePage() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(null);
  const updateAuthUser = useStore((s) => s.updateAuthUser);

  useEffect(() => {
    let cancelled = false;
    profileApi.me().then((next) => {
      if (cancelled) return;
      setData(next);
      setDraft({
        status: next.profile.status ?? "",
        bio: next.profile.bio ?? "",
        favoriteStack: next.profile.favoriteStack ?? "",
      });
      setError(null);
    }).catch((e) => {
      if (!cancelled) setError(e?.message ?? "Не вдалось завантажити профіль");
    });
    return () => { cancelled = true; };
  }, []);

  const equipped = useMemo(() => {
    if (!data) return {};
    const byId = new Map(data.inventory.map((item) => [item.id, item]));
    return {
      title: byId.get(data.profile.activeTitleId),
      banner: byId.get(data.profile.activeBannerId),
      frame: byId.get(data.profile.activeFrameId),
      accent: byId.get(data.profile.activeAccentId),
    };
  }, [data]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const next = await profileApi.update({ profile: draft });
      setData(next);
      updateAuthUser(next.user);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось зберегти профіль");
    } finally {
      setSaving(false);
    }
  };

  const buyCosmetic = async (cosmeticId) => {
    setBuying(cosmeticId);
    try {
      await cosmeticsApi.buy(cosmeticId);
      const next = await profileApi.me();
      setData(next);
      updateAuthUser(next.user);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось купити косметику");
    } finally {
      setBuying(null);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (file.size > 520_000) {
      setError("Фото завелике. Обери або стисни файл до ~500KB.");
      return;
    }
    const avatarDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Не вдалось прочитати файл"));
      reader.readAsDataURL(file);
    });
    setSaving(true);
    try {
      const next = await profileApi.update({ avatarDataUrl });
      setData(next);
      updateAuthUser(next.user);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось оновити аватар");
    } finally {
      setSaving(false);
    }
  };

  const equip = async (type, purchaseId) => {
    setSaving(true);
    try {
      const next = await profileApi.update({ active: { [type]: purchaseId } });
      setData(next);
      updateAuthUser(next.user);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось активувати нагороду");
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) return <Page><ErrorBox>{error}</ErrorBox></Page>;
  if (!data || !draft) return <Page><div className="h-56 rounded-md skeleton" /><div className="h-80 rounded-md skeleton" /></Page>;

  const { user, inventory, profile } = data;
  const titlePayload = equipped.title?.payload ?? null;
  const banner = equipped.banner?.payload?.bannerStyle ?? DEFAULT_BANNER;
  const accent = equipped.accent?.payload?.accentColor ?? equipped.accent?.payload?.color ?? titlePayload?.color ?? DEFAULT_ACCENT;
  const frameColor = equipped.frame?.payload?.frameColor ?? equipped.frame?.payload?.color ?? accent;

  return (
    <Page>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold text-gh-fg">Мій профіль</h1>
          <p className="text-[14px] text-gh-muted mt-1 max-w-3xl">Купуй титули, банери, рамки й кольори в глобальному магазині — тут вони стають оформленням твого профілю.</p>
        </div>
        <MiniStat label="загальні coins" value={user.totals?.coins ?? 0} />
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      <ProfilePreview user={user} draft={draft} title={titlePayload} banner={banner} accent={accent} frameColor={frameColor} onAvatar={uploadAvatar} saving={saving} />

      <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-4">
        <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
          <h2 className="text-[16px] font-semibold text-gh-fg mb-4">Текст профілю</h2>
          <div className="space-y-3">
            <Field label="Статус" hint={`${draft.status.length}/80`}>
              <input value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} maxLength={80} className="input-gh" placeholder="Пишу код і збираю XP" />
            </Field>
            <Field label="Про себе" hint={`${draft.bio.length}/220`}>
              <textarea value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} maxLength={220} rows={4} className="input-gh resize-y min-h-[100px]" placeholder="Коротко про себе, цілі в курсі, улюблений напрям..." />
            </Field>
            <Field label="Стек" hint={`${draft.favoriteStack.length}/90`}>
              <input value={draft.favoriteStack} onChange={(e) => setDraft({ ...draft, favoriteStack: e.target.value })} maxLength={90} className="input-gh" placeholder="React · Node.js · MongoDB" />
            </Field>
            <button type="button" onClick={saveProfile} disabled={saving} className="btn-gh btn-gh-primary">{saving ? "Зберігаємо..." : "Зберегти текст"}</button>
          </div>
        </section>

        <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-gh-fg">Глобальний магазин косметики</h2>
              <p className="text-[12px] text-gh-muted mt-1">Готові пресети доступні всім, без кімнат і викладача.</p>
            </div>
            <span className="text-[12px] text-gh-muted">Баланс: {data.shop.balance} coins</span>
          </div>
          <CosmeticShop items={data.shop.items} onBuy={buyCosmetic} buying={buying} />

          <div className="flex items-center justify-between gap-3 mt-6 mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-gh-fg">Інвентар оформлення</h2>
              <p className="text-[12px] text-gh-muted mt-1">Куплені пресети можна активувати тут.</p>
            </div>
            <span className="text-[12px] text-gh-muted">{inventory.length} нагород</span>
          </div>
          <InventorySection title="Титули" type="title" items={inventory.filter((item) => item.type === "title")} activeId={profile.activeTitleId} onEquip={equip} saving={saving} />
          <InventorySection title="Банери" type="banner" items={inventory.filter((item) => item.type === "banner")} activeId={profile.activeBannerId} onEquip={equip} saving={saving} />
          <InventorySection title="Рамки аватарки" type="frame" items={inventory.filter((item) => item.type === "frame")} activeId={profile.activeFrameId} onEquip={equip} saving={saving} />
          <InventorySection title="Акценти" type="accent" items={inventory.filter((item) => item.type === "accent")} activeId={profile.activeAccentId} onEquip={equip} saving={saving} />
        </section>
      </div>
    </Page>
  );
}

function PublicProfilePage({ userId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    profileApi.get(userId).then((next) => {
      if (cancelled) return;
      setData(next);
      setError(null);
    }).catch((e) => {
      if (!cancelled) setError(e?.message ?? "Не вдалось завантажити профіль");
    });
    return () => { cancelled = true; };
  }, [userId]);

  if (error) return <Page><ErrorBox>{error}</ErrorBox></Page>;
  if (!data) return <Page><div className="h-56 rounded-md skeleton" /><div className="h-36 rounded-md skeleton" /></Page>;

  const { user, profile, activeCosmetics } = data;
  const titlePayload = activeCosmetics.title?.payload ?? null;
  const banner = activeCosmetics.banner?.payload?.bannerStyle ?? DEFAULT_BANNER;
  const accent = activeCosmetics.accent?.payload?.accentColor ?? activeCosmetics.accent?.payload?.color ?? titlePayload?.color ?? DEFAULT_ACCENT;
  const frameColor = activeCosmetics.frame?.payload?.frameColor ?? activeCosmetics.frame?.payload?.color ?? accent;
  const draft = {
    status: profile.status ?? "",
    bio: profile.bio ?? "",
    favoriteStack: profile.favoriteStack ?? "",
  };

  return (
    <Page>
      <div>
        <h1 className="text-[28px] font-semibold text-gh-fg">Профіль учасника</h1>
        <p className="text-[14px] text-gh-muted mt-1">
          Публічний профіль студента або викладача зі спільної кімнати.
        </p>
      </div>
      <ProfilePreview
        user={user}
        draft={draft}
        title={titlePayload}
        banner={banner}
        accent={accent}
        frameColor={frameColor}
        readOnly
      />
    </Page>
  );
}

function Page({ children }) {
  return <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">{children}</div>;
}

function ErrorBox({ children }) {
  return <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">{children}</div>;
}

function ProfilePreview({ user, draft, title, banner, accent, frameColor, onAvatar, saving, readOnly = false }) {
  const displayName = user.name ?? user.email;
  return (
    <section className="relative overflow-hidden rounded-md border border-[#30363d] bg-[#161b22]">
      <div className="h-40" style={{ backgroundImage: banner }} />
      <div className="p-5 pt-0">
        <div className="flex items-end gap-4 -mt-12">
          <Avatar user={user} displayName={displayName} frameColor={frameColor} onAvatar={onAvatar} saving={saving} readOnly={readOnly} />
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[26px] font-semibold text-gh-fg truncate">{displayName}</h2>
              {title && <TitleBadge title={title} accent={accent} />}
            </div>
            <div className="text-[13px] text-gh-muted">{user.role === "teacher" ? "Викладач" : "Студент"} · {user.email}</div>
          </div>
        </div>
        <div className="mt-4 grid md:grid-cols-[1fr_auto] gap-4">
          <div className="rounded-md bg-[#0d1117] border border-[#30363d] p-4">
            <p className="text-[17px] font-semibold text-gh-fg" style={{ color: accent }}>“{draft.status || "Без статусу"}”</p>
            <p className="text-[14px] text-gh-muted mt-2 leading-relaxed">{draft.bio || "Опис профілю ще не заповнений."}</p>
            <div className="mt-3 text-[12px] text-gh-subtle">Стек: {draft.favoriteStack || "не вказано"}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2 min-w-[160px]">
            <MiniStat label="XP" value={user.totals?.xp ?? 0} />
            <MiniStat label="Coins" value={user.totals?.coins ?? 0} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Avatar({ user, displayName, frameColor, onAvatar, saving, readOnly = false }) {
  const cls = "w-24 h-24 rounded-2xl bg-[#0d1117] border-4 flex-shrink-0";
  const style = { borderColor: frameColor, boxShadow: `0 0 22px ${frameColor}66` };
  const content = user.avatarUrl ? (
    <img src={user.avatarUrl} alt={displayName} className={`${cls} object-cover`} style={style} />
  ) : (
    <span className={`${cls} flex items-center justify-center text-[34px] font-semibold text-gh-fg`} style={style}>{displayName.slice(0, 1).toUpperCase()}</span>
  );

  if (readOnly) return content;

  return (
    <label className="relative group cursor-pointer" title="Завантажити аватар">
      {content}
      <span className="absolute inset-x-0 bottom-0 text-center text-[11px] py-1 rounded-b-2xl bg-black/65 text-white opacity-0 group-hover:opacity-100 transition-opacity">
        {saving ? "..." : "змінити"}
      </span>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onAvatar?.(e.target.files?.[0])} disabled={saving} />
    </label>
  );
}

function TitleBadge({ title, accent }) {
  const color = title.color ?? accent;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px] font-semibold" style={{ color, borderColor: `${color}66`, background: `${color}18` }}><span>{title.emoji ?? "🏷"}</span>{title.title ?? "Титул"}</span>;
}

function CosmeticShop({ items, onBuy, buying }) {
  return (
    <div className="grid md:grid-cols-2 gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onBuy(item.id)}
          disabled={item.owned || buying === item.id}
          className={`text-left rounded-md border p-3 transition-colors ${item.owned ? "border-[#3fb950] bg-[#3fb950]/10" : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]"}`}
        >
          <div className="flex items-start gap-2">
            <RewardSwatch item={item} color={item.payload?.color ?? item.payload?.accentColor ?? item.payload?.frameColor ?? DEFAULT_ACCENT} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-gh-fg truncate">{item.title}</div>
              <div className="text-[11px] text-gh-muted line-clamp-2">{item.description}</div>
              <div className={`text-[11px] mt-1 ${item.owned ? "text-gh-success" : "text-gh-attention"}`}>
                {item.owned ? "В інвентарі" : item.cost === 0 ? "Безкоштовно" : `${item.cost} coins`}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function InventorySection({ title, type, items, activeId, onEquip, saving }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-semibold text-gh-fg">{title}</h3>
        {activeId && <button type="button" onClick={() => onEquip(type, null)} disabled={saving} className="text-[12px] text-gh-muted hover:text-gh-danger">скинути</button>}
      </div>
      {items.length === 0 ? (
        <div className="text-[13px] text-gh-muted bg-[#0d1117] border border-[#30363d] rounded-md p-3">Немає куплених нагород цього типу.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-2">
          {items.map((item) => <InventoryCard key={item.id} item={item} active={activeId === item.id} onEquip={() => onEquip(type, item.id)} saving={saving} />)}
        </div>
      )}
    </div>
  );
}

function InventoryCard({ item, active, onEquip, saving }) {
  const payload = item.payload ?? {};
  const color = payload.color ?? payload.accentColor ?? payload.frameColor ?? DEFAULT_ACCENT;
  return (
    <button type="button" onClick={onEquip} disabled={saving || active} className={`text-left rounded-md border p-3 transition-colors ${active ? "border-[#3fb950] bg-[#3fb950]/10" : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e]"}`}>
      <div className="flex items-start gap-2">
        <RewardSwatch item={item} color={color} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-gh-fg truncate">{payload.title ?? payload.label ?? item.title}</div>
          <div className="text-[11px] text-gh-muted line-clamp-2">{item.description || `Куплено за ${item.cost} coins`}</div>
          <div className={`text-[11px] mt-1 ${active ? "text-gh-success" : "text-gh-subtle"}`}>{active ? "Активно" : "Натисни, щоб активувати"}</div>
        </div>
      </div>
    </button>
  );
}

function RewardSwatch({ item, color }) {
  if (item.type === "title") return <span className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0" style={{ color, borderColor: `${color}66`, background: `${color}18` }}>{item.payload?.emoji ?? "🏷"}</span>;
  if (item.type === "banner") return <span className="w-12 h-9 rounded-md border border-[#30363d] flex-shrink-0" style={{ backgroundImage: item.payload?.bannerStyle ?? DEFAULT_BANNER }} />;
  return <span className="w-9 h-9 rounded-full border border-[#30363d] flex-shrink-0" style={{ background: color }} />;
}

function Field({ label, hint, children }) {
  return <label className="block"><div className="flex items-center justify-between mb-1"><span className="text-[14px] font-semibold text-gh-fg">{label}</span>{hint && <span className="text-[12px] text-gh-muted">{hint}</span>}</div>{children}</label>;
}

function MiniStat({ label, value }) {
  return <div className="rounded-md bg-[#0d1117] border border-[#30363d] p-3 text-center"><div className="text-[20px] font-semibold text-mono text-gh-fg">{value}</div><div className="text-[10px] uppercase tracking-wider text-gh-muted">{label}</div></div>;
}
