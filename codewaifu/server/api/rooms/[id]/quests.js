import { connectToDatabase } from "../../_lib/db.js";
import { Assignment, Grade, Submission } from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";
import {
  fetchPrSummary,
  fetchRepoAutocheck,
  fetchRepoSummary,
  parseRepoUrl,
} from "../../_lib/github-repo.js";

function quest(id, title, description, completed, progress, target, meta = {}) {
  return {
    id,
    title,
    description,
    completed,
    progress,
    target,
    percent: target ? Math.min(100, Math.round((progress / target) * 100)) : 0,
    ...meta,
  };
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectToDatabase();
  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;

  const membership = await getMembership(room._id, req.user._id);
  if (!membership) {
    return res.status(403).json({ error: "Ти не учасник цієї кімнати" });
  }

  const assignments = await Assignment()
    .find({ roomId: room._id, publishedAt: { $ne: null } })
    .sort({ createdAt: -1 })
    .lean();
  const assignmentIds = assignments.map((a) => a._id);
  const assignmentById = new Map(assignments.map((a) => [String(a._id), a]));
  const submissions = assignmentIds.length
    ? await Submission()
        .find({ assignmentId: { $in: assignmentIds }, studentId: req.user._id })
        .lean()
    : [];
  const grades = submissions.length
    ? await Grade().find({ submissionId: { $in: submissions.map((s) => s._id) } }).lean()
    : [];
  const gradeBySubId = new Map(grades.map((g) => [String(g.submissionId), g]));

  let maxCommitCount = 0;
  let hasReadme = false;
  let githubError = null;
  const checkedSubs = submissions
    .filter((s) => s.repoUrl || s.prUrl)
    .slice(0, 5);

  for (const s of checkedSubs) {
    try {
      const parsed = parseRepoUrl(s.prUrl || s.repoUrl);
      const assignment = assignmentById.get(String(s.assignmentId));
      if (!parsed || !assignment) continue;
      const since =
        assignment.publishedAt?.toISOString?.() ??
        assignment.createdAt?.toISOString?.();
      const [repo, pr] = await Promise.all([
        fetchRepoSummary({ owner: parsed.owner, repo: parsed.repo, since }),
        parsed.prNumber
          ? fetchPrSummary({
              owner: parsed.owner,
              repo: parsed.repo,
              prNumber: parsed.prNumber,
            })
          : Promise.resolve(null),
      ]);
      if (!repo) continue;
      const autocheck = await fetchRepoAutocheck({
        owner: parsed.owner,
        repo: parsed.repo,
        assignment,
        submission: s,
        repoSummary: repo,
        pr,
      });
      maxCommitCount = Math.max(maxCommitCount, autocheck.summary.commitCount);
      hasReadme = hasReadme || autocheck.summary.hasReadme;
    } catch (e) {
      githubError = e instanceof Error ? e.message : "GitHub check failed";
      break;
    }
  }

  const submitted = submissions.filter((s) => s.status !== "draft");
  const onTime = submitted.filter((s) => {
    const assignment = assignmentById.get(String(s.assignmentId));
    if (!assignment?.deadlineAt || !s.submittedAt) return false;
    return new Date(s.submittedAt) <= new Date(assignment.deadlineAt);
  });
  const fixedAfterFeedback = submissions.filter((s) => s.resubmittedAfterReturnAt);
  const highGrades = submissions.filter((s) => {
    const assignment = assignmentById.get(String(s.assignmentId));
    const grade = gradeBySubId.get(String(s._id));
    if (!assignment || !grade) return false;
    return grade.points / (assignment.maxPoints || 100) >= 0.9;
  });

  const quests = [
    quest(
      "first-submit",
      "Перший сабмішн",
      "Здай хоча б одне завдання.",
      submitted.length > 0,
      submitted.length > 0 ? 1 : 0,
      1,
    ),
    quest(
      "on-time",
      "До дедлайну",
      "Здай будь-яке завдання до дедлайну.",
      onTime.length > 0,
      onTime.length > 0 ? 1 : 0,
      1,
    ),
    quest(
      "five-commits",
      "5 комітів",
      "Зроби 5+ комітів після видачі завдання.",
      maxCommitCount >= 5,
      maxCommitCount,
      5,
      githubError ? { warning: githubError } : {},
    ),
    quest(
      "readme",
      "README є",
      "Додай README.md у репозиторій.",
      hasReadme,
      hasReadme ? 1 : 0,
      1,
      githubError ? { warning: githubError } : {},
    ),
    quest(
      "fixed-feedback",
      "Пофіксив після фідбеку",
      "Перездай завдання після повернення на доопрацювання.",
      fixedAfterFeedback.length > 0,
      fixedAfterFeedback.length > 0 ? 1 : 0,
      1,
    ),
    quest(
      "high-score",
      "90%+",
      "Отримай оцінку не менше 90%.",
      highGrades.length > 0,
      highGrades.length > 0 ? 1 : 0,
      1,
    ),
    quest(
      "all-submit",
      "Все здано",
      "Здай усі опубліковані завдання в класі.",
      assignments.length > 0 && submitted.length >= assignments.length,
      submitted.length,
      Math.max(1, assignments.length),
    ),
  ];

  return res.status(200).json({
    quests,
    stats: {
      assignments: assignments.length,
      submitted: submitted.length,
      onTime: onTime.length,
      maxCommitCount,
      hasReadme,
      githubChecked: checkedSubs.length,
    },
  });
});
