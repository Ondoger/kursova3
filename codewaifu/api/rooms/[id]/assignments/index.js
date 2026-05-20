import { connectToDatabase } from "../../../_lib/db.js";
import {
  Assignment,
  Submission,
  User,
} from "../../../_lib/models/index.js";
import { requireAuth } from "../../../_lib/auth.js";
import {
  parseOr400,
  createAssignmentSchema,
} from "../../../_lib/validate.js";
import {
  findRoomOr404,
  getMembership,
} from "../../../_lib/rooms.js";
import { publicAssignment } from "../../../_lib/assignments.js";

/*
 *  GET  /api/rooms/[id]/assignments  — list assignments in this room
 *  POST /api/rooms/[id]/assignments  — teacher creates a new assignment
 *
 * Visibility: teachers see all assignments (incl. unpublished drafts);
 * students see only published ones.
 */

async function listAssignments(req, res) {
  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;
  const membership = await getMembership(room._id, req.user._id);
  if (!membership) {
    return res.status(403).json({ error: "Ти не учасник цієї кімнати" });
  }
  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    ["teacher", "co_teacher"].includes(membership.roleInRoom);

  const filter = { roomId: room._id };
  if (!isStaff) filter.publishedAt = { $ne: null };

  const assignments = await Assignment().find(filter).sort({ createdAt: -1 }).lean();
  if (assignments.length === 0) {
    return res.status(200).json({ assignments: [] });
  }

  const assignmentIds = assignments.map((a) => a._id);

  // Caller's own submissions for these assignments (so the list shows
  // student status badges next to each item).
  const mySubs = await Submission()
    .find({
      assignmentId: { $in: assignmentIds },
      studentId: req.user._id,
    })
    .lean();
  const myByAssignment = new Map(
    mySubs.map((s) => [String(s.assignmentId), s]),
  );

  // For staff: aggregate counts so the list shows "5/12 graded".
  let countsByAssignment = new Map();
  let gradedByAssignment = new Map();
  if (isStaff) {
    const counts = await Submission().aggregate([
      { $match: { assignmentId: { $in: assignmentIds } } },
      { $group: { _id: "$assignmentId", n: { $sum: 1 } } },
    ]);
    countsByAssignment = new Map(counts.map((c) => [String(c._id), c.n]));

    // Submissions in "graded" status.
    const graded = await Submission().aggregate([
      {
        $match: {
          assignmentId: { $in: assignmentIds },
          status: "graded",
        },
      },
      { $group: { _id: "$assignmentId", n: { $sum: 1 } } },
    ]);
    gradedByAssignment = new Map(graded.map((c) => [String(c._id), c.n]));
  }

  // Author names (might be different teachers in the same room).
  const authorIds = [...new Set(assignments.map((a) => String(a.authorId)))];
  const authors = await User()
    .find({ _id: { $in: authorIds } }, { name: 1, email: 1 })
    .lean();
  const authorById = new Map(authors.map((u) => [String(u._id), u]));

  const items = assignments.map((a) => {
    const my = myByAssignment.get(String(a._id));
    const author = authorById.get(String(a.authorId));
    return publicAssignment(a, {
      mySubmission: my
        ? {
            id: String(my._id),
            status: my.status,
            submittedAt: my.submittedAt,
          }
        : null,
      isStaff,
      submissionCount: countsByAssignment.get(String(a._id)) ?? 0,
      gradedCount: gradedByAssignment.get(String(a._id)) ?? 0,
      authorName: author?.name ?? author?.email ?? null,
    });
  });

  return res.status(200).json({ assignments: items });
}

async function createAssignment(req, res) {
  const room = await findRoomOr404(res, req.query.id, { archived: "exclude" });
  if (!room) return;
  const membership = await getMembership(room._id, req.user._id);
  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    (membership &&
      ["teacher", "co_teacher"].includes(membership.roleInRoom));
  if (!isStaff) {
    return res
      .status(403)
      .json({ error: "Тільки викладачі можуть створювати завдання" });
  }

  const body = parseOr400(res, createAssignmentSchema, req.body);
  if (!body) return;

  const a = await Assignment().create({
    roomId: room._id,
    authorId: req.user._id,
    title: body.title,
    description: body.description ?? "",
    deadlineAt: body.deadlineAt ? new Date(body.deadlineAt) : null,
    maxPoints: body.maxPoints,
    rewardCoins: body.rewardCoins,
    githubHint: body.githubHint ?? {},
    attachment: body.attachment
      ? {
          fileName: body.attachment.fileName,
          mime: body.attachment.mime,
          size: body.attachment.size,
          dataUrl: body.attachment.dataUrl,
        }
      : null,
    publishedAt: body.publish ? new Date() : null,
  });

  return res.status(201).json({
    assignment: publicAssignment(a, {
      isStaff: true,
      submissionCount: 0,
      gradedCount: 0,
      authorName: req.user.name,
    }),
  });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();
  if (req.method === "GET") return listAssignments(req, res);
  if (req.method === "POST") return createAssignment(req, res);
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
});
