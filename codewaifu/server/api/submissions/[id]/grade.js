import { connectToDatabase } from "../../_lib/db.js";
import {
  Grade,
  PointsLedger,
  RoomMember,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import {
  parseOr400,
  gradeSubmissionSchema,
} from "../../_lib/validate.js";
import {
  requireSubmissionAccess,
  publicSubmission,
} from "../../_lib/assignments.js";
import { awardedCoinsForGrade } from "../../_lib/rewards.js";

/*
 * POST /api/submissions/[id]/grade
 * Body: { points, feedback? }
 *
 * Teacher grades a submission. Behaviours:
 *   - Caps points at the assignment's `maxPoints`.
 *   - Updates submission.status to "graded".
 *   - Creates the Grade record (or updates if it already exists from a
 *     previous grade attempt).
 *   - Maintains the points_ledger so room leaderboards are eventually-
 *     consistent. Re-grading the same submission generates a *delta*
 *     entry rather than a duplicate, keeping the ledger as a true audit
 *     log of "what changed when".
 *   - Increments RoomMember.coins / xp for the student by the delta
 *     (so /api/rooms?... and the dashboard cards stay accurate without
 *     re-aggregating).
 */
export default requireAuth(
  requireSubmissionAccess(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!req.isStaff) {
      return res.status(403).json({ error: "Тільки викладачі можуть оцінювати" });
    }

    const body = parseOr400(res, gradeSubmissionSchema, req.body);
    if (!body) return;

    await connectToDatabase();
    const cappedPoints = Math.min(
      body.points,
      req.assignment.maxPoints ?? 100,
    );
    const awardedCoins = awardedCoinsForGrade(cappedPoints, req.assignment);

    // Upsert grade.
    let grade = await Grade().findOne({ submissionId: req.submission._id });
    const previousPoints = grade?.points ?? 0;
    const hasStoredAward = grade && !grade.$isDefault?.("awardedCoins");
    const previousAwardedCoins =
      hasStoredAward && typeof grade.awardedCoins === "number"
        ? grade.awardedCoins
        : awardedCoinsForGrade(previousPoints, req.assignment);
    if (grade) {
      grade.points = cappedPoints;
      grade.awardedCoins = awardedCoins;
      grade.feedback = body.feedback ?? "";
      grade.gradedById = req.user._id;
      grade.gradedAt = new Date();
      await grade.save();
    } else {
      grade = await Grade().create({
        submissionId: req.submission._id,
        points: cappedPoints,
        awardedCoins,
        feedback: body.feedback ?? "",
        gradedById: req.user._id,
        gradedAt: new Date(),
      });
    }

    // Mark submission graded.
    req.submission.status = "graded";
    await req.submission.save();

    // Points ledger + room counter delta.
    const delta = awardedCoins - previousAwardedCoins;
    if (delta !== 0) {
      await PointsLedger().create({
        userId: req.submission.studentId,
        roomId: req.room._id,
        delta,
        kind: "grade",
        reason: `Grade for "${req.assignment.title}"`,
        refType: "submission",
        refId: req.submission._id,
      });
      await RoomMember().updateOne(
        { roomId: req.room._id, userId: req.submission.studentId },
        { $inc: { coins: delta, xp: delta } },
      );
      await User().updateOne(
        { _id: req.submission.studentId },
        { $inc: { "totals.coins": delta, "totals.xp": delta } },
      );
    }

    // Refresh the lean student doc for response shape.
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
    });
  }),
);
