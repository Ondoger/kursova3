import { connectToDatabase } from "../../_lib/db.js";
import { Room, RoomMember, User } from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { parseOr400, patchRoomSchema } from "../../_lib/validate.js";
import {
  findRoomOr404,
  getMembership,
  publicRoom,
} from "../../_lib/rooms.js";

/*
 *  GET    /api/rooms/[id]   — room details + members (members-only)
 *  PATCH  /api/rooms/[id]   — edit (teachers only)
 *  DELETE /api/rooms/[id]   — soft-archive (owner only)
 */

async function getRoom(req, res) {
  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;

  const membership = await getMembership(room._id, req.user._id);
  if (!membership) {
    return res
      .status(403)
      .json({ error: "Ти не учасник цієї кімнати" });
  }

  // Members list (always for staff; for students this lets the room feel
  // social — they want to see classmates). Could be gated later via
  // settings.publicRoster if needed.
  const memberships = await RoomMember()
    .find({ roomId: room._id })
    .lean();
  const userIds = memberships.map((m) => m.userId);
  const users = await User()
    .find(
      { _id: { $in: userIds } },
      { name: 1, email: 1, avatarUrl: 1, role: 1, githubLogin: 1 },
    )
    .lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const members = memberships.map((m) => {
    const u = userById.get(String(m.userId));
    return {
      userId: String(m.userId),
      name: u?.name ?? null,
      email: u?.email ?? null,
      avatarUrl: u?.avatarUrl ?? null,
      githubLogin: u?.githubLogin ?? null,
      role: m.roleInRoom,
      joinedAt: m.joinedAt ?? m.createdAt,
      coins: m.coins ?? 0,
      xp: m.xp ?? 0,
    };
  });
  // Stable order: staff first, then students by join time.
  const ROLE_RANK = { teacher: 0, co_teacher: 1, student: 2 };
  members.sort((a, b) => {
    const r = (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9);
    if (r !== 0) return r;
    return new Date(a.joinedAt) - new Date(b.joinedAt);
  });

  const owner = userById.get(String(room.ownerId));

  return res.status(200).json({
    room: publicRoom(room, membership, {
      ownerName: owner?.name ?? owner?.email ?? null,
    }),
    members,
  });
}

async function patchRoom(req, res) {
  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;
  const membership = await getMembership(room._id, req.user._id);
  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    (membership &&
      ["teacher", "co_teacher"].includes(membership.roleInRoom));
  if (!isStaff) {
    return res
      .status(403)
      .json({ error: "Тільки викладачі можуть редагувати" });
  }

  const body = parseOr400(res, patchRoomSchema, req.body);
  if (!body) return;
  if (Object.keys(body).length === 0) {
    return res
      .status(400)
      .json({ error: "Нема змін у запиті" });
  }

  if (body.name !== undefined) room.name = body.name;
  if (body.description !== undefined) room.description = body.description;
  if (body.archived !== undefined) {
    // Only the owner can archive — co-teachers can edit but not nuke.
    if (
      body.archived !== room.archived &&
      String(room.ownerId) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ error: "Тільки власник може архівувати кімнату" });
    }
    room.archived = body.archived;
  }
  if (body.settings) {
    room.settings = { ...(room.settings ?? {}), ...body.settings };
  }
  await room.save();

  return res.status(200).json({
    room: publicRoom(room.toObject(), membership, {
      ownerName: req.user.name,
    }),
  });
}

async function deleteRoom(req, res) {
  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;
  if (String(room.ownerId) !== String(req.user._id)) {
    return res
      .status(403)
      .json({ error: "Тільки власник може видалити кімнату" });
  }
  // Soft-archive instead of hard-deleting — preserves grades/history and
  // gives the owner a chance to restore.
  room.archived = true;
  await room.save();
  return res.status(200).json({ ok: true, archived: true });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();
  if (req.method === "GET") return getRoom(req, res);
  if (req.method === "PATCH") return patchRoom(req, res);
  if (req.method === "DELETE") return deleteRoom(req, res);
  res.setHeader("Allow", "GET, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
});
