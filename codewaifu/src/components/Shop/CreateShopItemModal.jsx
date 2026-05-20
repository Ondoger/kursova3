import { useState } from "react";
import { Modal } from "../UI/Modal";
import { shopApi } from "../../utils/api";
import { FormError, FormField } from "../Auth/AuthLayout";

const KIND_OPTIONS = [
  { value: "auto_pass", label: "Автомат на іспит / залік" },
  { value: "retake", label: "Перездача" },
  { value: "extra_attempt", label: "Додаткова спроба" },
  { value: "title", label: "Косметичний титул" },
  { value: "cosmetic", label: "Косметика (банер/колір)" },
  { value: "custom", label: "Інше" },
];

const COSMETIC_TYPES = [
  { value: "title", label: "Титул профілю" },
  { value: "banner", label: "Банер профілю" },
  { value: "frame", label: "Рамка аватарки" },
  { value: "accent", label: "Акцентний колір" },
];

const BANNER_PRESETS = [
  {
    label: "Neon Ocean",
    value: "linear-gradient(135deg,#1f6feb 0%,#161b22 55%,#0d1117 100%)",
  },
  {
    label: "Forest XP",
    value: "linear-gradient(135deg,#238636 0%,#161b22 55%,#0d1117 100%)",
  },
  {
    label: "Purple Rank",
    value: "linear-gradient(135deg,#6e40c9 0%,#1f2733 55%,#0d1117 100%)",
  },
  {
    label: "Gold Legend",
    value: "linear-gradient(135deg,#d29922 0%,#161b22 55%,#0d1117 100%)",
  },
];

function initialForm(initial) {
  if (!initial) {
    return {
      title: "",
      description: "",
      cost: 100,
      kind: "custom",
      cosmeticType: "title",
      cosmeticLabel: "",
      cosmeticEmoji: "🏆",
      cosmeticColor: "#58a6ff",
      bannerStyle: BANNER_PRESETS[0].value,
      unlimited: true,
      stock: 1,
    };
  }
  return {
    title: initial.title ?? "",
    description: initial.description ?? "",
    cost: initial.cost ?? 100,
    kind: initial.kind ?? "custom",
    cosmeticType:
      initial.payload?.cosmeticType ??
      (initial.kind === "title" ? "title" : "accent"),
    cosmeticLabel: initial.payload?.label ?? initial.payload?.title ?? "",
    cosmeticEmoji: initial.payload?.emoji ?? "🏆",
    cosmeticColor:
      initial.payload?.color ?? initial.payload?.accentColor ?? "#58a6ff",
    bannerStyle: initial.payload?.bannerStyle ?? BANNER_PRESETS[0].value,
    unlimited: initial.unlimited,
    stock: initial.unlimited ? 1 : initial.stock ?? 1,
  };
}

