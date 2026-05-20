import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { roomsApi } from "../../utils/api";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const EMPTY_EVENTS = [];

const SOURCE_META = {
  assignment: {
    label: "Завдання",
    chip: "bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/30",
    dot: "bg-[#58a6ff]",
  },
  weekly: {
    label: "Weekly",
    chip: "bg-[#d29922]/15 text-[#d29922] border-[#d29922]/30",
    dot: "bg-[#d29922]",
  },
  teamQuest: {
    label: "Командний",
    chip: "bg-[#a371f7]/15 text-[#a371f7] border-[#a371f7]/30",
    dot: "bg-[#a371f7]",
  },
  tournament: {
    label: "Турнір",
    chip: "bg-[#3fb950]/15 text-[#3fb950] border-[#3fb950]/30",
    dot: "bg-[#3fb950]",
  },
};

const KIND_LABEL = {
  deadline: "Дедлайн",
  start: "Старт",
};

const STATUS_LABEL = {
  todo: "Треба здати",
  returned: "Повернуто",
  done: "Зроблено",
  published: "Опубліковано",
  draft: "Чернетка",
  active: "Активне",
  upcoming: "Скоро",
  ended: "Завершено",
};

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function addDays(date, delta) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function dateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthDays(month) {
  const first = startOfMonth(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function formatMonth(date) {
  return date.toLocaleDateString("uk-UA", {
    month: "long",
    year: "numeric",
  });
}

function formatDayTitle(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString("uk-UA", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionNeeded(event) {
  return ["todo", "returned"].includes(event.status);
}

function isOverdue(event) {
  return event.kind === "deadline" && actionNeeded(event) && new Date(event.date) < new Date();
}

function eventSort(a, b) {
  return new Date(a.date) - new Date(b.date);
}

export function ClassCalendar({ room }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(dateKey(new Date()));
  const todayKey = dateKey(new Date());

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .calendar(room.id)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Не вдалось завантажити календар");
      });
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  const events = data?.events ?? EMPTY_EVENTS;
  const days = useMemo(() => buildMonthDays(month), [month]);
  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const event of events) {
      const key = dateKey(event.date);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort(eventSort);
    return map;
  }, [events]);
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];
  const upcomingActions = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => event.kind === "deadline" && actionNeeded(event) && new Date(event.date) >= now)
      .sort(eventSort)
      .slice(0, 6);
  }, [events]);
  const monthEventCount = days.reduce(
    (sum, day) => sum + (eventsByDay.get(dateKey(day))?.length ?? 0),
    0,
  );

  if (error) {
    return (
      <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="h-96 rounded-md skeleton" />;
  }

  return (
    <div className="space-y-4">
      <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[18px] font-semibold text-gh-fg">
              Календар класу
            </h2>
            <p className="text-[13px] text-gh-muted mt-1">
              Дедлайни завдань, старт і завершення активностей в одному місці.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, -1))}
              className="btn-gh"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setMonth(startOfMonth(now));
                setSelectedDay(dateKey(now));
              }}
              className="btn-gh"
            >
              Сьогодні
            </button>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              className="btn-gh"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <CalendarStat label="подій у місяці" value={monthEventCount} />
          <CalendarStat label="дедлайнів" value={data.totals?.deadlines ?? 0} accent="text-[#d29922]" />
          <CalendarStat label="треба зробити" value={data.totals?.actionNeeded ?? 0} accent="text-[#58a6ff]" />
          <CalendarStat label="прострочено" value={data.totals?.overdue ?? 0} accent="text-[#f85149]" />
        </div>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <section className="bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-gh-fg capitalize">
              {formatMonth(month)}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-gh-muted">
              <Legend source="assignment" />
              <Legend source="weekly" />
              <Legend source="teamQuest" />
              <Legend source="tournament" />
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-[#30363d]">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-[11px] uppercase tracking-wide text-gh-muted">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = dateKey(day);
              const dayEvents = eventsByDay.get(key) ?? [];
              const currentMonth = day.getMonth() === month.getMonth();
              const selected = key === selectedDay;
              const today = key === todayKey;
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`min-h-[118px] border-r border-b border-[#30363d] p-2 text-left transition-colors cursor-pointer ${
                    selected
                      ? "bg-[#1f2733]"
                      : "hover:bg-[#1f2733]/60"
                  } ${currentMonth ? "text-gh-fg" : "text-gh-subtle bg-[#0d1117]/35"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className="flex w-full items-center justify-between gap-1 text-left"
                  >
                    <span className={`text-[12px] font-semibold ${today ? "text-[#fd8c73]" : ""}`}>
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-gh-muted">
                        {dayEvents.length}
                      </span>
                    )}
                  </button>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <EventChip key={event.id} event={event} />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gh-muted">
                        +{dayEvents.length - 3} ще
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <DayPanel dayKey={selectedDay} events={selectedEvents} />
          <UpcomingPanel events={upcomingActions} />
        </aside>
      </div>
    </div>
  );
}

function CalendarStat({ label, value, accent = "text-gh-fg" }) {
  return (
    <div className="rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2">
      <div className={`text-[20px] text-mono font-semibold ${accent}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-gh-muted">
        {label}
      </div>
    </div>
  );
}

