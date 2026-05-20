import { connectToDatabase } from "../../_lib/db.js";
import { RoomMember } from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";

/*
 * POST /api/rooms/[id]/leave
 *
 * Current user leaves the room. Owners cannot leave their own room — they
 * must transfer ownership (Phase later) or archive instead. This avoids
 * orphaned rooms with no admin.
 */
export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  await connectToDatabase();
  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;

  if (String(room.ownerId) === String(req.user._id)) {
    return res.status(400).json({
      error:
        "Власник не може вийти. Передай право власності або заархівуй кімнату.",
    });
  }

  const membership = await getMembership(room._id, req.user._id);
  if (!membership) {
    return res.status(404).json({ error: "Ти й так не учасник цієї кімнати" });
  }

  await RoomMember().deleteOne({ _id: membership._id });
  return res.status(200).json({ ok: true });
});
