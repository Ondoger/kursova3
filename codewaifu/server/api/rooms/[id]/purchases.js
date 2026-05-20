import { connectToDatabase } from "../../_lib/db.js";
import {
  Purchase,
  ShopItem,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import {
  findRoomOr404,
  getMembership,
} from "../../_lib/rooms.js";
import { publicPurchase } from "../../_lib/shop.js";

/*
 * GET /api/rooms/[id]/purchases
 *
 * Filtered by role:
 *   - Teacher / co-teacher : every purchase in the room (so they know
 *                            who bought "auto pass" and needs to be
 *                            actually granted in the gradebook).
 *   - Student              : their own purchases only.
 *
 * Optional ?userId=... filter for teachers to drill into one student.
 */
export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectToDatabase();
  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;
  const membership = await getMembership(room._id, req.user._id);
  if (!membership) {
    return res.status(403).json({ error: "Ти не учасник цієї кімнати" });
  }
  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    ["teacher", "co_teacher"].includes(membership.roleInRoom);

  const filter = { roomId: room._id };
  if (!isStaff) {
    // Students see only their own.
    filter.userId = req.user._id;
  } else if (req.query.userId) {
    // Teachers can drill in.
    filter.userId = req.query.userId;
  }

  const purchases = await Purchase()
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  if (purchases.length === 0) {
    return res.status(200).json({ purchases: [] });
  }

  // Hydrate items + users in two round-trips.
  const itemIds = [...new Set(purchases.map((p) => String(p.shopItemId)))];
  const userIds = [...new Set(purchases.map((p) => String(p.userId)))];

  const [items, users] = await Promise.all([
    ShopItem()
      .find({ _id: { $in: itemIds } }, { title: 1, kind: 1 })
      .lean(),
    isStaff
      ? User()
          .find(
            { _id: { $in: userIds } },
            { name: 1, email: 1, avatarUrl: 1 },
          )
          .lean()
      : Promise.resolve([]),
  ]);
  const itemById = new Map(items.map((i) => [String(i._id), i]));
  const userById = new Map(users.map((u) => [String(u._id), u]));

  return res.status(200).json({
    purchases: purchases.map((p) =>
      publicPurchase(p, {
        item: itemById.get(String(p.shopItemId)),
        user: userById.get(String(p.userId)),
      }),
    ),
  });
});
