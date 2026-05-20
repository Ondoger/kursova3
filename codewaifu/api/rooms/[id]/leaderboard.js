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

function publicStudent(user, member) {
  return {
    id: String(user?._id ?? member.userId),
    name: user?.name ?? null,
    email: user?.email ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    githubLogin: user?.githubLogin ?? null,
  };
}

function isRecent(date) {
  if (!date) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  return new Date(date) >= cutoff;
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

  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    ["teacher", "co_teacher"].includes(membership.roleInRoom);
  if (room.settings?.publicLeaderboard === false && !isStaff) {
    return res.status(403).json({ error: "Рейтинг вимкнений для студентів" });
  }

  const [assignments, members] = await Promise.all([
    Assignment().find({ roomId: room._id, publishedAt: { $ne: null } }).lean(),
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

  const grades = submissions.length
    ? await Grade()
        .find({ submissionId: { $in: submissions.map((s) => s._id) } })
        .lean()
    : [];

  const userById = new Map(users.map((u) => [String(u._id), u]));
  const assignmentById = new Map(assignments.map((a) => [String(a._id), a]));
  const gradeBySubId = new Map(grades.map((g) => [String(g.submissionId), g]));
  const submissionsByStudent = new Map();

  for (const submission of submissions) {
    const key = String(submission.studentId);
    if (!submissionsByStudent.has(key)) submissionsByStudent.set(key, []);
    submissionsByStudent.get(key).push(submission);
  }

  const entries = members.map((member) => {
    const studentId = String(member.userId);
    const studentSubmissions = submissionsByStudent.get(studentId) ?? [];
    const gradedSubmissions = studentSubmissions.filter(
      (submission) => submission.status === "graded",
    );
    const points = gradedSubmissions.reduce(
      (sum, submission) => sum + (gradeBySubId.get(String(submission._id))?.points ?? 0),
      0,
    );
    const maxPoints = gradedSubmissions.reduce((sum, submission) => {
      const assignment = assignmentById.get(String(submission.assignmentId));
      return sum + (assignment?.maxPoints ?? 100);
    }, 0);
    const recentActivity = studentSubmissions.filter((submission) =>
      isRecent(submission.submittedAt) || isRecent(submission.resubmittedAfterReturnAt),
    ).length;

    return {
      student: publicStudent(userById.get(studentId), member),
      metrics: {
        coins: member.coins ?? 0,
        xp: member.xp ?? 0,
        points,
        submitted: studentSubmissions.length,
        graded: gradedSubmissions.length,
        missing: Math.max(0, assignments.length - studentSubmissions.length),
        completionRate: assignments.length
          ? Math.round((studentSubmissions.length / assignments.length) * 100)
          : 0,
        averagePercent: maxPoints ? Math.round((points / maxPoints) * 100) : 0,
        recentActivity,
      },
      lastActivityAt:
        studentSubmissions
          .map((submission) => submission.submittedAt ?? submission.updatedAt)
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] ?? null,
    };
  });

  return res.status(200).json({
    room: {
      id: String(room._id),
      name: room.name,
      publicLeaderboard: room.settings?.publicLeaderboard !== false,
    },
    summary: {
      students: members.length,
      publishedAssignments: assignments.length,
    },
    metrics: [
      { key: "coins", label: "Коїни", suffix: "ⓒ" },
      { key: "submitted", label: "Здано", suffix: "" },
      { key: "completionRate", label: "% виконання", suffix: "%" },
      { key: "averagePercent", label: "Середня оцінка", suffix: "%" },
      { key: "recentActivity", label: "Активність 14д", suffix: "" },
      { key: "graded", label: "Оцінено", suffix: "" },
    ],
    entries,
  });
});
