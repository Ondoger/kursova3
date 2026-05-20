import { connectToDatabase } from "../../_lib/db.js";
import {
  Assignment,
  Grade,
  PointsLedger,
  RoomMember,
  Submission,
  User,
  WeeklyChallenge,
  WeeklyChallengeSubmission,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";
import {
  approveKnowledgeSharingSchema,
  createWeeklyChallengeSchema,
  parseOr400,
  submitKnowledgeSharingSchema,
} from "../../_lib/validate.js";

const METRICS = {
  points: { label: "Набрати балів", suffix: "б" },
  submissions: { label: "Здати робіт", suffix: "" },
  graded: { label: "Отримати оцінок", suffix: "" },
  activity: { label: "Зробити активностей", suffix: "" },
};

function knowledgeRewardCoins(challenge) {
  if (challenge?.rewardCoins !== undefined && challenge?.rewardCoins !== null) {
    const explicit = Number(challenge.rewardCoins);
    if (Number.isFinite(explicit) && explicit >= 0) return Math.round(explicit);
  }

  const rewardText = String(challenge?.reward ?? "");
  if (!/(coin|coins|коїн|коін|монет)/iu.test(rewardText)) return 0;
  const match = rewardText.match(/(\d+)/u);
  return match ? Number(match[1]) : 0;
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function endOfWeek(start) {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + 7);
  d.setMilliseconds(d.getMilliseconds() - 1);
  return d;
}

function inRange(date, start, end) {
  if (!date) return false;
  const t = new Date(date);
  return t >= start && t <= end;
}

function statusFor(challenge) {
  const now = new Date();
  if (challenge.archived) return "archived";
  if (now < new Date(challenge.weekStart)) return "upcoming";
  if (now > new Date(challenge.weekEnd)) return "ended";
  return "active";
}

function publicStudent(user, member) {
  return {
    id: String(user?._id ?? member.userId),
    name: user?.name ?? null,
    email: user?.email ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    githubLogin: user?.githubLogin ?? null,
  };
}

function scoreStudent({ metric, studentId, start, end, submissions, grades, submissionById }) {
  if (metric === "points") {
    return grades.reduce((sum, grade) => {
      if (!inRange(grade.gradedAt ?? grade.createdAt, start, end)) return sum;
      const submission = submissionById.get(String(grade.submissionId));
      if (String(submission?.studentId) !== studentId) return sum;
      return sum + (grade.points ?? 0);
    }, 0);
  }

  const ownSubmissions = submissions.filter((submission) => String(submission.studentId) === studentId);
  const submitted = ownSubmissions.filter((submission) =>
    inRange(submission.submittedAt, start, end) ||
    inRange(submission.resubmittedAfterReturnAt, start, end),
  ).length;
  if (metric === "submissions") return submitted;

  const graded = grades.filter((grade) => {
    if (!inRange(grade.gradedAt ?? grade.createdAt, start, end)) return false;
    const submission = submissionById.get(String(grade.submissionId));
    return String(submission?.studentId) === studentId;
  }).length;
  if (metric === "graded") return graded;
  return submitted + graded;
}

async function buildProgress(roomId, challenges, currentUserId) {
  if (challenges.length === 0) return new Map();

  const [members, assignments] = await Promise.all([
    RoomMember().find({ roomId, roleInRoom: "student" }).lean(),
    Assignment().find({ roomId, publishedAt: { $ne: null } }).lean(),
  ]);
  const assignmentIds = assignments.map((a) => a._id);
  const studentIds = members.map((m) => m.userId);
  const [users, submissions] = await Promise.all([
    studentIds.length
      ? User()
          .find(
            { _id: { $in: studentIds } },
            { name: 1, email: 1, avatarUrl: 1, githubLogin: 1 },
          )
          .lean()
      : [],
    assignmentIds.length
      ? Submission().find({ assignmentId: { $in: assignmentIds } }).lean()
      : [],
  ]);
  const grades = submissions.length
    ? await Grade()
        .find({ submissionId: { $in: submissions.map((s) => s._id) } })
        .lean()
    : [];

  const userById = new Map(users.map((user) => [String(user._id), user]));
  const submissionById = new Map(submissions.map((s) => [String(s._id), s]));
  const challengeIds = challenges.map((challenge) => challenge._id);
  const knowledgeSubmissions = challengeIds.length
    ? await WeeklyChallengeSubmission()
        .find({ challengeId: { $in: challengeIds } })
        .lean()
    : [];
  const knowledgeByChallengeStudent = new Map(
    knowledgeSubmissions.map((submission) => [
      `${String(submission.challengeId)}:${String(submission.studentId)}`,
      submission,
    ]),
  );
  const byChallenge = new Map();

  for (const challenge of challenges) {
    const start = new Date(challenge.weekStart);
    const end = new Date(challenge.weekEnd);
    const rows = members.map((member) => {
      const studentId = String(member.userId);
      const knowledgeSubmission = knowledgeByChallengeStudent.get(`${String(challenge._id)}:${studentId}`);
      const approved = Boolean(knowledgeSubmission?.approvedAt);
      const progress =
        challenge.type === "knowledge_sharing"
          ? approved
            ? 1
            : 0
          : scoreStudent({
              metric: challenge.metric,
              studentId,
              start,
              end,
              submissions,
              grades,
              submissionById,
            });
      return {
        student: publicStudent(userById.get(studentId), member),
        progress,
        percent: Math.min(100, Math.round((progress / challenge.target) * 100)),
        completed: progress >= challenge.target,
        isMe: String(currentUserId) === studentId,
        submission: knowledgeSubmission
          ? {
              id: String(knowledgeSubmission._id),
              fileName: knowledgeSubmission.fileName,
              mime: knowledgeSubmission.mime,
              size: knowledgeSubmission.size,
              dataUrl: knowledgeSubmission.dataUrl,
              note: knowledgeSubmission.note ?? "",
              submittedAt: knowledgeSubmission.submittedAt,
              approvedAt: knowledgeSubmission.approvedAt ?? null,
              approvedById: knowledgeSubmission.approvedById
                ? String(knowledgeSubmission.approvedById)
                : null,
              awardedCoins: knowledgeSubmission.awardedCoins ?? 0,
            }
          : null,
      };
    });
    rows.sort((a, b) => {
      if (Number(b.completed) !== Number(a.completed)) return Number(b.completed) - Number(a.completed);
      if (b.progress !== a.progress) return b.progress - a.progress;
      return (a.student.name ?? a.student.email ?? "").localeCompare(
        b.student.name ?? b.student.email ?? "",
        "uk",
      );
    });
    byChallenge.set(String(challenge._id), rows);
  }
  return byChallenge;
}

function publicChallenge(challenge, rows, { isStaff } = {}) {
  const completed = rows.filter((row) => row.completed).length;
  return {
    id: String(challenge._id),
    type: challenge.type ?? "metric",
    title: challenge.title,
    description: challenge.description ?? "",
    topic: challenge.topic ?? "",
    metric: challenge.metric,
    metricLabel: METRICS[challenge.metric]?.label ?? challenge.metric,
    metricSuffix: METRICS[challenge.metric]?.suffix ?? "",
    target: challenge.target,
    weekStart: challenge.weekStart,
    weekEnd: challenge.weekEnd,
    reward: challenge.reward ?? "",
    rewardCoins: knowledgeRewardCoins(challenge),
    status: statusFor(challenge),
    completedCount: completed,
    participants: rows.length,
    myProgress: rows.find((row) => row.isMe) ?? null,
    top: challenge.type === "knowledge_sharing" ? [] : rows.slice(0, 5),
    submissions: isStaff && challenge.type === "knowledge_sharing"
      ? rows.filter((row) => row.submission)
      : [],
    createdAt: challenge.createdAt,
  };
}

async function listChallenges(req, res, room, isStaff) {
  const challenges = await WeeklyChallenge()
    .find({ roomId: room._id, archived: false })
    .sort({ weekStart: -1, createdAt: -1 })
    .lean();
  const progressByChallenge = await buildProgress(room._id, challenges, req.user._id);
  return res.status(200).json({
    metrics: Object.entries(METRICS).map(([key, meta]) => ({ key, ...meta })),
    challenges: challenges.map((challenge) =>
      publicChallenge(
        challenge,
        progressByChallenge.get(String(challenge._id)) ?? [],
        { isStaff },
      ),
    ),
  });
}

async function createChallenge(req, res, room) {
  const body = parseOr400(res, createWeeklyChallengeSchema, req.body);
  if (!body) return;

  const weekStart = startOfWeek(body.weekStart ? new Date(body.weekStart) : new Date());
  const challenge = await WeeklyChallenge().create({
    roomId: room._id,
    authorId: req.user._id,
    title: body.title,
    description: body.description ?? "",
    type: body.type,
    topic: body.topic ?? "",
    metric: body.type === "knowledge_sharing" ? "activity" : body.metric,
    target: body.type === "knowledge_sharing" ? 1 : body.target,
    weekStart,
    weekEnd: endOfWeek(weekStart),
    reward: body.reward ?? "",
    rewardCoins: body.rewardCoins,
  });

  const progressByChallenge = await buildProgress(room._id, [challenge], req.user._id);
  return res.status(201).json({
    challenge: publicChallenge(
      challenge.toObject(),
      progressByChallenge.get(String(challenge._id)) ?? [],
      { isStaff: true },
    ),
  });
}

async function approveKnowledge(req, res, room, isStaff) {
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладачі можуть approve-ити weekly challenge" });
  }

  const body = parseOr400(res, approveKnowledgeSharingSchema, req.body);
  if (!body) return;

  const challenge = await WeeklyChallenge().findOne({
    _id: body.challengeId,
    roomId: room._id,
    archived: false,
    type: "knowledge_sharing",
  });
  if (!challenge) {
    return res.status(404).json({ error: "Knowledge sharing quest не знайдено" });
  }

  const rewardCoins = knowledgeRewardCoins(challenge);
  const approvedAt = new Date();
  let submission = await WeeklyChallengeSubmission().findOneAndUpdate(
    {
      challengeId: challenge._id,
      studentId: body.studentId,
      approvedAt: null,
    },
    {
      $set: {
        approvedAt,
        approvedById: req.user._id,
        awardedCoins: rewardCoins,
      },
    },
    { returnDocument: "after" },
  );
  const awardedNow = Boolean(submission);

  if (!submission) {
    submission = await WeeklyChallengeSubmission().findOne({
      challengeId: challenge._id,
      studentId: body.studentId,
    });
  }
  if (!submission) {
    return res.status(404).json({ error: "Сабмішн для approve не знайдено" });
  }

  if (awardedNow && rewardCoins !== 0) {
    await PointsLedger().create({
      userId: submission.studentId,
      roomId: room._id,
      delta: rewardCoins,
      kind: "bonus",
      reason: `Weekly challenge "${challenge.title}"`,
      refType: "weekly_challenge_submission",
      refId: submission._id,
    });
    await RoomMember().updateOne(
      { roomId: room._id, userId: submission.studentId },
      { $inc: { coins: rewardCoins, xp: rewardCoins } },
    );
    await User().updateOne(
      { _id: submission.studentId },
      { $inc: { "totals.coins": rewardCoins, "totals.xp": rewardCoins } },
    );
  }

  const progressByChallenge = await buildProgress(room._id, [challenge], req.user._id);
  return res.status(200).json({
    challenge: publicChallenge(
      challenge.toObject(),
      progressByChallenge.get(String(challenge._id)) ?? [],
      { isStaff: true },
    ),
    reward: {
      awardedNow,
      coins: awardedNow ? rewardCoins : 0,
    },
  });
}

