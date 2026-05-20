import { connectToDatabase } from "../_lib/db.js";
import { User } from "../_lib/models/index.js";
import { requireAuth, publicUser } from "../_lib/auth.js";
import { parseOr400, updateProfileSchema } from "../_lib/validate.js";
import { COSMETIC_CATALOG, getCosmetic, publicCosmetic } from "../_lib/cosmetics.js";

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

function inventoryFromProfile(profile) {
  return profile.ownedCosmetics
    .map((id) => getCosmetic(id))
    .filter(Boolean);
}

function shopForProfile(profile) {
  return COSMETIC_CATALOG.map((item) =>
    publicCosmetic(item, profile.ownedCosmetics),
  );
}

async function getProfile(req, res) {
  const profile = defaultProfile(req.user.profileStyle);
  return res.status(200).json({
    user: publicUser(req.user),
    profile,
    inventory: inventoryFromProfile(profile),
    shop: {
      items: shopForProfile(profile),
      balance: req.user.totals?.coins ?? 0,
    },
  });
}

async function patchProfile(req, res) {
  const body = parseOr400(res, updateProfileSchema, req.body);
  if (!body) return;

  const user = await User().findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const current = defaultProfile(user.profileStyle);
  const nextProfile = {
    ...current,
    ...(body.profile ?? {}),
  };

  const activeMap = {
    title: ["activeTitleId", "title"],
    banner: ["activeBannerId", "banner"],
    frame: ["activeFrameId", "frame"],
    accent: ["activeAccentId", "accent"],
  };

  for (const [slot, [field, type]] of Object.entries(activeMap)) {
    if (!(slot in (body.active ?? {}))) continue;
    const id = body.active[slot];
    const item = id ? getCosmetic(id) : null;
    if (id && (!item || item.type !== type || !current.ownedCosmetics.includes(id))) {
      return res.status(400).json({
        error: "Цю косметику не куплено або вона іншого типу",
        field: `active.${slot}`,
      });
    }
    nextProfile[field] = id;
  }

  user.profileStyle = {
    status: nextProfile.status,
    bio: nextProfile.bio,
    favoriteStack: nextProfile.favoriteStack,
    ownedCosmetics: nextProfile.ownedCosmetics,
    activeTitleId: nextProfile.activeTitleId,
    activeBannerId: nextProfile.activeBannerId,
    activeFrameId: nextProfile.activeFrameId,
    activeAccentId: nextProfile.activeAccentId,
  };

  if (body.avatarDataUrl) {
    user.avatarUrl = body.avatarDataUrl;
  }

  await user.save();
  const profile = defaultProfile(user.profileStyle);

  return res.status(200).json({
    user: publicUser(user),
    profile,
    inventory: inventoryFromProfile(profile),
    shop: {
      items: shopForProfile(profile),
      balance: user.totals?.coins ?? 0,
    },
  });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();

  if (req.method === "GET") return getProfile(req, res);
  if (req.method === "PATCH") return patchProfile(req, res);

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
});