export function CreateShopItemModal({
  open,
  onClose,
  roomId,
  initial = null,
  onSaved,
}) {
  const editing = Boolean(initial);
  const form = initialForm(initial);
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description);
  const [cost, setCost] = useState(form.cost);
  const [kind, setKind] = useState(form.kind);
  const [cosmeticType, setCosmeticType] = useState(form.cosmeticType);
  const [cosmeticLabel, setCosmeticLabel] = useState(form.cosmeticLabel);
  const [cosmeticEmoji, setCosmeticEmoji] = useState(form.cosmeticEmoji);
  const [cosmeticColor, setCosmeticColor] = useState(form.cosmeticColor);
  const [bannerStyle, setBannerStyle] = useState(form.bannerStyle);
  const [unlimited, setUnlimited] = useState(form.unlimited);
  const [stock, setStock] = useState(form.stock);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    setSubmitting(true);
    setError(null);
    const cosmeticPayload =
      kind === "title"
        ? {
            cosmeticType: "title",
            title: cosmeticLabel.trim() || title.trim(),
            emoji: cosmeticEmoji.trim() || "🏆",
            color: cosmeticColor,
          }
        : kind === "cosmetic"
          ? {
              cosmeticType,
              label: cosmeticLabel.trim() || title.trim(),
              color: cosmeticColor,
              accentColor: cosmeticType === "accent" ? cosmeticColor : undefined,
              frameColor: cosmeticType === "frame" ? cosmeticColor : undefined,
              bannerStyle: cosmeticType === "banner" ? bannerStyle : undefined,
            }
          : {};

    const payload = {
      title,
      description,
      cost: Number(cost) || 1,
      kind,
      stock: unlimited ? -1 : Math.max(0, Number(stock) || 0),
      payload: cosmeticPayload,
    };
    try {
      if (editing) {
        const { item } = await shopApi.patch(initial.id, payload);
        onSaved?.(item);
      } else {
        const { item } = await shopApi.createInRoom(roomId, payload);
        onSaved?.(item);
      }
    } catch (e) {
      setError(e?.message ?? "Не вдалось зберегти");
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Редагувати товар" : "Новий товар у магазин"}
      footer={
        <>
          <button onClick={onClose} className="btn-gh">
            Скасувати
          </button>
          <button
            onClick={submit}
            disabled={submitting || title.trim().length < 2}
            className="btn-gh btn-gh-primary"
          >
            {submitting ? "Зберігаємо..." : editing ? "Зберегти" : "Створити"}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <FormField label="Назва" hint={`${title.length}/120`}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Автомат на іспит"
            className="input-gh"
            maxLength={120}
            autoFocus
            required
          />
        </FormField>

        <FormField label="Опис" hint={`${description.length}/2000`}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Що отримує студент після покупки..."
            className="input-gh resize-y min-h-[80px]"
            maxLength={2000}
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ціна (коїнів)">
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="input-gh text-mono"
              min={1}
              max={1_000_000}
              required
            />
          </FormField>
          <FormField label="Тип">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="input-gh"
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {(kind === "title" || kind === "cosmetic") && (
          <div className="rounded-md border border-[#30363d] bg-[#0d1117] p-3 mb-3">
            <div className="text-[13px] font-semibold text-gh-fg mb-2">
              Оформлення профілю після покупки
            </div>
            {kind === "cosmetic" && (
              <FormField label="Що відкриває товар">
                <select
                  value={cosmeticType}
                  onChange={(e) => setCosmeticType(e.target.value)}
                  className="input-gh"
                >
                  {COSMETIC_TYPES.filter((t) => t.value !== "title").map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField label={kind === "title" ? "Назва титулу" : "Назва стилю"}>
                <input
                  value={cosmeticLabel}
                  onChange={(e) => setCosmeticLabel(e.target.value)}
                  placeholder={kind === "title" ? "Code Samurai" : "Ocean Blue"}
                  className="input-gh"
                  maxLength={80}
                />
              </FormField>
              {kind === "title" ? (
                <FormField label="Emoji">
                  <input
                    value={cosmeticEmoji}
                    onChange={(e) => setCosmeticEmoji(e.target.value)}
                    className="input-gh"
                    maxLength={4}
                  />
                </FormField>
              ) : (
                <FormField label="Колір">
                  <input
                    type="color"
                    value={cosmeticColor}
                    onChange={(e) => setCosmeticColor(e.target.value)}
                    className="input-gh h-10 p-1"
                  />
                </FormField>
              )}
            </div>
            {kind === "title" && (
              <FormField label="Колір титулу">
                <input
                  type="color"
                  value={cosmeticColor}
                  onChange={(e) => setCosmeticColor(e.target.value)}
                  className="input-gh h-10 p-1"
                />
              </FormField>
            )}
            {kind === "cosmetic" && cosmeticType === "banner" && (
              <FormField label="Пресет банера">
                <select
                  value={bannerStyle}
                  onChange={(e) => setBannerStyle(e.target.value)}
                  className="input-gh"
                >
                  {BANNER_PRESETS.map((preset) => (
                    <option key={preset.label} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </div>
        )}

        <FormField label="Кількість">
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
              className="w-4 h-4 accent-[#1f6feb]"
            />
            <span className="text-[13px] text-gh-fg">
              Необмежено — кожен охочий може купити
            </span>
          </label>
          {!unlimited && (
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="input-gh text-mono"
              min={0}
              max={10000}
              placeholder="Скільки одиниць"
            />
          )}
        </FormField>

        {error && <FormError>{error}</FormError>}

        <p className="text-[12px] text-gh-muted mt-3 leading-relaxed">
          Титули й косметика автоматично потрапляють в інвентар профілю
          студента. Інші нагороди залишаються заявками для викладача.
        </p>
      </form>
    </Modal>
  );
}
