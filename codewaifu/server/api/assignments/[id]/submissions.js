import { connectToDatabase } from "../../_lib/db.js";
import { Submission, Grade, User } from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import {
  requireAssignmentTeacher,
  publicSubmission,
} from "../../_lib/assignments.js";

/*
 * GET /api/assignments/[id]/submissions
 *
 * Teacher view of all students who've submitted (or not) for this
 * assignment. Returns one row per submission *and* synthetic rows for
 * room students who haven't submitted at all — so the teacher can spot
 * who needs nudging.
 */
export default requireAuth(
  requireAssignmentTeacher(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }
    await connectToDatabase();

    const { RoomMember } = await import("../../_lib/models/index.js");

    const [submissions, members] = await Promise.all([
      Submission().find({ assignmentId: req.assignment._id }).lean(),
      RoomMember()
        .find({ roomId: req.room._id, roleInRoom: "student" })
        .lean(),
    ]);

    const submittedStudentIds = new Set(
      submissions.map((s) => String(s.studentId)),
    );
    const allStudentIds = [
      ...new Set([
        ...members.map((m) => String(m.userId)),
        ...submittedStudentIds,
      ]),
    ];
    const studentDocs = await User()
      .find(
        { _id: { $in: allStudentIds } },
        { name: 1, email: 1, avatarUrl: 1, githubLogin: 1 },
      )
      .lean();
    const studentById = new Map(
      studentDocs.map((u) => [String(u._id), u]),
    );

    // Pull grades in one round-trip.
    const subIds = submissions.map((s) => s._id);
    const grades = subIds.length
      ? await Grade().find({ submissionId: { $in: subIds } }).lean()
      : [];
    const gradeBySub = new Map(
      grades.map((g) => [String(g.submissionId), g]),
    );

    const submitted = submissions
      .map((s) =>
        publicSubmission(s, {
          grade: gradeBySub.get(String(s._id)) ?? null,
          student: studentById.get(String(s.studentId)),
          assignment: req.assignment,
        }),
      )
      .sort((a, b) => {
        // Pending submissions first (teachers want to grade those), then
        // by most-recently-submitted.
        const aP = a.status === "submitted" ? 0 : 1;
        const bP = b.status === "submitted" ? 0 : 1;
        if (aP !== bP) return aP - bP;
        return new Date(b.submittedAt ?? 0) - new Date(a.submittedAt ?? 0);
      });

    const missing = members
      .filter((m) => !submittedStudentIds.has(String(m.userId)))
      .map((m) => {
        const u = studentById.get(String(m.userId));
        return {
          status: "missing",
          student: u
            ? {
                id: String(u._id),
                name: u.name,
                email: u.email,
                avatarUrl: u.avatarUrl ?? null,
                githubLogin: u.githubLogin ?? null,
              }
            : null,
        };
      });

    return res.status(200).json({
      submissions: submitted,
      missing,
      totals: {
        students: members.length,
        submitted: submitted.length,
        graded: submitted.filter((s) => s.status === "graded").length,
      },
    });
  }),
);
