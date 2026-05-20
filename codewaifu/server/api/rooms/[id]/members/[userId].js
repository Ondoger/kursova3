import { connectToDatabase } from "../../../_lib/db.js";
import { RoomMember } from "../../../_lib/models/index.js";
import { requireAuth } from "../../../_lib/auth.js";
import { requireRoomTeacher, isValidObjectId } from "../../../_lib/rooms.js";

/*
 * DELETE /api/rooms/[id]/members/[userId]
 *
 * Teachers remove a member from the room. The owner can't be removed
 * (must archive the room instead). Co-teachers can remove students but
 * not other teachers.
 */
export default requireAuth(
  requireRoomTeacher(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "DELETE") {
      res.setHeader("Allow", "DELETE");
      return res.status(405).json({ error: "Method not allowed" });
    }
    await connectToDatabase();

    const targetUserId = req.query.userId;
    if (!isValidObjectId(targetUserId)) {
      return res.status(400).json({ error: "Невірний userId" });
    }
    if (String(req.room.ownerId) === String(targetUserId)) {
      return res
        .status(400)
        .json({ error: "Власника не можна видалити" });
    }
    const target = await RoomMember()
      .findOne({ roomId: req.room._id, userId: targetUserId })
      .lean();
    if (!target) {
      return res.status(404).json({ error: "Учасника не знайдено" });
    }

    // Co-teachers can't kick other staff. Only the owner has that power.
    const callerIsOwner =
      String(req.room.ownerId) === String(req.user._id);
    if (
      !callerIsOwner &&
      ["teacher", "co_teacher"].includes(target.roleInRoom)
    ) {
      return res
        .status(403)
        .json({ error: "Ко-викладач не може видаляти інших викладачів" });
    }

    await RoomMember().deleteOne({ _id: target._id });
    return res.status(200).json({ ok: true });
  }),
);
