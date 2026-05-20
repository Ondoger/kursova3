import { connectToDatabase } from "../../../_lib/db.js";
import { ShopItem, Purchase } from "../../../_lib/models/index.js";
import { requireAuth } from "../../../_lib/auth.js";
import {
  parseOr400,
  createShopItemSchema,
} from "../../../_lib/validate.js";
import {
  findRoomOr404,
  getMembership,
} from "../../../_lib/rooms.js";
import { publicShopItem } from "../../../_lib/shop.js";

/*
 *  GET  /api/rooms/[id]/shop  — list shop catalog (any member)
 *  POST /api/rooms/[id]/shop  — create new item (teacher)
 *
 * Catalog hides archived items from students; teachers see them in case
 * they want to un-archive.
 */

async function listShop(req, res) {
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
  if (!isStaff) filter.archived = { $ne: true };

  const items = await ShopItem().find(filter).sort({ archived: 1, cost: 1 }).lean();

  // Count caller's purchases per item so the UI can render "Bought 2x"
  // / disable buttons when stock is exhausted for that user.
  const itemIds = items.map((i) => i._id);
  const myCounts = itemIds.length
    ? await Purchase().aggregate([
        {
          $match: {
            userId: req.user._id,
            shopItemId: { $in: itemIds },
            status: { $in: ["granted", "consumed"] },
          },
        },
        { $group: { _id: "$shopItemId", n: { $sum: 1 } } },
      ])
    : [];
  const countById = new Map(
    myCounts.map((c) => [String(c._id), c.n]),
  );

  return res.status(200).json({
    items: items.map((it) =>
      publicShopItem(it, { myPurchases: countById.get(String(it._id)) ?? 0 }),
    ),
    balance: {
      coins: membership.coins ?? 0,
      xp: membership.xp ?? 0,
    },
  });
}

async function createShop(req, res) {
  const room = await findRoomOr404(res, req.query.id, { archived: "exclude" });
  if (!room) return;
  const membership = await getMembership(room._id, req.user._id);
  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    (membership &&
      ["teacher", "co_teacher"].includes(membership.roleInRoom));
  if (!isStaff) {
    return res
      .status(403)
      .json({ error: "Тільки викладачі додають товари в магазин" });
  }

  const body = parseOr400(res, createShopItemSchema, req.body);
  if (!body) return;

  const item = await ShopItem().create({
    roomId: room._id,
    title: body.title,
    description: body.description ?? "",
    cost: body.cost,
    kind: body.kind,
    stock: body.stock,
    payload: body.payload ?? {},
    archived: false,
  });
  return res.status(201).json({ item: publicShopItem(item) });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();
  if (req.method === "GET") return listShop(req, res);
  if (req.method === "POST") return createShop(req, res);
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
});
