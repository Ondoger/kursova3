import { connectToDatabase } from "../../_lib/db.js";
import { requireAuth } from "../../_lib/auth.js";
import { requireSubmissionAccess } from "../../_lib/assignments.js";

/*
 * POST /api/submissions/[id]/return
 *
 * Teacher kicks the submission back for revision. Status flips to
 * "returned" so the student sees a "needs work" badge but the existing
 * Grade (if any) and points stay — adjust them via the regular grade
 * endpoint if needed.
 */
export default requireAuth(
  requireSubmissionAccess(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!req.isStaff) {
      return res.status(403).json({ error: "Тільки викладачі можуть повернути" });
    }
    await connectToDatabase();
    req.submission.status = "returned";
    req.submission.returnedAt = new Date();
    await req.submission.save();
    return res.status(200).json({ ok: true, status: "returned" });
  }),
);
