import { connectToDatabase } from "../../_lib/db.js";
import {
  Assignment,
  Grade,
  RoomMember,
  Submission,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function buildActivityHeatmap({ submissions, grades, submissionById }) {
  const weeks = 12;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = today.getUTCDay();
  const lastSunday = new Date(today);
  lastSunday.setUTCDate(today.getUTCDate() - dayOfWeek);

  const rows = new Map();
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(lastSunday);
      date.setUTCDate(lastSunday.getUTCDate() - (weeks - 1 - w) * 7 + d);
      rows.set(dayKey(date), {
        date: dayKey(date),
        submitted: 0,
        graded: 0,
        total: 0,
        studentIds: new Set(),
      });
    }
  }

  const addEvent = (date, studentId, field) => {
    if (!date) return;
    const row = rows.get(dayKey(date));
    if (!row) return;
    row[field] += 1;
    row.total += 1;
    if (studentId) row.studentIds.add(String(studentId));
  };

  for (const s of submissions) {
    addEvent(s.submittedAt, s.studentId, "submitted");
    if (
      s.resubmittedAfterReturnAt &&
      dayKey(s.resubmittedAfterReturnAt) !== dayKey(s.submittedAt)
    ) {
      addEvent(s.resubmittedAfterReturnAt, s.studentId, "submitted");
    }
  }
  for (const g of grades) {
    const submission = submissionById.get(String(g.submissionId));
    addEvent(g.gradedAt ?? g.createdAt, submission?.studentId, "graded");
  }

  const days = [...rows.values()].map((row) => ({
    date: row.date,
    submitted: row.submitted,
    graded: row.graded,
    total: row.total,
    activeStudents: row.studentIds.size,
  }));

  return {
    weeks,
    days,
    max: Math.max(0, ...days.map((row) => row.total)),
    total: days.reduce((sum, row) => sum + row.total, 0),
    activeDays: days.filter((row) => row.total > 0).length,
  };
}

