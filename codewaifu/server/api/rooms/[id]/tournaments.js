import { connectToDatabase } from "../../_lib/db.js";
import {
  MiniTournament,
  RoomMember,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";
import {
  createTournamentSchema,
  gradeTournamentSubmissionSchema,
  parseOr400,
  publishTournamentResultsSchema,
  submitTournamentSolutionSchema,
} from "../../_lib/validate.js";

function statusFor(tournament) {
  const now = new Date();
  if (tournament.archived) return "archived";
  if (now < new Date(tournament.startsAt)) return "upcoming";
  if (now <= new Date(tournament.endsAt)) return "active";
  if (tournament.rankingsPublishedAt) return "completed";
  return "review";
}

function publicStudent(user, member) {
  return {
    id: String(user?._id ?? member.userId ?? member),
    name: user?.name ?? null,
    email: user?.email ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    githubLogin: user?.githubLogin ?? null,
  };
}

function publicTask(task) {
  return {
    id: String(task._id),
    title: task.title,
    description: task.description ?? "",
    maxPoints: task.maxPoints ?? 100,
  };
}

function publicSubmission(submission, { task, student, includeGrade }) {
  return {
    id: String(submission._id),
    taskId: String(submission.taskId),
    taskTitle: task?.title ?? "Задача",
    student,
    repoUrl: submission.repoUrl ?? "",
    prUrl: submission.prUrl ?? "",
    note: submission.note ?? "",
    submittedAt: submission.submittedAt,
    gradedAt: submission.gradedAt ?? null,
    points: includeGrade ? submission.points ?? 0 : null,
    maxPoints: task?.maxPoints ?? 100,
    feedback: includeGrade ? submission.feedback ?? "" : "",
    status: submission.gradedAt ? "graded" : "submitted",
  };
}

async function loadMembers(roomId) {
  const members = await RoomMember()
    .find({ roomId, roleInRoom: "student" })
    .lean();
  const studentIds = members.map((member) => member.userId);
  const users = studentIds.length
    ? await User()
        .find(
          { _id: { $in: studentIds } },
          { name: 1, email: 1, avatarUrl: 1, githubLogin: 1 },
        )
        .lean()
    : [];
  return {
    members,
    userById: new Map(users.map((user) => [String(user._id), user])),
  };
}

function buildStandings(tournament, members, userById) {
  const tasks = tournament.tasks ?? [];
  const submissions = tournament.submissions ?? [];
  const maxScore = tasks.reduce((sum, task) => sum + (task.maxPoints ?? 100), 0);

  const rows = members.map((member) => {
    const studentId = String(member.userId);
    const own = submissions.filter((submission) => String(submission.studentId) === studentId);
    const graded = own.filter((submission) => submission.gradedAt);
    const score = graded.reduce((sum, submission) => sum + (submission.points ?? 0), 0);
    const solved = graded.filter((submission) => (submission.points ?? 0) > 0).length;
    return {
      student: publicStudent(userById.get(studentId), member),
      score,
      maxScore,
      solved,
      submitted: new Set(own.map((submission) => String(submission.taskId))).size,
      graded: graded.length,
    };
  });

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.solved !== a.solved) return b.solved - a.solved;
    return (a.student.name ?? a.student.email ?? "").localeCompare(
      b.student.name ?? b.student.email ?? "",
      "uk",
    );
  });
  return rows;
}

function taskStats(tournament) {
  return (tournament.tasks ?? []).map((task) => {
    const submissions = (tournament.submissions ?? []).filter(
      (submission) => String(submission.taskId) === String(task._id),
    );
    return {
      taskId: String(task._id),
      submissions: submissions.length,
      graded: submissions.filter((submission) => submission.gradedAt).length,
    };
  });
}

