import { connectToDatabase } from "../_lib/db.js";
import { Room, RoomMember, User } from "../_lib/models/index.js";
import { requireAuth } from "../_lib/auth.js";
import { normaliseInviteCode } from "../_lib/invite.js";
import { parseOr400, joinRoomSchema } from "../_lib/validate.js";
import { publicRoom } from "../_lib/rooms.js";

/*
 * POST /api/rooms/join
 * Body: { code }
 *
 * Adds the current user to a room as a "student" (regardless of their
 * global role — a teacher joining someone else's room is still a student
 * in *that* room). Idempotent: re-joining returns 200 with existing
 * membership.
 *
 * NB: We deliberately don't return 404 for unknown codes vs 403 for
 * archived rooms — same generic message in both cases prevents code
 * enumeration attacks.
 */
export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseOr400(res, joinRoomSchema, req.body);
  if (!body) return;
  const code = normaliseInviteCode(body.code);

  await connectToDatabase();
  const room = await Room().findOne({ inviteCode: code, archived: false });
  if (!room) {
    return res
      .status(404)
      .json({ error: "Кімнату з таким кодом не знайдено" });
  }

  // Already a member? Return their existing membership without disturbing
  // it — joining again should be a no-op, not reset of points.
  const existing = await RoomMember().findOne({
    roomId: room._id,
    userId: req.user._id,
  });
  if (existing) {
    return res.status(200).json({
      room: publicRoom(room.toObject(), existing.toObject(), {
        ownerName: null,
      }),
      alreadyMember: true,
    });
  }

  const membership = await RoomMember().create({
    roomId: room._id,
    userId: req.user._id,
    roleInRoom: "student",
  });

  // Pull the owner's display name for the response.
  const owner = await User()
    .findById(room.ownerId, { name: 1, email: 1 })
    .lean();

  return res.status(201).json({
    room: publicRoom(room.toObject(), membership.toObject(), {
      ownerName: owner?.name ?? owner?.email ?? null,
    }),
    alreadyMember: false,
  });
});
