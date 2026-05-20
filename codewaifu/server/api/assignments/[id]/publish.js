import { connectToDatabase } from "../../_lib/db.js";
import { requireAuth } from "../../_lib/auth.js";
import { requireAssignmentTeacher } from "../../_lib/assignments.js";

/*
 * POST /api/assignments/[id]/publish   { publish: true } | { publish: false }
 *
 * Toggle visibility for students. We don't expose this as a PATCH on the
 * main resource because publish/unpublish is a meaningful state
 * transition — useful as a separate audit-loggable event later.
 */
export default requireAuth(
  requireAssignmentTeacher(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    await connectToDatabase();

    const wantsPublish =
      req.body && typeof req.body === "object"
        ? Boolean(req.body.publish)
        : true;

    req.assignment.publishedAt = wantsPublish ? new Date() : null;
    await req.assignment.save();

    return res.status(200).json({
      isPublished: wantsPublish,
      publishedAt: req.assignment.publishedAt,
    });
  }),
);
