import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import { roomsApi } from "../utils/api";
import { CreateRoomModal } from "../components/Rooms/CreateRoomModal";
import { JoinRoomModal } from "../components/Rooms/JoinRoomModal";
import { GitHubLinkCard } from "../components/Auth/GitHubLinkCard";

/*
 * Rooms hub — the post-Phase-2 home page for an authenticated user.
 *
 * - Teacher view: list of rooms they own/teach + a "Create room" CTA.
 * - Student view: list of rooms they're in + a "Join room" CTA.
 *
 * Eventually this page will surface assignments, deadlines, recent
 * activity, etc. For now it's a focused "what classes am I part of?"
 * landing.
 */
export function Dashboard() {
  const authUser = useStore((s) => s.authUser);
  const isTeacher = authUser?.role === "teacher";

  const [rooms, setRooms] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const refresh = async () => {
    try {
      const { rooms } = await roomsApi.list();
      setRooms(rooms);
      setLoadError(null);
    } catch (e) {
      setLoadError(e?.message ?? "Не вдалось завантажити кімнати");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  if (!authUser) return null;

  const active = (rooms ?? []).filter((r) => !r.archived);
  const archived = (rooms ?? []).filter((r) => r.archived);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero / status strip */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold text-gh-fg">
            Привіт, {authUser.name}
          </h1>
          <p className="text-gh-muted text-[14px] mt-1">
            {isTeacher
              ? "Керуй своїми класами, видавай завдання, оцінюй студентів."
              : "Твої класи, завдання та прогрес."}
          </p>
        </div>
        <div className="flex gap-2">
          {isTeacher ? (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-gh btn-gh-primary"
            >
              + Створити клас
            </button>
          ) : (
            <button
              onClick={() => setShowJoin(true)}
              className="btn-gh btn-gh-primary"
            >
              + Приєднатись до класу
            </button>
          )}
        </div>
      </div>

      {/* GitHub link nudge — shown until the user actually links GitHub.
          Once linked, the banner disappears (the navbar pill takes over). */}
      {!authUser.githubLogin && <GitHubLinkCard user={authUser} />}

      {/* Loading state */}
      {rooms === null && !loadError && (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-md skeleton" />
          ))}
        </div>
      )}

      {/* Error */}
      {loadError && (
        <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4 text-[14px]">
          {loadError}
          <button
            onClick={refresh}
            className="ml-3 text-gh-accent hover:underline"
          >
            Спробувати ще
          </button>
        </div>
      )}

      {/* Empty state */}
      {rooms !== null && active.length === 0 && (
        <EmptyState
          isTeacher={isTeacher}
          onCreate={() => setShowCreate(true)}
          onJoin={() => setShowJoin(true)}
        />
      )}

      {/* Active rooms */}
      {active.length > 0 && (
        <section>
          <SectionTitle>
            {isTeacher ? "Мої класи" : "Класи, де я навчаюсь"}
            <span className="text-gh-subtle font-normal ml-2">
              {active.length}
            </span>
          </SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {active.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Archived rooms */}
      {archived.length > 0 && (
        <section>
          <SectionTitle muted>
            Архів
            <span className="text-gh-subtle font-normal ml-2">
              {archived.length}
            </span>
          </SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archived.map((room) => (
              <RoomCard key={room.id} room={room} archived />
            ))}
          </div>
        </section>
      )}

      <CreateRoomModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          refresh();
        }}
      />
      <JoinRoomModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={() => {
          setShowJoin(false);
          refresh();
        }}
      />
    </div>
  );
}

function SectionTitle({ children, muted }) {
  return (
    <h2
      className={`text-[16px] font-semibold mb-3 ${muted ? "text-gh-muted" : "text-gh-fg"}`}
    >
      {children}
    </h2>
  );
}

function EmptyState({ isTeacher, onCreate, onJoin }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-8 text-center">
      <div className="text-[48px] mb-2 opacity-60">🎓</div>
      <h3 className="text-[18px] font-semibold text-gh-fg mb-1">
        Поки тут порожньо
      </h3>
      <p className="text-gh-muted text-[14px] mb-5 max-w-md mx-auto leading-relaxed">
        {isTeacher
          ? "Створи свій перший клас. Ти отримаєш код-запрошення, який можна кинути студентам у будь-якому месенджері."
          : "Приєднайся до класу за кодом-запрошенням, який тобі дав викладач."}
      </p>
      {isTeacher ? (
        <button onClick={onCreate} className="btn-gh btn-gh-primary">
          + Створити свій перший клас
        </button>
      ) : (
        <button onClick={onJoin} className="btn-gh btn-gh-primary">
          + Ввести код-запрошення
        </button>
      )}
    </div>
  );
}

function RoomCard({ room, archived }) {
  const isStaff = room.membership?.role !== "student";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-[#161b22] border rounded-md p-4 transition-colors ${
        archived
          ? "border-[#30363d] opacity-60"
          : "border-[#30363d] hover:border-[#8b949e]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <Link
          to={`/rooms/${room.id}`}
          className="text-[15px] font-semibold text-gh-fg hover:text-gh-accent hover:no-underline truncate"
        >
          {room.name}
        </Link>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${
            isStaff
              ? "bg-[#1f6feb]/15 border-[#1f6feb]/40 text-[#58a6ff]"
              : "bg-[#3fb950]/10 border-[#3fb950]/30 text-[#3fb950]"
          }`}
        >
          {room.membership?.role === "teacher"
            ? "Викладач"
            : room.membership?.role === "co_teacher"
              ? "Ко-викладач"
              : "Студент"}
        </span>
      </div>
      {room.description && (
        <p className="text-[13px] text-gh-muted line-clamp-2 mb-3 leading-relaxed">
          {room.description}
        </p>
      )}
      <div className="flex items-center justify-between text-[12px] text-gh-subtle">
        <span>{room.memberCount} учасників</span>
        {room.ownerName && !isStaff && <span>by {room.ownerName}</span>}
        {isStaff && room.inviteCode && (
          <span className="text-mono text-gh-attention">
            {room.inviteCode}
          </span>
        )}
      </div>
    </motion.div>
  );
}
