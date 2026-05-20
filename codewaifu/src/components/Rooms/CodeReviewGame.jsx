import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { roomsApi } from "../../utils/api";
import { Modal } from "../UI/Modal";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayName(user) {
  return user?.name ?? user?.email ?? "Студент";
}

export function CodeReviewGame({ room }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  const refresh = async () => {
    try {
      const next = await roomsApi.codeReviews(room.id);
      setData(next);
      setError(null);
    } catch (e) {
      setError(e?.message ?? "Не вдалось завантажити code review");
    }
  };

  useEffect(() => {
    let cancelled = false;
    roomsApi
      .codeReviews(room.id)
      .then((next) => {
        if (cancelled) return;
        setData(next);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Не вдалось завантажити code review");
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
    return <div className="h-96 rounded-md skeleton" />;
  }

  return (
    <div className="space-y-4">
      <section className="bg-[#161b22] border border-[#30363d] rounded-md p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[18px] font-semibold text-gh-fg">
              Code Review Arena
            </h2>
            <p className="text-[13px] text-gh-muted mt-1 max-w-2xl">
              Перевіряй роботи однокласників, лишай корисний фідбек і отримуй бонуси як за ігрові квести.
            </p>
          </div>
          {!data.isStaff && (
            <div className="rounded-md border border-[#3fb950]/40 bg-[#3fb950]/10 px-3 py-2 text-right">
              <div className="text-[20px] text-mono font-semibold text-[#3fb950]">
                +{data.rewardCoins}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gh-muted">
                коїнів за review
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <ReviewStat label="доступно" value={data.totals?.queue ?? 0} accent="text-[#58a6ff]" />
          <ReviewStat label="мої review" value={data.totals?.myReviews ?? 0} accent="text-[#3fb950]" />
          <ReviewStat label={data.isStaff ? "усього review" : "отримано"} value={data.isStaff ? data.totals?.reviews ?? 0 : data.totals?.receivedReviews ?? 0} />
          <ReviewStat label="баланс" value={data.membership?.coins ?? 0} accent="text-[#d29922]" />
        </div>
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <section className="bg-[#161b22] border border-[#30363d] rounded-md">
          <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-gh-fg">
                {data.isStaff ? "Роботи для review" : "Review-квести"}
              </h3>
              <p className="text-[12px] text-gh-muted mt-1">
                {data.isStaff
                  ? "Сабмішни, які студенти можуть review-ити."
                  : "Обери чужу роботу, відкрий repo/PR і залиш конструктивний фідбек."}
              </p>
            </div>
          </div>
          {data.queue.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[40px] opacity-60 mb-2">⌁</div>
              <h4 className="text-[15px] font-semibold text-gh-fg">
                Немає доступних review-квестів
              </h4>
              <p className="text-[13px] text-gh-muted mt-1">
                Потрібні здані роботи інших студентів, які ти ще не review-ив.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#30363d]">
              {data.queue.map((target) => (
                <ReviewTargetCard
                  key={target.id}
                  target={target}
                  isStaff={data.isStaff}
                  onReview={() => setReviewTarget(target)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <ReviewList
            title={data.isStaff ? "Останні review класу" : "Отримані review"}
            empty={data.isStaff ? "Студенти ще не писали review." : "Твої роботи ще не review-или."}
            reviews={data.receivedReviews}
          />
          {!data.isStaff && (
            <ReviewList
              title="Мої review"
              empty="Ти ще не зробив жодного review."
              reviews={data.myReviews}
            />
          )}
        </aside>
      </div>

      <ReviewModal
        open={Boolean(reviewTarget)}
        target={reviewTarget}
        roomId={room.id}
        rewardCoins={data.rewardCoins}
        onClose={() => setReviewTarget(null)}
        onCreated={() => {
          setReviewTarget(null);
          refresh();
        }}
      />
    </div>
  );
}

function ReviewStat({ label, value, accent = "text-gh-fg" }) {
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

function ReviewTargetCard({ target, isStaff, onReview }) {
  return (
    <article className="p-4 hover:bg-[#1f2733]/45 transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/assignments/${target.assignment.id}`}
              className="text-[15px] font-semibold text-gh-fg hover:text-gh-accent hover:no-underline"
            >
              {target.assignment.title}
            </Link>
            <span className="rounded-full border border-[#30363d] px-2 py-0.5 text-[11px] text-gh-muted">
              {target.reviewCount} review
            </span>
          </div>
          <div className="text-[12px] text-gh-muted mt-1">
            Автор: {displayName(target.author)} · здано {formatDate(target.submittedAt)}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap text-[12px]">
            {target.repoUrl && <ExternalLink href={target.repoUrl} label="Repo" />}
            {target.prUrl && <ExternalLink href={target.prUrl} label="PR" />}
          </div>
          {target.note && (
            <p className="text-[13px] text-gh-muted line-clamp-2 mt-2">
              {target.note}
            </p>
          )}
        </div>
        {isStaff ? (
          <span className="text-[12px] text-gh-muted">
            {target.myReview ? "є review" : "очікує review"}
          </span>
        ) : (
          <button
            type="button"
            onClick={onReview}
            className="btn-gh btn-gh-primary whitespace-nowrap"
          >
            Написати review
          </button>
        )}
      </div>
    </article>
  );
}

function ExternalLink({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded border border-[#30363d] px-2 py-1 text-gh-accent text-mono hover:no-underline hover:border-[#58a6ff]"
    >
      {label}
    </a>
  );
}

function ReviewList({ title, empty, reviews }) {
  return (
    <section className="bg-[#161b22] border border-[#30363d] rounded-md">
      <div className="px-4 py-3 border-b border-[#30363d]">
        <h3 className="text-[14px] font-semibold text-gh-fg">
          {title}
        </h3>
      </div>
      {reviews.length === 0 ? (
        <div className="p-4 text-[13px] text-gh-muted">
          {empty}
        </div>
      ) : (
        <div className="divide-y divide-[#30363d]">
          {reviews.slice(0, 6).map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewCard({ review }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-gh-fg truncate">
            {review.assignment?.title ?? "Завдання"}
          </div>
          <div className="text-[11px] text-gh-muted mt-0.5">
            {displayName(review.reviewer)} → {displayName(review.author)}
          </div>
        </div>
        <span className="shrink-0 text-[12px] text-mono text-[#d29922]">
          {"★".repeat(review.rating)}
        </span>
      </div>
      <p className="text-[12px] text-gh-muted mt-2 line-clamp-3">
        {review.summary}
      </p>
    </article>
  );
}

function ReviewModal({ open, target, roomId, rewardCoins, onClose, onCreated }) {
  return (
    <Modal open={open} onClose={onClose} title="Написати code review">
      {target && (
        <ReviewForm
          key={target.id}
          target={target}
          roomId={roomId}
          rewardCoins={rewardCoins}
          onClose={onClose}
          onCreated={onCreated}
        />
      )}
    </Modal>
  );
}

function ReviewForm({ target, roomId, rewardCoins, onClose, onCreated }) {
  const [rating, setRating] = useState(5);
  const [summary, setSummary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await roomsApi.createCodeReview(roomId, {
        submissionId: target.id,
        rating: Number(rating),
        summary,
        strengths,
        suggestions,
      });
      onCreated?.();
    } catch (e) {
      setError(e?.message ?? "Не вдалось створити review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-md border border-[#30363d] bg-[#0d1117] p-3 text-[13px]">
        <div className="font-semibold text-gh-fg">
          {target.assignment.title}
        </div>
        <div className="text-gh-muted mt-1">
          Робота: {displayName(target.author)} · бонус +{rewardCoins} коїнів
        </div>
      </div>
      <label className="block">
        <span className="text-[13px] font-semibold text-gh-fg">Оцінка корисності/якості</span>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="input-gh mt-1"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} / 5
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-[13px] font-semibold text-gh-fg">Короткий підсумок</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="input-gh mt-1 min-h-[96px] resize-y"
          maxLength={1200}
          required
          placeholder="Що працює, що варто перевірити, які ризики ти помітив?"
        />
      </label>
      <label className="block">
        <span className="text-[13px] font-semibold text-gh-fg">Сильні сторони</span>
        <textarea
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          className="input-gh mt-1 min-h-[70px] resize-y"
          maxLength={1200}
          placeholder="Що зроблено добре?"
        />
      </label>
      <label className="block">
        <span className="text-[13px] font-semibold text-gh-fg">Що покращити</span>
        <textarea
          value={suggestions}
          onChange={(e) => setSuggestions(e.target.value)}
          className="input-gh mt-1 min-h-[70px] resize-y"
          maxLength={1200}
          placeholder="Конкретні поради без токсичності."
        />
      </label>
      {error && <div className="text-[12px] text-gh-danger">{error}</div>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-gh">
          Скасувати
        </button>
        <button type="submit" disabled={saving} className="btn-gh btn-gh-primary">
          {saving ? "Зберігаємо..." : "Здати review"}
        </button>
      </div>
    </form>
  );
}