function publicTournament(tournament, { isStaff, currentUserId, members, userById }) {
  const status = statusFor(tournament);
  const resultsPublished = Boolean(tournament.rankingsPublishedAt);
  const standingsVisible = resultsPublished || (isStaff && !["upcoming", "active"].includes(status));
  const standings = buildStandings(tournament, members, userById);
  const tasks = (tournament.tasks ?? []).map(publicTask);
  const submissions = tournament.submissions ?? [];
  const taskById = new Map((tournament.tasks ?? []).map((task) => [String(task._id), task]));
  const userSubmissionRows = submissions
    .filter((submission) => String(submission.studentId) === String(currentUserId))
    .map((submission) =>
      publicSubmission(submission, {
        task: taskById.get(String(submission.taskId)),
        student: publicStudent(userById.get(String(submission.studentId)), submission.studentId),
        includeGrade: resultsPublished,
      }),
    );
  const staffSubmissionRows = isStaff
    ? submissions
        .slice()
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .map((submission) =>
          publicSubmission(submission, {
            task: taskById.get(String(submission.taskId)),
            student: publicStudent(userById.get(String(submission.studentId)), submission.studentId),
            includeGrade: true,
          }),
        )
    : [];
  const pendingCount = submissions.filter((submission) => !submission.gradedAt).length;

  return {
    id: String(tournament._id),
    kind: tournament.kind ?? "code_contest",
    title: tournament.title,
    description: tournament.description ?? "",
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    reward: tournament.reward ?? "",
    status,
    tasks,
    taskStats: taskStats(tournament),
    resultsPublished,
    rankingsPublishedAt: tournament.rankingsPublishedAt ?? null,
    reviewCompletedAt: tournament.reviewCompletedAt ?? null,
    standingsVisible,
    standings: standingsVisible ? standings : [],
    leader: standingsVisible ? standings[0] ?? null : null,
    participants: standings.filter((row) => row.submitted > 0).length,
    submissionsCount: submissions.length,
    gradedCount: submissions.length - pendingCount,
    pendingCount,
    mySubmissions: userSubmissionRows,
    submissions: staffSubmissionRows,
    canSubmit: status === "active",
    canPublish: isStaff && status === "review" && pendingCount === 0,
    createdAt: tournament.createdAt,
  };
}

async function publicContestResponse(tournament, req, room, isStaff) {
  const { members, userById } = await loadMembers(room._id);
  return publicTournament(tournament.toObject ? tournament.toObject() : tournament, {
    isStaff,
    currentUserId: req.user._id,
    members,
    userById,
  });
}

async function listTournaments(req, res, room, isStaff) {
  const tournaments = await MiniTournament()
    .find({ roomId: room._id, archived: false, kind: "code_contest" })
    .sort({ startsAt: -1, createdAt: -1 })
    .lean();
  const { members, userById } = await loadMembers(room._id);
  return res.status(200).json({
    tournaments: tournaments.map((tournament) =>
      publicTournament(tournament, {
        isStaff,
        currentUserId: req.user._id,
        members,
        userById,
      }),
    ),
  });
}

async function createTournament(req, res, room) {
  const body = parseOr400(res, createTournamentSchema, req.body);
  if (!body) return;

  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  const endsAt = new Date(body.endsAt);
  if (endsAt <= startsAt) {
    return res.status(400).json({ error: "Дедлайн має бути після старту" });
  }

  const tournament = await MiniTournament().create({
    roomId: room._id,
    authorId: req.user._id,
    kind: "code_contest",
    title: body.title,
    description: body.description ?? "",
    metric: "points",
    startsAt,
    endsAt,
    reward: body.reward ?? "",
    tasks: body.tasks,
  });

  return res.status(201).json({
    tournament: await publicContestResponse(tournament, req, room, true),
  });
}

async function submitSolution(req, res, room, membership) {
  if (membership.roleInRoom !== "student") {
    return res.status(403).json({ error: "Рішення здають тільки студенти" });
  }
  const body = parseOr400(res, submitTournamentSolutionSchema, req.body);
  if (!body) return;
  if (!body.repoUrl && !body.prUrl) {
    return res.status(400).json({ error: "Додай repo або PR URL" });
  }

  const tournament = await MiniTournament().findOne({
    _id: body.tournamentId,
    roomId: room._id,
    archived: false,
    kind: "code_contest",
  });
  if (!tournament) {
    return res.status(404).json({ error: "Contest не знайдено" });
  }
  if (tournament.rankingsPublishedAt) {
    return res.status(409).json({ error: "Contest уже завершено" });
  }

  const now = new Date();
  if (now < new Date(tournament.startsAt)) {
    return res.status(400).json({ error: "Contest ще не стартував" });
  }
  if (now > new Date(tournament.endsAt)) {
    return res.status(403).json({ error: "Дедлайн уже минув" });
  }

  const task = tournament.tasks.id(body.taskId);
  if (!task) {
    return res.status(404).json({ error: "Задачу не знайдено" });
  }

  const existing = tournament.submissions.find(
    (submission) =>
      String(submission.taskId) === String(task._id) &&
      String(submission.studentId) === String(req.user._id),
  );
  if (existing) {
    existing.repoUrl = body.repoUrl ?? "";
    existing.prUrl = body.prUrl ?? "";
    existing.note = body.note ?? "";
    existing.submittedAt = now;
    existing.points = null;
    existing.feedback = "";
    existing.gradedAt = null;
    existing.gradedById = null;
  } else {
    tournament.submissions.push({
      taskId: task._id,
      studentId: req.user._id,
      repoUrl: body.repoUrl ?? "",
      prUrl: body.prUrl ?? "",
      note: body.note ?? "",
      submittedAt: now,
    });
  }

  await tournament.save();
  return res.status(200).json({
    tournament: await publicContestResponse(tournament, req, room, false),
  });
}