function publicStudent(user, member) {
  return {
    id: String(user?._id ?? member.userId),
    name: user?.name ?? null,
    email: user?.email ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    githubLogin: user?.githubLogin ?? null,
    coins: member.coins ?? 0,
    xp: member.xp ?? 0,
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
  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    ["teacher", "co_teacher"].includes(membership?.roleInRoom);
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладачі бачать аналітику" });
  }

  const [assignments, members] = await Promise.all([
    Assignment().find({ roomId: room._id }).sort({ createdAt: -1 }).lean(),
    RoomMember().find({ roomId: room._id, roleInRoom: "student" }).lean(),
  ]);

  const assignmentIds = assignments.map((a) => a._id);
  const studentIds = members.map((m) => m.userId);
  const [submissions, users] = await Promise.all([
    assignmentIds.length
      ? Submission().find({ assignmentId: { $in: assignmentIds } }).lean()
      : [],
    studentIds.length
      ? User()
          .find(
            { _id: { $in: studentIds } },
            { name: 1, email: 1, avatarUrl: 1, githubLogin: 1 },
          )
          .lean()
      : [],
  ]);

  const subIds = submissions.map((s) => s._id);
  const grades = subIds.length
    ? await Grade().find({ submissionId: { $in: subIds } }).lean()
    : [];

  const userById = new Map(users.map((u) => [String(u._id), u]));
  const assignmentById = new Map(assignments.map((a) => [String(a._id), a]));
  const submissionById = new Map(submissions.map((s) => [String(s._id), s]));
  const gradeBySubId = new Map(grades.map((g) => [String(g.submissionId), g]));
  const publishedAssignments = assignments.filter((a) => a.publishedAt);
  const publishedIds = new Set(publishedAssignments.map((a) => String(a._id)));
  const submittedByStudent = new Map();

  for (const s of submissions) {
    if (!publishedIds.has(String(s.assignmentId))) continue;
    const key = String(s.studentId);
    if (!submittedByStudent.has(key)) submittedByStudent.set(key, []);
    submittedByStudent.get(key).push(s);
  }

  const students = members.map((m) => {
    const id = String(m.userId);
    const subs = submittedByStudent.get(id) ?? [];
    const gradedSubs = subs.filter((s) => s.status === "graded");
    const gradePoints = gradedSubs.reduce((sum, s) => {
      const grade = gradeBySubId.get(String(s._id));
      return sum + (grade?.points ?? 0);
    }, 0);
    const maxPoints = gradedSubs.reduce((sum, s) => {
      const a = assignmentById.get(String(s.assignmentId));
      return sum + (a?.maxPoints ?? 100);
    }, 0);
    return {
      student: publicStudent(userById.get(id), m),
      submitted: subs.length,
      graded: gradedSubs.length,
      missing: Math.max(0, publishedAssignments.length - subs.length),
      avgPercent: maxPoints ? Math.round((gradePoints / maxPoints) * 100) : null,
      lastActivityAt:
        subs
          .map((s) => s.submittedAt ?? s.updatedAt)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] ?? null,
    };
  });

  const activityMap = new Map();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    activityMap.set(dayKey(d), { date: dayKey(d), submitted: 0, graded: 0 });
  }
  for (const s of submissions) {
    if (!s.submittedAt) continue;
    const row = activityMap.get(dayKey(s.submittedAt));
    if (row) row.submitted += 1;
  }
  for (const g of grades) {
    const row = activityMap.get(dayKey(g.gradedAt ?? g.createdAt));
    if (row) row.graded += 1;
  }

  const queue = submissions
    .filter((s) => s.status === "submitted")
    .map((s) => {
      const a = assignmentById.get(String(s.assignmentId));
      const u = userById.get(String(s.studentId));
      return {
        id: String(s._id),
        assignmentId: String(s.assignmentId),
        assignmentTitle: a?.title ?? "Завдання",
        maxPoints: a?.maxPoints ?? 100,
        rewardCoins: a?.rewardCoins ?? a?.maxPoints ?? 100,
        submittedAt: s.submittedAt,
        repoUrl: s.repoUrl ?? null,
        prUrl: s.prUrl ?? null,
        student: {
          id: String(s.studentId),
          name: u?.name ?? null,
          email: u?.email ?? null,
          avatarUrl: u?.avatarUrl ?? null,
          githubLogin: u?.githubLogin ?? null,
        },
      };
    })
    .sort((a, b) => new Date(a.submittedAt ?? 0) - new Date(b.submittedAt ?? 0));

  const submissionsByAssignment = new Map();
  for (const s of submissions) {
    const key = String(s.assignmentId);
    if (!submissionsByAssignment.has(key)) submissionsByAssignment.set(key, new Set());
    submissionsByAssignment.get(key).add(String(s.studentId));
  }
  const missingByAssignment = publishedAssignments.slice(0, 8).map((a) => {
    const submittedIds = submissionsByAssignment.get(String(a._id)) ?? new Set();
    const missing = members
      .filter((m) => !submittedIds.has(String(m.userId)))
      .map((m) => publicStudent(userById.get(String(m.userId)), m));
    return {
      assignmentId: String(a._id),
      title: a.title,
      deadlineAt: a.deadlineAt ?? null,
      missing,
      missingCount: missing.length,
    };
  });

  return res.status(200).json({
    totals: {
      students: members.length,
      assignments: assignments.length,
      publishedAssignments: publishedAssignments.length,
      drafts: assignments.length - publishedAssignments.length,
      submissions: submissions.filter((s) => publishedIds.has(String(s.assignmentId))).length,
      graded: submissions.filter((s) => s.status === "graded").length,
      queue: queue.length,
      missing: students.reduce((sum, row) => sum + row.missing, 0),
    },
    activity: [...activityMap.values()],
    activityHeatmap: buildActivityHeatmap({
      submissions,
      grades,
      submissionById,
    }),
    students,
    queue,
    missingByAssignment,
  });
});