async function submitKnowledge(req, res, room, membership) {
  const body = parseOr400(res, submitKnowledgeSharingSchema, req.body);
  if (!body) return;
  if (membership.roleInRoom !== "student") {
    return res.status(403).json({ error: "Презентацію здають тільки студенти" });
  }

  const challenge = await WeeklyChallenge().findOne({
    _id: body.challengeId,
    roomId: room._id,
    archived: false,
    type: "knowledge_sharing",
  });
  if (!challenge) {
    return res.status(404).json({ error: "Knowledge sharing quest не знайдено" });
  }

  const allowed = new Set([
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]);
  if (!allowed.has(body.mime)) {
    return res.status(400).json({ error: "Завантаж PDF, PPT або PPTX презентацію" });
  }

  const existingSubmission = await WeeklyChallengeSubmission().findOne({
    challengeId: challenge._id,
    studentId: req.user._id,
  });
  if (existingSubmission?.approvedAt) {
    return res.status(409).json({ error: "Роботу вже зараховано викладачем" });
  }

  await WeeklyChallengeSubmission().findOneAndUpdate(
    { challengeId: challenge._id, studentId: req.user._id },
    {
      $set: {
        fileName: body.fileName,
        mime: body.mime,
        size: body.size,
        dataUrl: body.dataUrl,
        note: body.note ?? "",
        submittedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  const progressByChallenge = await buildProgress(room._id, [challenge], req.user._id);
  return res.status(200).json({
    challenge: publicChallenge(
      challenge.toObject(),
      progressByChallenge.get(String(challenge._id)) ?? [],
      { isStaff: false },
    ),
  });
}

async function deleteChallenge(req, res, room, isStaff) {
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладачі видаляють weekly challenges" });
  }
  const id = req.body?.id;
  if (!id) {
    return res.status(400).json({ error: "Challenge id обов'язковий" });
  }
  const result = await WeeklyChallenge().updateOne(
    { _id: id, roomId: room._id },
    { $set: { archived: true } },
  );
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Challenge не знайдено" });
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

  if (req.method === "GET") return listChallenges(req, res, room, isStaff);
  if (req.method === "POST") {
    if (req.body?.action === "submit_knowledge") {
      return submitKnowledge(req, res, room, membership);
    }
    if (req.body?.action === "approve_knowledge") {
      return approveKnowledge(req, res, room, isStaff);
    }
    if (!isStaff) {
      return res.status(403).json({ error: "Тільки викладачі створюють weekly challenges" });
    }
    return createChallenge(req, res, room);
  }
  if (req.method === "DELETE") return deleteChallenge(req, res, room, isStaff);

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
});
