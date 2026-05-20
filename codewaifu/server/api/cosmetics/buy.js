import { connectToDatabase } from "../_lib/db.js";
import { User } from "../_lib/models/index.js";
import { requireAuth, publicUser } from "../_lib/auth.js";
import { getCosmetic, COSMETIC_CATALOG, publicCosmetic } from "../_lib/cosmetics.js";

function defaultProfile(profile = {}) {
  return {
    status: profile.status ?? "Пишу код і збираю XP.",
    bio: profile.bio ?? "",
    favoriteStack: profile.favoriteStack ?? "",
    ownedCosmetics: Array.isArray(profile.ownedCosmetics)
      ? profile.ownedCosmetics
      : [],
    activeTitleId: profile.activeTitleId ?? null,
    activeBannerId: profile.activeBannerId ?? null,
    activeFrameId: profile.activeFrameId ?? null,
    activeAccentId: profile.activeAccentId ?? null,
  };
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cosmeticId = String(req.body?.cosmeticId ?? "");
  const cosmetic = getCosmetic(cosmeticId);
  if (!cosmetic) {
    return res.status(404).json({ error: "Косметику не знайдено" });
  }

  await connectToDatabase();
  const user = await User().findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const profile = defaultProfile(user.profileStyle);
  if (profile.ownedCosmetics.includes(cosmeticId)) {
    return res.status(200).json({
      ok: true,
      alreadyOwned: true,
      user: publicUser(user),
      balance: user.totals?.coins ?? 0,
      ownedCosmetics: profile.ownedCosmetics,
      items: COSMETIC_CATALOG.map((item) => publicCosmetic(item, profile.ownedCosmetics)),
    });
  }

  const balance = user.totals?.coins ?? 0;
  if (balance < cosmetic.cost) {
    return res.status(402).json({
      error: `Не вистачає coins: потрібно ще ${cosmetic.cost - balance}`,
    });
  }

  profile.ownedCosmetics = [...profile.ownedCosmetics, cosmeticId];
  user.profileStyle = profile;
  user.totals = {
    ...(user.totals ?? {}),
    coins: balance - cosmetic.cost,
    xp: user.totals?.xp ?? 0,
  };
  await user.save();

  return res.status(200).json({
    ok: true,
    user: publicUser(user),
    balance: user.totals.coins,
    ownedCosmetics: profile.ownedCosmetics,
    items: COSMETIC_CATALOG.map((item) => publicCosmetic(item, profile.ownedCosmetics)),
  });
});
