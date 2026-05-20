import { Types } from "mongoose";
import { Room, RoomMember } from "./models/index.js";

/*
 * Per-room access helpers used by /api/rooms/[id]/* handlers.
 *
 * Why these and not just `requireAuth`:
 *   - Room visibility is membership-scoped (you must be a member to view),
 *     not role-scoped (being a "teacher" globally doesn't grant access to
 *     someone else's room).
 *   - Mutations like edit/delete/regenerate-invite are owner-only.
 */

export function isValidObjectId(id) {
  return typeof id === "string" && Types.ObjectId.isValid(id);
}

export async function findRoomOr404(res, id, { archived = "include" } = {}) {
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: "Кімнату не знайдено" });
    return null;
  }
  const room = await Room().findById(id);
  if (!room || (archived === "exclude" && room.archived)) {
    res.status(404).json({ error: "Кімнату не знайдено" });
    return null;
  }
  return room;
}

export async function getMembership(roomId, userId) {
  if (!roomId || !userId) return null;
  return RoomMember().findOne({ roomId, userId }).lean();
}

/**
 * Wrap a handler so it gets `req.room` (Mongoose doc) and `req.membership`
 * (lean doc). Sends 404 if the room doesn't exist, 403 if the caller isn't
 * a member.
 *
 * Usage:
 *   export default requireAuth(
 *     requireRoomMember(async (req, res) => { ... })
 *   );
 */
export function requireRoomMember(handler) {
  return async (req, res) => {
    const id = req.query?.id;
    const room = await findRoomOr404(res, id);
    if (!room) return;
    const membership = await getMembership(room._id, req.user._id);
    if (!membership) {
      return res.status(403).json({ error: "Ти не учасник цієї кімнати" });
    }
    req.room = room;
    req.membership = membership;
    return handler(req, res);
  };
}

/**
 * Stricter variant: also requires the caller to be the room owner OR a
 * teacher member (roleInRoom in {teacher, co_teacher}).
 */
export function requireRoomTeacher(handler) {
  return async (req, res) => {
    const id = req.query?.id;
    const room = await findRoomOr404(res, id);
    if (!room) return;
    const membership = await getMembership(room._id, req.user._id);
    const isOwner = String(room.ownerId) === String(req.user._id);
    const isStaff =
      isOwner ||
      (membership &&
        ["teacher", "co_teacher"].includes(membership.roleInRoom));
    if (!isStaff) {
      return res
        .status(403)
        .json({ error: "Тільки викладачі цієї кімнати можуть це робити" });
    }
    req.room = room;
    req.membership = membership;
    req.isOwner = isOwner;
    return handler(req, res);
  };
}

/**
 * Project a room + membership into the public shape sent to clients.
 * Hides `inviteCode` from non-staff members.
 */
export function publicRoom(room, membership, { ownerName } = {}) {
  if (!room) return null;
  const isStaff =
    membership &&
    ["teacher", "co_teacher"].includes(membership.roleInRoom);
  return {
    id: String(room._id),
    name: room.name,
    description: room.description ?? "",
    ownerId: String(room.ownerId),
    ownerName: ownerName ?? null,
    archived: Boolean(room.archived),
    settings: room.settings ?? {
      publicLeaderboard: true,
      chatEnabled: true,
    },
    createdAt: room.createdAt,
    // Caller's view of themselves in this room.
    membership: membership
      ? {
          role: membership.roleInRoom,
          coins: membership.coins ?? 0,
          xp: membership.xp ?? 0,
          joinedAt: membership.joinedAt ?? membership.createdAt,
        }
      : null,
    // Sensitive — only staff sees it.
    inviteCode: isStaff ? room.inviteCode : null,
  };
}
