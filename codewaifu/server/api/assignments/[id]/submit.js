import { connectToDatabase } from "../../_lib/db.js";
import {
  Submission,
  Grade,
  PointsLedger,
  RoomMember,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import {
  parseOr400,
  submitAssignmentSchema,
} from "../../_lib/validate.js";
import {
  requireAssignmentMember,
  publicSubmission,
} from "../../_lib/assignments.js";
import { awardedCoinsForGrade } from "../../_lib/rewards.js";

/*
 * POST /api/assignments/[id]/submit
 * Body: { repoUrl?, prUrl?, commitSha?, note? }
 *
 * Idempotent upsert: if the student already has a submission, we update
 * it. If the assignment was previously graded and the student re-submits,
 * we reset status to "submitted" (teacher will need to re-grade). The
 * existing grade record stays as-is so we don't lose history — but
 * `submission.status === "submitted"` signals "needs re-review".
 *
 * Teachers cannot submit (they aren't students of their own assignments).
 */
export default requireAuth(
  requireAssignmentMember(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Teachers can't submit to their own assignments — would corrupt
    // the room leaderboard.
    const isStaff =
      String(req.room.ownerId) === String(req.user._id) ||
      ["teacher", "co_teacher"].includes(req.membership.roleInRoom);
    if (isStaff) {
      return res
        .status(403)
        .json({ error: "Викладачі не можуть здавати завдання" });
    }

    if (!req.assignment.publishedAt) {
      return res.status(400).json({ error: "Завдання ще не опубліковане" });
    }

    const body = parseOr400(res, submitAssignmentSchema, req.body);
    if (!body) return;

    // At least one of: repoUrl, prUrl, commitSha or note must be present.
    if (
      !body.repoUrl &&
      !body.prUrl &&
      !body.commitSha &&
      (!body.note || !body.note.trim())
    ) {
      return res
        .status(400)
        .json({ error: "Додай посилання на репо/PR або коментар" });
    }

    await connectToDatabase();

    const existing = await Submission().findOne({
      assignmentId: req.assignment._id,
      studentId: req.user._id,
    });

    let submission;
    if (existing) {
      const wasReturned = existing.status === "returned" || existing.returnedAt;
      const existingGrade = await Grade().findOne({ submissionId: existing._id });
      const hasStoredAward = existingGrade && !existingGrade.$isDefault?.("awardedCoins");
      const previousAwardedCoins =
        hasStoredAward && typeof existingGrade.awardedCoins === "number"
          ? existingGrade.awardedCoins
          : existingGrade
            ? awardedCoinsForGrade(existingGrade.points ?? 0, req.assignment)
            : 0;
      if (previousAwardedCoins > 0) {
        await PointsLedger().create({
          userId: req.user._id,
          roomId: req.room._id,
          delta: -previousAwardedCoins,
          kind: "penalty",
          reason: `Resubmission reset reward for "${req.assignment.title}"`,
          refType: "submission",
          refId: existing._id,
        });
        await RoomMember().updateOne(
          { roomId: req.room._id, userId: req.user._id },
          { $inc: { coins: -previousAwardedCoins, xp: -previousAwardedCoins } },
        );
        await User().updateOne(
          { _id: req.user._id },
          { $inc: { "totals.coins": -previousAwardedCoins, "totals.xp": -previousAwardedCoins } },
        );
        existingGrade.awardedCoins = 0;
        await existingGrade.save();
      }
      existing.repoUrl = body.repoUrl ?? null;
      existing.prUrl = body.prUrl ?? null;
      existing.commitSha = body.commitSha ?? null;
      existing.note = body.note ?? "";
      existing.status = "submitted";
      existing.submittedAt = new Date();
      if (wasReturned) existing.resubmittedAfterReturnAt = new Date();
      submission = await existing.save();
    } else {
      submission = await Submission().create({
        assignmentId: req.assignment._id,
        studentId: req.user._id,
        repoUrl: body.repoUrl ?? null,
        prUrl: body.prUrl ?? null,
        commitSha: body.commitSha ?? null,
        note: body.note ?? "",
        status: "submitted",
        submittedAt: new Date(),
      });
    }

    const grade = await Grade().findOne({ submissionId: submission._id });

    return res.status(200).json({
      submission: publicSubmission(submission, { grade, assignment: req.assignment }),
    });
  }),
);
