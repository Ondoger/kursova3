import { connectToDatabase } from "../_lib/db.js";
import { requireAuth } from "../_lib/auth.js";
import { COSMETIC_CATALOG, publicCosmetic } from "../_lib/cosmetics.js";

function ownedIds(user) {
  return Array.isArray(user.profileStyle?.ownedCosmetics)
    ? user.profileStyle.ownedCosmetics
    : [];
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectToDatabase();
  const owned = ownedIds(req.user);
  return res.status(200).json({
    items: COSMETIC_CATALOG.map((item) => publicCosmetic(item, owned)),
    balance: req.user.totals?.coins ?? 0,
    ownedCosmetics: owned,
  });
});
