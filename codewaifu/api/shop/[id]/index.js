import { connectToDatabase } from "../../_lib/db.js";
import { ShopItem } from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import {
  parseOr400,
  patchShopItemSchema,
} from "../../_lib/validate.js";
import {
  requireShopItemMember,
  requireShopItemTeacher,
  publicShopItem,
} from "../../_lib/shop.js";

/*
 *  GET    /api/shop/[id]  — view single item (any member)
 *  PATCH  /api/shop/[id]  — edit (teacher)
 *  DELETE /api/shop/[id]  — soft-archive (teacher) — preserves Purchase history
 */

async function getItem(req, res) {
  return res.status(200).json({ item: publicShopItem(req.shopItem) });
}

async function patchItem(req, res) {
  const body = parseOr400(res, patchShopItemSchema, req.body);
  if (!body) return;
  const item = req.shopItem;
  for (const k of [
    "title",
    "description",
    "cost",
    "kind",
    "stock",
    "payload",
    "archived",
  ]) {
    if (body[k] !== undefined) item[k] = body[k];
  }
  await item.save();
  return res.status(200).json({ item: publicShopItem(item) });
}

async function deleteItem(req, res) {
  // Always soft-delete: hard-delete would orphan Purchase records.
  req.shopItem.archived = true;
  await req.shopItem.save();
  return res.status(200).json({ ok: true, archived: true });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();
  if (req.method === "GET") return requireShopItemMember(getItem)(req, res);
  if (req.method === "PATCH") return requireShopItemTeacher(patchItem)(req, res);
  if (req.method === "DELETE") return requireShopItemTeacher(deleteItem)(req, res);
  res.setHeader("Allow", "GET, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
});
