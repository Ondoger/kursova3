import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "../store/useStore";
import { roomsApi } from "../utils/api";
import { ApiError } from "../utils/api";
import { FormError, FormField } from "../components/Auth/AuthLayout";
import { Modal } from "../components/UI/Modal";
import { AssignmentsTab } from "../components/Assignments/AssignmentsTab";
import { ShopTab } from "../components/Shop/ShopTab";
import { StudentQuests } from "../components/Rooms/StudentQuests";
import { TeacherPanel } from "../components/Rooms/TeacherPanel";
import { ClassLeaderboard } from "../components/Rooms/ClassLeaderboard";
import { ClassCalendar } from "../components/Rooms/ClassCalendar";
import { CodeReviewGame } from "../components/Rooms/CodeReviewGame";
import { MiniTournaments } from "../components/Rooms/MiniTournaments";
import { WeeklyChallenges } from "../components/Rooms/WeeklyChallenges";
import { TeamQuests } from "../components/Rooms/TeamQuests";

/*
 * Single-room view. Two tabs:
 *   - Members  : list of everyone in the room. Staff can kick.
 *   - Settings : edit name/description, rotate invite, archive.
 *                Staff-only — students never see it.
 *
 * Assignments + chat will be added as additional tabs in later phases.
 */
const TABS = {
  assignments: { label: "Завдання" },
  calendar: { label: "Календар" },
  analytics: { label: "Панель викладача", staffOnly: true },
  leaderboard: { label: "Рейтинг" },
  weekly: { label: "Weekly" },
  codeReviews: { label: "Code Review" },
  teamQuests: { label: "Командні" },
  tournaments: { label: "Code Contest" },
  quests: { label: "Квести", studentOnly: true },
  shop: { label: "Магазин" },
  members: { label: "Учасники" },
  // Future:  chat: { label: "Чат" },
  settings: { label: "Налаштування", staffOnly: true },
};

const TAB_NAV = [
  { type: "tab", key: "assignments" },
  { type: "tab", key: "calendar" },
  { type: "tab", key: "leaderboard" },
  { type: "group", key: "activities", label: "Активності", items: ["weekly", "codeReviews", "teamQuests", "tournaments", "quests"] },
  { type: "tab", key: "shop" },
  { type: "tab", key: "members" },
  { type: "group", key: "management", label: "Керування", items: ["analytics", "settings"] },
];

function isRoomTabVisible(key, room, isStaff) {
  const meta = TABS[key];
  if (!meta) return false;
  if (meta.staffOnly && !isStaff) return false;
  if (meta.studentOnly && isStaff) return false;
  return !(key === "leaderboard" && room.settings?.publicLeaderboard === false && !isStaff);
}