function Legend({ source }) {
  const meta = SOURCE_META[source];
  return (
    <span className="hidden md:inline-flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function EventChip({ event }) {
  const meta = SOURCE_META[event.source] ?? SOURCE_META.assignment;
  return (
    <div className={`truncate rounded border px-1.5 py-0.5 text-[10px] ${meta.chip}`}>
      {KIND_LABEL[event.kind]} · {event.title}
    </div>
  );
}

function DayPanel({ dayKey, events }) {
  return (
    <section className="bg-[#161b22] border border-[#30363d] rounded-md">
      <div className="px-4 py-3 border-b border-[#30363d]">
        <h3 className="text-[14px] font-semibold text-gh-fg capitalize">
          {formatDayTitle(dayKey)}
        </h3>
        <p className="text-[12px] text-gh-muted mt-1">
          {events.length} подій цього дня
        </p>
      </div>
      {events.length === 0 ? (
        <div className="p-4 text-[13px] text-gh-muted">
          На цей день нічого не заплановано.
        </div>
      ) : (
        <div className="divide-y divide-[#30363d]">
          {events.map((event) => (
            <CalendarEventCard key={event.id} event={event} linkable />
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingPanel({ events }) {
  return (
    <section className="bg-[#161b22] border border-[#30363d] rounded-md">
      <div className="px-4 py-3 border-b border-[#30363d]">
        <h3 className="text-[14px] font-semibold text-gh-fg">
          Що зробити найближчим часом
        </h3>
      </div>
      {events.length === 0 ? (
        <div className="p-4 text-[13px] text-gh-muted">
          Немає термінових незакритих дедлайнів.
        </div>
      ) : (
        <div className="divide-y divide-[#30363d]">
          {events.map((event, index) => (
            <CalendarEventCard key={event.id} event={event} compact linkable={index === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

function CalendarEventCard({ event, compact = false, linkable = false }) {
  const meta = SOURCE_META[event.source] ?? SOURCE_META.assignment;
  const card = (
    <div className={`p-4 ${isOverdue(event) ? "bg-[#f85149]/5" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${meta.chip}`}>
              {meta.label}
            </span>
            <span className="text-[11px] text-gh-muted">
              {KIND_LABEL[event.kind]} · {formatTime(event.date)}
            </span>
          </div>
          <h4 className="mt-2 text-[14px] font-semibold text-gh-fg leading-snug">
            {event.title}
          </h4>
          {!compact && event.description && (
            <p className="mt-1 text-[12px] text-gh-muted line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
          isOverdue(event)
            ? "bg-[#f85149]/10 text-gh-danger"
            : actionNeeded(event)
              ? "bg-[#58a6ff]/10 text-[#58a6ff]"
              : "bg-[#30363d] text-gh-muted"
        }`}>
          {isOverdue(event) ? "Прострочено" : STATUS_LABEL[event.status] ?? event.status}
        </span>
      </div>
    </div>
  );

  if (!linkable || !event.url) return card;
  return (
    <Link to={event.url} className="block hover:no-underline hover:bg-[#1f2733]/45">
      {card}
    </Link>
  );
}
