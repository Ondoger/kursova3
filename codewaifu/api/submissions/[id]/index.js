import { connectToDatabase } from "../../_lib/db.js";
import { Grade, User } from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import {
  requireSubmissionAccess,
  publicSubmission,
} from "../../_lib/assignments.js";

/*
 * GET /api/submissions/[id]
 *
 * Detailed view: the submission, its grade (if any), and the
 * publically-shaped student. Accessible to the student themselves and
 * to teachers/co-teachers in the room.
 */
export default requireAuth(
  requireSubmissionAccess(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }
    await connectToDatabase();

    const grade = await Grade().findOne({ submissionId: req.submission._id });
    const student = await User()
      .findById(req.submission.studentId, {
        name: 1,
        email: 1,
        avatarUrl: 1,
        githubLogin: 1,
      })
      .lean();

    return res.status(200).json({
      submission: publicSubmission(req.submission, { grade, student, assignment: req.assignment }),
      assignment: {
        id: String(req.assignment._id),
        title: req.assignment.title,
        maxPoints: req.assignment.maxPoints ?? 100,
        deadlineAt: req.assignment.deadlineAt ?? null,
        roomId: String(req.assignment.roomId),
      },
    });
  }),
);