export function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const authUser = useStore((s) => s.authUser);

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const refresh = async () => {
    try {
      const data = await roomsApi.get(id);
      setData(data);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        // Likely tried to view someone else's room. Bounce home.
        navigate("/dashboard", { replace: true });
        return;
      }
      setError(e?.message ?? "Не вдалось завантажити кімнату");
    }
  };

  useEffect(() => {
    let cancelled = false;
    roomsApi.get(id).then((next) => {
      if (cancelled) return;
      setData(next);
      setError(null);
    }).catch((e) => {
      if (cancelled) return;
      if (e instanceof ApiError && e.status === 403) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setError(e?.message ?? "Не вдалось завантажити кімнату");
    });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
          {error}
        </div>
        <Link to="/dashboard" className="btn-gh mt-4 inline-flex">
          ← На дашборд
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-24 rounded-md skeleton" />
        <div className="h-12 rounded-md skeleton" />
        <div className="h-64 rounded-md skeleton" />
      </div>
    );
  }

  const { room, members } = data;
  const isStaff = ["teacher", "co_teacher"].includes(room.membership?.role);
  const isOwner = String(room.ownerId) === String(authUser?.id);
  const isTabVisible = (key) => isRoomTabVisible(key, room, isStaff);
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab && isTabVisible(requestedTab) ? requestedTab : "assignments";
  const selectTab = (key) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (key === "assignments") next.delete("tab");
      else next.set("tab", key);
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <RoomHeader
        room={room}
        members={members}
        isStaff={isStaff}
        onChange={refresh}
      />

      <nav className="flex flex-wrap gap-1 border-b border-[#30363d]">
        {TAB_NAV.map((item) => {
          if (item.type === "tab") {
            if (!isTabVisible(item.key)) return null;
            return (
              <RoomTabButton
                key={item.key}
                active={tab === item.key}
                onClick={() => selectTab(item.key)}
              >
                {TABS[item.key].label}
              </RoomTabButton>
            );
          }

          const visibleItems = item.items.filter(isTabVisible);
          if (visibleItems.length === 0) return null;
          const active = visibleItems.includes(tab);
          return (
            <div key={item.key} className="relative group">
              <RoomTabButton active={active}>
                <span>{item.label}</span>
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="currentColor"
                  aria-hidden
                  className="mt-0.5"
                >
                  <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </RoomTabButton>
              <div className="absolute left-0 top-full z-30 mt-1 hidden min-w-[190px] flex-col rounded-md border border-[#30363d] bg-[#161b22] p-1 shadow-xl group-hover:flex group-focus-within:flex">
                {visibleItems.map((key) => {
                  const itemActive = tab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectTab(key)}
                      className={`w-full rounded px-3 py-2 text-left text-[13px] transition-colors ${
                        itemActive
                          ? "bg-[#1f2733] text-gh-fg font-semibold"
                          : "text-gh-muted hover:bg-[#1f2733] hover:text-gh-fg"
                      }`}
                    >
                      {TABS[key].label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {tab === "assignments" && (
        <AssignmentsTab room={room} isStaff={isStaff} />
      )}
      {tab === "calendar" && (
        <ClassCalendar room={room} />
      )}
      {tab === "analytics" && isStaff && (
        <TeacherPanel room={room} />
      )}
      {tab === "leaderboard" && (
        <ClassLeaderboard room={room} />
      )}
      {tab === "weekly" && (
        <WeeklyChallenges room={room} isStaff={isStaff} />
      )}
      {tab === "codeReviews" && (
        <CodeReviewGame room={room} />
      )}
      {tab === "teamQuests" && (
        <TeamQuests room={room} isStaff={isStaff} />
      )}
      {tab === "tournaments" && (
        <MiniTournaments room={room} isStaff={isStaff} />
      )}
      {tab === "quests" && !isStaff && (
        <StudentQuests room={room} />
      )}
      {tab === "shop" && (
        <ShopTab room={room} isStaff={isStaff} />
      )}
      {tab === "members" && (
        <MembersTab
          room={room}
          members={members}
          isStaff={isStaff}
          onChange={refresh}
        />
      )}
      {tab === "settings" && isStaff && (
        <SettingsTab
          room={room}
          isOwner={isOwner}
          onChange={refresh}
        />
      )}
    </div>
  );
}

function RoomTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-1 px-4 py-2 text-[14px] transition-colors ${
        active
          ? "text-gh-fg font-semibold"
          : "text-gh-muted hover:text-gh-fg"
      }`}
    >
      {children}
      {active && (
        <motion.span
          layoutId="room-tab-indicator"
          className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#fd8c73]"
        />
      )}
    </button>
  );
}

/* ── Header ─────────────────────────────────────────────────────────── */

function RoomHeader({ room, members, isStaff }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const copyInvite = () => {
    if (!room.inviteCode) return;
    navigator.clipboard.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const leave = async () => {
    try {
      await roomsApi.leave(room.id);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      alert(e?.message ?? "Не вдалось вийти");
    }
  };

  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Link
            to="/dashboard"
            className="text-[12px] text-gh-muted hover:text-gh-accent"
          >
            ← Усі класи
          </Link>
          <h1 className="text-[28px] font-semibold text-gh-fg leading-tight mt-1">
            {room.name}
            {room.archived && (
              <span className="ml-3 text-[11px] uppercase tracking-wider text-gh-attention align-middle px-2 py-0.5 rounded-full border border-[#d29922]/40 bg-[#d29922]/10">
                архів
              </span>
            )}
          </h1>
          {room.description && (
            <p className="text-gh-muted mt-1 max-w-2xl leading-relaxed">
              {room.description}
            </p>
          )}
          <div className="text-[12px] text-gh-subtle mt-2">
            {members.length} учасників · створено{" "}
            {room.ownerName ?? "—"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStaff && room.inviteCode && (
            <button
              onClick={copyInvite}
              className="btn-gh inline-flex items-center gap-2 text-mono"
              title="Натисни щоб скопіювати"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden
              >
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
              </svg>
              {copied ? "Скопійовано!" : room.inviteCode}
            </button>
          )}
          {!isStaff && (
            <button
              onClick={() => setConfirmLeave(true)}
              className="btn-gh"
            >
              Вийти з класу
            </button>
          )}
        </div>
      </div>

      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Вийти з класу?"
        footer={
          <>
            <button
              onClick={() => setConfirmLeave(false)}
              className="btn-gh"
            >
              Скасувати
            </button>
            <button onClick={leave} className="btn-gh btn-gh-primary">
              Вийти
            </button>
          </>
        }
      >
        <p className="text-[14px] text-gh-muted leading-relaxed">
          Ти втратиш доступ до завдань і чату цього класу. Коїни в кімнаті
          збережуться, але стануть недоступні. Знову приєднатись можна
          лише за тим самим кодом-запрошенням.
        </p>
      </Modal>
    </header>
  );
}

/* ── Members tab ────────────────────────────────────────────────────── */

function MembersTab({ room, members, isStaff, onChange }) {
  const authUser = useStore((s) => s.authUser);
  const [removingId, setRemovingId] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const removeMember = async (userId) => {
    if (!confirm("Видалити учасника з класу?")) return;
    setRemovingId(userId);
    try {
      await roomsApi.removeMember(room.id, userId);
      onChange?.();
    } catch (e) {
      alert(e?.message ?? "Не вдалось видалити");
    } finally {
      setRemovingId(null);
    }
  };

  const seedStudents = async () => {
    setSeeding(true);
    try {
      await roomsApi.devSeedStudents(room.id);
      onChange?.();
    } catch (e) {
      alert(e?.message ?? "Не вдалось додати тестових студентів");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-2">
      {isStaff && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[13px] font-semibold text-gh-fg">
              Тестове наповнення класу
            </div>
            <div className="text-[12px] text-gh-muted">
              Dev-режим: додати 5 демо-студентів для перевірки команд, рейтингу і review.
            </div>
          </div>
          <button
            type="button"
            onClick={seedStudents}
            disabled={seeding}
            className="btn-gh"
          >
            {seeding ? "Додаємо..." : "+ 5 студентів"}
          </button>
        </div>
      )}
      {members.map((m) => {
        const isMe = String(m.userId) === String(authUser?.id);
        const isMemberOwner = String(m.userId) === String(room.ownerId);
        const canRemove = isStaff && !isMemberOwner && !isMe;
        return (
          <Link
            key={m.userId}
            to={`/profile/${m.userId}`}
            className="bg-[#161b22] border border-[#30363d] rounded-md p-3 flex items-center gap-3 hover:border-[#8b949e] hover:bg-[#1f2733]/35 hover:no-underline transition-colors"
          >
            <Avatar user={m} />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] text-gh-fg font-medium truncate flex items-center gap-2">
                {m.name ?? m.email}
                {isMe && (
                  <span className="text-[10px] text-gh-muted">(ти)</span>
                )}
              </div>
              <div className="text-[12px] text-gh-muted truncate">
                {m.email}
                {m.githubLogin && (
                  <span className="ml-2 text-mono text-gh-subtle">
                    @{m.githubLogin}
                  </span>
                )}
              </div>
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                m.role === "teacher"
                  ? "bg-[#1f6feb]/15 border-[#1f6feb]/40 text-[#58a6ff]"
                  : m.role === "co_teacher"
                    ? "bg-[#a371f7]/15 border-[#a371f7]/40 text-[#a371f7]"
                    : "bg-[#3fb950]/10 border-[#3fb950]/30 text-[#3fb950]"
              }`}
            >
              {m.role === "teacher"
                ? "Викладач"
                : m.role === "co_teacher"
                  ? "Ко-викл."
                  : "Студент"}
            </span>
            <div className="hidden md:block text-[12px] text-gh-subtle text-mono w-16 text-right">
              {m.coins} ⓒ
            </div>
            {canRemove && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeMember(m.userId);
                }}
                disabled={removingId === m.userId}
                className="text-[12px] text-gh-muted hover:text-gh-danger px-2 py-1 rounded-md hover:bg-[#1f2733] disabled:opacity-50"
                title="Видалити з класу"
              >
                Видалити
              </button>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function Avatar({ user }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? user.email}
        className="w-8 h-8 rounded-full border border-[#30363d]"
      />
    );
  }
  const initial = (user.name ?? user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span className="w-8 h-8 rounded-full border border-[#30363d] bg-[#0d1117] flex items-center justify-center text-[12px] font-semibold text-gh-fg">
      {initial}
    </span>
  );
}

