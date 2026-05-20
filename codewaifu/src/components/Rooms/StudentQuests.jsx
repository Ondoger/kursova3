import { useEffect, useState } from "react";
import { roomsApi } from "../../utils/api";

export function StudentQuests({ room }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .quests(room.id)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Не вдалось завантажити квести");
      });
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  if (error) {
    return (
      <div className="bg-[#161b22] border border-[#f85149]/40 text-gh-danger rounded-md p-4">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="h-64 rounded-md skeleton" />;
  }

  const done = data.quests.filter((q) => q.completed).length;

  return (
    <div className="space-y-4">
      <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-[17px] font-semibold text-gh-fg">
              Квести класу
            </h3>
            <p className="text-[13px] text-gh-muted mt-1">
              Виконуй завдання, додавай README, коміть і перездавай після
              фідбеку — прогрес оновлюється автоматично.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[28px] text-mono font-semibold text-[#3fb950]">
              {done}/{data.quests.length}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-gh-muted">
              виконано
            </div>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-3">
        {data.quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>

      {data.stats.githubChecked === 0 && (
        <div className="text-[12px] text-gh-muted bg-[#161b22] border border-[#30363d] rounded-md p-3">
          GitHub-квести активуються після здачі репозиторію або PR.
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest }) {
  return (
    <div
      className={`rounded-md border p-4 ${
        quest.completed
          ? "bg-[#0d1117] border-[#3fb950]/50"
          : "bg-[#161b22] border-[#30363d]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-6 h-6 rounded-full border flex items-center justify-center text-[12px] ${
                quest.completed
                  ? "border-[#3fb950] text-[#3fb950] bg-[#3fb950]/10"
                  : "border-[#30363d] text-gh-muted bg-[#0d1117]"
              }`}
            >
              {quest.completed ? "✓" : "•"}
            </span>
            <h4 className="text-[15px] font-semibold text-gh-fg">
              {quest.title}
            </h4>
          </div>
          <p className="text-[13px] text-gh-muted leading-relaxed">
            {quest.description}
          </p>
        </div>
        <div className="text-[13px] text-mono text-gh-muted whitespace-nowrap">
          {quest.progress}/{quest.target}
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[#0d1117] overflow-hidden border border-[#30363d]">
        <div
          className={`h-full ${quest.completed ? "bg-[#3fb950]" : "bg-[#58a6ff]"}`}
          style={{ width: `${quest.percent}%` }}
        />
      </div>
      {quest.warning && (
        <div className="text-[11px] text-gh-attention mt-2">
          GitHub: {quest.warning}
        </div>
      )}
    </div>
  );
}