async function gradeSubmission(req, res, room, isStaff) {
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладачі перевіряють contest" });
  }
  const body = parseOr400(res, gradeTournamentSubmissionSchema, req.body);
  if (!body) return;

  const tournament = await MiniTournament().findOne({
    _id: body.tournamentId,
    roomId: room._id,
    archived: false,
    kind: "code_contest",
  });
  if (!tournament) {
    return res.status(404).json({ error: "Contest не знайдено" });
  }
  if (new Date() <= new Date(tournament.endsAt)) {
    return res.status(400).json({ error: "Перевірка відкриється після дедлайну" });
  }
  if (tournament.rankingsPublishedAt) {
    return res.status(409).json({ error: "Рейтинг уже відкрито" });
  }

  const task = tournament.tasks.id(body.taskId);
  if (!task) {
    return res.status(404).json({ error: "Задачу не знайдено" });
  }
  const submission = tournament.submissions.find(
    (item) =>
      String(item.taskId) === String(task._id) &&
      String(item.studentId) === String(body.studentId),
  );
  if (!submission) {
    return res.status(404).json({ error: "Сабмішн не знайдено" });
  }

  submission.points = Math.min(body.points, task.maxPoints ?? 100);
  submission.feedback = body.feedback ?? "";
  submission.gradedAt = new Date();
  submission.gradedById = req.user._id;
  await tournament.save();

  return res.status(200).json({
    tournament: await publicContestResponse(tournament, req, room, true),
  });
}

async function publishResults(req, res, room, isStaff) {
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладачі відкривають рейтинг" });
  }
  const body = parseOr400(res, publishTournamentResultsSchema, req.body);
  if (!body) return;

  const tournament = await MiniTournament().findOne({
    _id: body.tournamentId,
    roomId: room._id,
    archived: false,
    kind: "code_contest",
  });
  if (!tournament) {
    return res.status(404).json({ error: "Contest не знайдено" });
  }
  if (new Date() <= new Date(tournament.endsAt)) {
    return res.status(400).json({ error: "Рейтинг можна відкрити після дедлайну" });
  }

  const pendingCount = tournament.submissions.filter((submission) => !submission.gradedAt).length;
  if (pendingCount > 0) {
    return res.status(409).json({ error: `Ще не перевірено: ${pendingCount}` });
  }

  const now = new Date();
  tournament.reviewCompletedAt = tournament.reviewCompletedAt ?? now;
  tournament.rankingsPublishedAt = tournament.rankingsPublishedAt ?? now;
  await tournament.save();

  return res.status(200).json({
    tournament: await publicContestResponse(tournament, req, room, true),
  });
}

async function deleteTournament(req, res, room, isStaff) {
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладачі видаляють contest" });
  }
  const id = req.body?.id;
  if (!id) {
    return res.status(400).json({ error: "Contest id обов'язковий" });
  }
  const result = await MiniTournament().updateOne(
    { _id: id, roomId: room._id },
    { $set: { archived: true } },
  );
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Contest не знайдено" });
  }
  return res.status(200).json({ ok: true, deleted: true });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();

  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;
  const membership = await getMembership(room._id, req.user._id);
  if (!membership) {
    return res.status(403).json({ error: "Ти не учасник цієї кімнати" });
  }

  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    ["teacher", "co_teacher"].includes(membership.roleInRoom);

  if (req.method === "GET") return listTournaments(req, res, room, isStaff);
  if (req.method === "POST") {
    if (req.body?.action === "submit_solution") {
      return submitSolution(req, res, room, membership);
    }
    if (req.body?.action === "grade_submission") {
      return gradeSubmission(req, res, room, isStaff);
    }
    if (req.body?.action === "publish_results") {
      return publishResults(req, res, room, isStaff);
    }
    if (!isStaff) {
      return res.status(403).json({ error: "Тільки викладачі створюють contest" });
    }
    return createTournament(req, res, room);
  }
  if (req.method === "DELETE") return deleteTournament(req, res, room, isStaff);

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
});
