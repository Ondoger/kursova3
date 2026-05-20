import { connectToDatabase } from "../../_lib/db.js";
import {
  ShopItem,
  Purchase,
  RoomMember,
  PointsLedger,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import {
  requireShopItemMember,
  publicShopItem,
  publicPurchase,
} from "../../_lib/shop.js";

/*
 * POST /api/shop/[id]/buy
 *
 * Step-by-step, with rollback on partial failure:
 *
 *   1. Atomically decrement RoomMember.coins by `cost`, gated on
 *      `coins >= cost`. If zero docs match → "не вистачає коїнів".
 *   2. If the item has finite stock, atomically decrement it gated on
 *      `stock > 0`. If zero docs match → out of stock; refund coins
 *      from step 1.
 *   3. Create the Purchase record + PointsLedger entry.
 *   4. Mirror the coin deduction to User.totals.
 *
 * Why no MongoDB transactions: they require an explicit replica-set
 * session and add ~50ms latency. The compensating-rollback pattern above
 * is good enough for this scale and matches Atlas free-tier perf.
 *
 * Failure modes & their handling:
 *   - User refresh between (1) and (3): they "lost" `cost` coins until
 *     the next request times out. Negligible because (1)→(3) is <50ms
 *     in normal conditions, and even if it spans a restart, the next
 *     buy attempt restarts from scratch (the previous decrement already
 *     happened, no double-charge).
 *   - Stock race: covered by step 2 refunding.
 */
export default requireAuth(
  requireShopItemMember(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (req.shopItem.archived) {
      return res
        .status(400)
        .json({ error: "Цей товар архівований і не продається" });
    }
    if (req.isStaff) {
      return res
        .status(400)
        .json({ error: "Викладачі не купують у власній кімнаті" });
    }

    await connectToDatabase();
    const cost = req.shopItem.cost;
    const userId = req.user._id;
    const roomId = req.room._id;
    const itemId = req.shopItem._id;

    // 1. Atomic coin deduction.
    const memberAfter = await RoomMember().findOneAndUpdate(
      { roomId, userId, coins: { $gte: cost } },
      { $inc: { coins: -cost } },
      { returnDocument: "after" },
    );
    if (!memberAfter) {
      return res
        .status(402)
        .json({ error: "Недостатньо коїнів у цій кімнаті" });
    }

    // 2. Atomic stock decrement (skipped for unlimited items: stock < 0).
    let stockOk = true;
    if (typeof req.shopItem.stock === "number" && req.shopItem.stock >= 0) {
      const itemAfter = await ShopItem().findOneAndUpdate(
        { _id: itemId, stock: { $gt: 0 } },
        { $inc: { stock: -1 } },
        { returnDocument: "after" },
      );
      if (!itemAfter) {
        stockOk = false;
        // 2a. Refund coins.
        await RoomMember().updateOne(
          { roomId, userId },
          { $inc: { coins: cost } },
        );
        return res
          .status(409)
          .json({ error: "Товар закінчився, коїни повернуто" });
      }
      // Refresh the in-memory shop item so the response includes the
      // post-decrement stock.
      req.shopItem.stock = itemAfter.stock;
    }

    // 3. Create purchase + ledger entry. If any of these throw mid-way
    //    we already deducted coins → wrap in try/catch and refund.
    let purchase;
    try {
      purchase = await Purchase().create({
        userId,
        shopItemId: itemId,
        roomId,
        cost,
        status: "granted",
      });
      await PointsLedger().create({
        userId,
        roomId,
        delta: -cost,
        kind: "purchase",
        reason: `Purchase: "${req.shopItem.title}"`,
        refType: "purchase",
        refId: purchase._id,
      });
      // 4. Mirror to user totals.
      await User().updateOne(
        { _id: userId },
        { $inc: { "totals.coins": -cost } },
      );
    } catch (e) {
      console.error("[buy] post-deduction error:", e);
      // Best-effort rollback.
      await RoomMember().updateOne(
        { roomId, userId },
        { $inc: { coins: cost } },
      );
      if (stockOk && typeof req.shopItem.stock === "number" && req.shopItem.stock >= 0) {
        await ShopItem().updateOne(
          { _id: itemId },
          { $inc: { stock: 1 } },
        );
      }
      if (purchase) {
        await Purchase().deleteOne({ _id: purchase._id });
      }
      return res.status(500).json({ error: "Помилка під час покупки" });
    }

    return res.status(200).json({
      purchase: publicPurchase(purchase, {
        item: req.shopItem,
        user: req.user,
      }),
      item: publicShopItem(req.shopItem, { myPurchases: undefined }),
      balance: {
        coins: memberAfter.coins,
        xp: memberAfter.xp ?? 0,
      },
    });
  }),
);