/* ── Settings tab ──────────────────────────────────────────────────── */

function SettingsTab({ room, isOwner, onChange }) {
  const navigate = useNavigate();
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  // Reset edits when room data changes underneath us.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setName(room.name);
      setDescription(room.description ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [room.name, room.description]);

  const dirty = name !== room.name || description !== (room.description ?? "");

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await roomsApi.patch(room.id, { name, description });
      setSaveOk(true);
      onChange?.();
      setTimeout(() => setSaveOk(false), 1500);
    } catch (e) {
      setSaveError(e?.message ?? "Не вдалось зберегти");
    } finally {
      setSaving(false);
    }
  };

  const rotateInvite = async () => {
    if (!confirm("Згенерувати новий код? Старі лінки перестануть працювати.")) {
      return;
    }
    setRotating(true);
    try {
      await roomsApi.regenerateInvite(room.id);
      onChange?.();
    } catch (e) {
      alert(e?.message ?? "Не вдалось згенерувати");
    } finally {
      setRotating(false);
    }
  };

  const archive = async () => {
    try {
      await roomsApi.archive(room.id);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      alert(e?.message ?? "Не вдалось заархівувати");
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
        <h3 className="text-[15px] font-semibold text-gh-fg mb-4">
          Загальні налаштування
        </h3>
        <form onSubmit={save}>
          <FormField label="Назва" hint={`${name.length}/80`}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-gh"
              maxLength={80}
              required
            />
          </FormField>
          <FormField label="Опис" hint={`${description.length}/500`}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-gh resize-y min-h-[88px]"
              maxLength={500}
              rows={3}
            />
          </FormField>
          {saveError && <FormError>{saveError}</FormError>}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={!dirty || saving}
              className="btn-gh btn-gh-primary"
            >
              {saving ? "Зберігаємо..." : "Зберегти зміни"}
            </button>
            {saveOk && (
              <span className="text-[12px] text-gh-success">✓ Збережено</span>
            )}
          </div>
        </form>
      </section>

      <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
        <h3 className="text-[15px] font-semibold text-gh-fg mb-1">
          Код-запрошення
        </h3>
        <p className="text-[13px] text-gh-muted mb-3 leading-relaxed">
          Поточний код:{" "}
          <span className="text-mono text-gh-attention text-[15px]">
            {room.inviteCode}
          </span>
          . Скинь його, якщо лінк потрапив не туди — старий код перестане
          працювати.
        </p>
        <button
          onClick={rotateInvite}
          disabled={rotating}
          className="btn-gh"
        >
          {rotating ? "Генеруємо..." : "Згенерувати новий код"}
        </button>
      </section>

      {isOwner && (
        <section className="bg-[#161b22] border border-[#f85149]/40 rounded-md p-4">
          <h3 className="text-[15px] font-semibold text-gh-danger mb-1">
            Небезпечна зона
          </h3>
          <p className="text-[13px] text-gh-muted mb-3 leading-relaxed">
            Архівування — це м'яка форма видалення. Учасники більше не
            побачать клас, але дані не зникають. Можемо повернути.
          </p>
          <button
            onClick={() => setConfirmArchive(true)}
            disabled={room.archived}
            className="btn-gh"
            style={{ borderColor: "#f85149", color: "#f85149" }}
          >
            {room.archived ? "Вже заархівовано" : "Заархівувати клас"}
          </button>
        </section>
      )}

      <Modal
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Заархівувати клас?"
        footer={
          <>
            <button
              onClick={() => setConfirmArchive(false)}
              className="btn-gh"
            >
              Скасувати
            </button>
            <button onClick={archive} className="btn-gh btn-gh-primary">
              Заархівувати
            </button>
          </>
        }
      >
        <p className="text-[14px] text-gh-muted leading-relaxed">
          Студенти більше не бачитимуть клас у себе. Завдання, оцінки та
          історія коїнів збережуться. Розархівувати поки що можна тільки
          через DB-запит.
        </p>
      </Modal>
    </div>
  );
}
