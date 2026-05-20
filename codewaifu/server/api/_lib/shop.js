import { Types } from "mongoose";
import { ShopItem } from "./models/index.js";
import { findRoomOr404, getMembership } from "./rooms.js";

/*
 * Shop access helpers + projections.
 *
 * Shop items live inside rooms. Members can view + buy; teachers (room
 * staff) can create/edit/archive. We don't restrict to "students only" —
 * a teacher who's a student in another room can buy there. The auth
 * decisions are based on per-room membership, not global role.
 */

export function isValidObjectId(id) {
  return typeof id === "string" && Types.ObjectId.isValid(id);
}

export async function findShopItemOr404(res, id) {
  if (!isValidObjectId(id)) {
    res.status(404).json({ error: "Товар не знайдено" });
    return null;
  }
  const item = await ShopItem().findById(id);
  if (!item) {
    res.status(404).json({ error: "Товар не знайдено" });
    return null;
  }
  return item;
}

/**
 * Wrap a handler that operates on /api/shop/[id]/* — checks the caller
 * is a member of the item's room.
 */
export function requireShopItemMember(handler) {
  return async (req, res) => {
    const item = await findShopItemOr404(res, req.query.id);
    if (!item) return;
    const room = await findRoomOr404(res, String(item.roomId));
    if (!room) return;
    const membership = await getMembership(room._id, req.user._id);
    if (!membership) {
      return res
        .status(403)
        .json({ error: "Ти не учасник кімнати цього товару" });
    }
    req.shopItem = item;
    req.room = room;
    req.membership = membership;
    req.isStaff =
      String(room.ownerId) === String(req.user._id) ||
      ["teacher", "co_teacher"].includes(membership.roleInRoom);
    return handler(req, res);
  };
}

export function requireShopItemTeacher(handler) {
  return requireShopItemMember(async (req, res) => {
    if (!req.isStaff) {
      return res
        .status(403)
        .json({ error: "Тільки викладачі керують магазином" });
    }
    return handler(req, res);
  });
}

const KIND_LABELS = {
  auto_pass: "Автомат",
  retake: "Перездача",
  extra_attempt: "Додаткова спроба",
  title: "Титул",
  cosmetic: "Косметика",
  custom: "Інше",
};

export function publicShopItem(item, { myPurchases } = {}) {
  if (!item) return null;
  const o = item.toObject ? item.toObject() : item;
  return {
    id: String(o._id),
    roomId: String(o.roomId),
    title: o.title,
    description: o.description ?? "",
    cost: o.cost,
    kind: o.kind,
    kindLabel: KIND_LABELS[o.kind] ?? o.kind,
    payload: o.payload ?? {},
    stock: typeof o.stock === "number" ? o.stock : -1,
    unlimited: !(typeof o.stock === "number" && o.stock >= 0),
    archived: Boolean(o.archived),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    // Number of times the caller has bought this item — used to show
    // "Already bought" badges in the UI.
    myPurchaseCount: myPurchases ?? 0,
  };
}

export function publicPurchase(purchase, { item, user } = {}) {
  if (!purchase) return null;
  const p = purchase.toObject ? purchase.toObject() : purchase;
  return {
    id: String(p._id),
    userId: String(p.userId),
    user: user
      ? {
          id: String(user._id ?? user.id),
          name: user.name ?? null,
          email: user.email ?? null,
          avatarUrl: user.avatarUrl ?? null,
        }
      : null,
    shopItemId: String(p.shopItemId),
    item: item
      ? {
          id: String(item._id ?? item.id),
          title: item.title,
          kind: item.kind,
          kindLabel: KIND_LABELS[item.kind] ?? item.kind,
          payload: item.payload ?? {},
        }
      : null,
    cost: p.cost,
    status: p.status,
    createdAt: p.createdAt,
  };
}
