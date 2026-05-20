import { connectToDatabase } from "../../_lib/db.js";
import { requireAuth } from "../../_lib/auth.js";
import { generateUniqueInviteCode } from "../../_lib/invite.js";
import { requireRoomTeacher } from "../../_lib/rooms.js";

/*
 * POST /api/rooms/[id]/regenerate-invite
 *
 * Rotates the invite code so old links stop working. Useful after an
 * accidental leak or to clean up a graduating cohort.
 */
export default requireAuth(
  requireRoomTeacher(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    await connectToDatabase();
    const code = await generateUniqueInviteCode();
    req.room.inviteCode = code;
    await req.room.save();
    return res.status(200).json({ inviteCode: code });
  }),
);
