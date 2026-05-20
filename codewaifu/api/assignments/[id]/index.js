import { connectToDatabase } from "../../_lib/db.js";
import {
  CodeReview,
  Assignment,
  Submission,
  Grade,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import {
  parseOr400,
  patchAssignmentSchema,
} from "../../_lib/validate.js";
import {
  publicAssignment,
  publicSubmission,
  requireAssignmentMember,
  requireAssignmentTeacher,
} from "../../_lib/assignments.js";

/*
 *  GET    /api/assignments/[id]   — view (members) — student-shaped or teacher-shaped
 *  PATCH  /api/assignments/[id]   — edit (teachers only)
 *  DELETE /api/assignments/[id]   — delete (teachers; cascades to submissions/grades)
 */

async function getAssignment(req, res) {
  const a = req.assignment;
  const isStaff =
    String(req.room.ownerId) === String(req.user._id) ||
    ["teacher", "co_teacher"].includes(req.membership.roleInRoom);

  // Students can't see unpublished assignments.
  if (!isStaff && !a.publishedAt) {
    return res.status(404).json({ error: "Завдання не знайдено" });
  }

  // Caller's own submission (if any), with grade.
  const mySub = await Submission().findOne({
    assignmentId: a._id,
    studentId: req.user._id,
  });
  let myGrade = null;
  if (mySub) {
    myGrade = await Grade().findOne({ submissionId: mySub._id });
  }

  const author = await User()
    .findById(a.authorId, { name: 1, email: 1 })
    .lean();

  let submissionCount = 0;
  let gradedCount = 0;
  if (isStaff) {
    submissionCount = await Submission().countDocuments({
      assignmentId: a._id,
    });
    gradedCount = await Submission().countDocuments({
      assignmentId: a._id,
      status: "graded",
    });
  }

  return res.status(200).json({
    assignment: publicAssignment(a, {
      mySubmission: mySub
        ? publicSubmission(mySub, { grade: myGrade, assignment: a })
        : null,
      isStaff,
      submissionCount,
      gradedCount,
      authorName: author?.name ?? author?.email ?? null,
      includeAttachmentData: true,
    }),
  });
}

async function patchAssignment(req, res) {
  const body = parseOr400(res, patchAssignmentSchema, req.body);
  if (!body) return;
  const a = req.assignment;

  if (body.title !== undefined) a.title = body.title;
  if (body.description !== undefined) a.description = body.description;
  if (body.deadlineAt !== undefined) {
    a.deadlineAt = body.deadlineAt ? new Date(body.deadlineAt) : null;
  }
  if (body.maxPoints !== undefined) a.maxPoints = body.maxPoints;
  if (body.rewardCoins !== undefined) a.rewardCoins = body.rewardCoins;
  if (body.githubHint !== undefined) a.githubHint = body.githubHint ?? {};
  if (body.attachment !== undefined) {
    a.attachment = body.attachment
      ? {
          fileName: body.attachment.fileName,
          mime: body.attachment.mime,
          size: body.attachment.size,
          dataUrl: body.attachment.dataUrl,
        }
      : null;
  }
  await a.save();

  return res.status(200).json({
    assignment: publicAssignment(a, {
      isStaff: true,
      submissionCount: await Submission().countDocuments({ assignmentId: a._id }),
      gradedCount: await Submission().countDocuments({
        assignmentId: a._id,
        status: "graded",
      }),
      authorName: req.user.name,
      includeAttachmentData: true,
    }),
  });
}

async function deleteAssignment(req, res) {
  const a = req.assignment;
  // Cascade: drop submissions and their grades. Mongo doesn't enforce
  // foreign keys so we do it manually.
  const subs = await Submission()
    .find({ assignmentId: a._id }, { _id: 1 })
    .lean();
  if (subs.length > 0) {
    const subIds = subs.map((s) => s._id);
    await Grade().deleteMany({ submissionId: { $in: subIds } });
    await CodeReview().deleteMany({ submissionId: { $in: subIds } });
    await Submission().deleteMany({ _id: { $in: subIds } });
  }
  await Assignment().deleteOne({ _id: a._id });
  return res.status(200).json({ ok: true, deleted: true });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();

  if (req.method === "GET") return requireAssignmentMember(getAssignment)(req, res);
  if (req.method === "PATCH") return requireAssignmentTeacher(patchAssignment)(req, res);
  if (req.method === "DELETE") return requireAssignmentTeacher(deleteAssignment)(req, res);

  res.setHeader("Allow", "GET, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
});
