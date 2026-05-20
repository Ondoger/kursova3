import { Types } from "mongoose";
import {
  Assignment,
  Submission,
} from "./models/index.js";
import { findRoomOr404, getMembership } from "./rooms.js";
import { awardedCoinsForGrade } from "./rewards.js";

/*
 * Helpers shared by /api/rooms/[id]/assignments/* and /api/assignments/[id]/*.
 */

export function isValidObjectId(id) {
  return typeof id === "string" && Types.ObjectId.isValid(id);
}

export async function findAssignmentOr404(res, id) {
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: "Завдання не знайдено" });
    return null;
  }
  const a = await Assignment().findById(id);
  if (!a) {
    res.status(404).json({ error: "Завдання не знайдено" });
    return null;
  }
  return a;
}

export async function findSubmissionOr404(res, id) {
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: "Сабмішн не знайдено" });
    return null;
  }
  const s = await Submission().findById(id);
  if (!s) {
    res.status(404).json({ error: "Сабмішн не знайдено" });
    return null;
  }
  return s;
}

/**
 * Wrap a handler that operates on /api/assignments/[id] — checks the
 * caller is a member of the assignment's room and attaches both
 * `req.assignment` and `req.room` + `req.membership`.
 */
export function requireAssignmentMember(handler) {
  return async (req, res) => {
    const assignment = await findAssignmentOr404(res, req.query.id);
    if (!assignment) return;
    const room = await findRoomOr404(res, String(assignment.roomId));
    if (!room) return;
    const membership = await getMembership(room._id, req.user._id);
    if (!membership) {
      return res
        .status(403)
        .json({ error: "Ти не учасник кімнати цього завдання" });
    }
    req.assignment = assignment;
    req.room = room;
    req.membership = membership;
    return handler(req, res);
  };
}

export function requireAssignmentTeacher(handler) {
  return requireAssignmentMember(async (req, res) => {
    const isStaff =
      String(req.room.ownerId) === String(req.user._id) ||
      ["teacher", "co_teacher"].includes(req.membership.roleInRoom);
    if (!isStaff) {
      return res
        .status(403)
        .json({ error: "Тільки викладачі можуть це робити" });
    }
    return handler(req, res);
  });
}

/**
 * Same idea but for /api/submissions/[id]/* — caller must be the
 * student that owns the submission OR a teacher in the room.
 */
export function requireSubmissionAccess(handler) {
  return async (req, res) => {
    const submission = await findSubmissionOr404(res, req.query.id);
    if (!submission) return;
    const assignment = await Assignment().findById(submission.assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Завдання не знайдено" });
    }
    const room = await findRoomOr404(res, String(assignment.roomId));
    if (!room) return;
    const membership = await getMembership(room._id, req.user._id);
    if (!membership) {
      return res
        .status(403)
        .json({ error: "Ти не учасник кімнати цього завдання" });
    }
    const isOwner = String(submission.studentId) === String(req.user._id);
    const isStaff =
      String(room.ownerId) === String(req.user._id) ||
      ["teacher", "co_teacher"].includes(membership.roleInRoom);
    if (!isOwner && !isStaff) {
      return res
        .status(403)
        .json({ error: "Доступ заборонено" });
    }
    req.submission = submission;
    req.assignment = assignment;
    req.room = room;
    req.membership = membership;
    req.isStaff = isStaff;
    req.isOwner = isOwner;
    return handler(req, res);
  };
}

/**
 * Project an Assignment + caller's submission into the public shape.
 * For teachers: includes counters (submissionCount, gradedCount).
 * For students: includes their own submission only.
 */
export function publicAssignment(
  assignment,
  {
    mySubmission,
    isStaff,
    submissionCount,
    gradedCount,
    authorName,
    includeAttachmentData = false,
  } = {},
) {
  if (!assignment) return null;
  const a = assignment.toObject ? assignment.toObject() : assignment;
  const attachment = a.attachment?.fileName
    ? {
        fileName: a.attachment.fileName,
        mime: a.attachment.mime ?? "application/octet-stream",
        size: a.attachment.size ?? 0,
        ...(includeAttachmentData ? { dataUrl: a.attachment.dataUrl ?? "" } : {}),
      }
    : null;
  return {
    id: String(a._id),
    roomId: String(a.roomId),
    authorId: String(a.authorId),
    authorName: authorName ?? null,
    title: a.title,
    description: a.description ?? "",
    deadlineAt: a.deadlineAt ?? null,
    maxPoints: a.maxPoints ?? 100,
    rewardCoins: a.rewardCoins ?? a.maxPoints ?? 100,
    githubHint: a.githubHint ?? {},
    attachment,
    publishedAt: a.publishedAt ?? null,
    isPublished: Boolean(a.publishedAt),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    mySubmission: mySubmission ?? null,
    ...(isStaff
      ? {
          submissionCount: submissionCount ?? 0,
          gradedCount: gradedCount ?? 0,
        }
      : {}),
  };
}

export function publicSubmission(submission, { grade, student, assignment } = {}) {
  if (!submission) return null;
  const s = submission.toObject ? submission.toObject() : submission;
  const hasStoredAward = grade && !grade.$isDefault?.("awardedCoins");
  const awardedCoins =
    hasStoredAward && typeof grade.awardedCoins === "number"
      ? grade.awardedCoins
      : assignment && grade
        ? awardedCoinsForGrade(grade.points ?? 0, assignment)
        : grade?.awardedCoins ?? 0;
  return {
    id: String(s._id),
    assignmentId: String(s.assignmentId),
    studentId: String(s.studentId),
    student: student
      ? {
          id: String(student._id ?? student.id),
          name: student.name ?? null,
          email: student.email ?? null,
          avatarUrl: student.avatarUrl ?? null,
          githubLogin: student.githubLogin ?? null,
        }
      : null,
    repoUrl: s.repoUrl ?? null,
    prUrl: s.prUrl ?? null,
    commitSha: s.commitSha ?? null,
    note: s.note ?? "",
    status: s.status,
    submittedAt: s.submittedAt ?? null,
    returnedAt: s.returnedAt ?? null,
    resubmittedAfterReturnAt: s.resubmittedAfterReturnAt ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    grade: grade
      ? {
          points: grade.points,
          awardedCoins,
          feedback: grade.feedback ?? "",
          gradedAt: grade.gradedAt,
          gradedById: String(grade.gradedById),
        }
      : null,
  };
}
