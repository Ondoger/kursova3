import { connectToDatabase } from "../_lib/db.js";
import { Room, RoomMember, User } from "../_lib/models/index.js";
import { requireAuth } from "../_lib/auth.js";
import { generateUniqueInviteCode } from "../_lib/invite.js";
import { parseOr400, createRoomSchema } from "../_lib/validate.js";
import { publicRoom } from "../_lib/rooms.js";

/*
 *  GET  /api/rooms       — list rooms the current user belongs to
 *  POST /api/rooms       — teachers create a new room (auto-joins as teacher)
 *
 * Both methods live in one file because Vercel's filesystem routing
 * dispatches by URL path; we branch on req.method here.
 */

async function listRooms(req, res) {
  const memberships = await RoomMember()
    .find({ userId: req.user._id })
    .lean();
  if (memberships.length === 0) return res.status(200).json({ rooms: [] });

  const roomIds = memberships.map((m) => m.roomId);
  const rooms = await Room().find({ _id: { $in: roomIds } }).lean();

  // Eager-load owner names so the list shows "by Іван Петренко".
  const ownerIds = [...new Set(rooms.map((r) => String(r.ownerId)))];
  const owners = await User()
    .find({ _id: { $in: ownerIds } }, { name: 1, email: 1 })
    .lean();
  const ownerById = new Map(owners.map((u) => [String(u._id), u]));

  // Member counts. One round-trip per call (could be batched, but for
  // a teacher with <50 rooms it's cheap).
  const memberCounts = await RoomMember().aggregate([
    { $match: { roomId: { $in: roomIds } } },
    { $group: { _id: "$roomId", count: { $sum: 1 } } },
  ]);
  const countById = new Map(
    memberCounts.map((m) => [String(m._id), m.count]),
  );

  const membershipByRoom = new Map(
    memberships.map((m) => [String(m.roomId), m]),
  );

  const items = rooms.map((r) => {
    const owner = ownerById.get(String(r.ownerId));
    const membership = membershipByRoom.get(String(r._id));
    return {
      ...publicRoom(r, membership, {
        ownerName: owner?.name ?? owner?.email ?? null,
      }),
      memberCount: countById.get(String(r._id)) ?? 0,
    };
  });

  // Sort: active first, then most-recently-created.
  items.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return res.status(200).json({ rooms: items });
}

async function createRoom(req, res) {
  if (req.user.role !== "teacher") {
    return res
      .status(403)
      .json({ error: "Тільки викладачі можуть створювати кімнати" });
  }
  const body = parseOr400(res, createRoomSchema, req.body);
  if (!body) return;

  const inviteCode = await generateUniqueInviteCode();
  const room = await Room().create({
    ownerId: req.user._id,
    name: body.name,
    description: body.description ?? "",
    inviteCode,
  });

  // Owner is auto-joined as a teacher member so the same membership-based
  // access rules apply (rather than a separate "owner" code path).
  const membership = await RoomMember().create({
    roomId: room._id,
    userId: req.user._id,
    roleInRoom: "teacher",
  });

  return res.status(201).json({
    room: {
      ...publicRoom(room.toObject(), membership.toObject(), {
        ownerName: req.user.name,
      }),
      memberCount: 1,
    },
  });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();

  if (req.method === "GET") return listRooms(req, res);
  if (req.method === "POST") return createRoom(req, res);

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
});
