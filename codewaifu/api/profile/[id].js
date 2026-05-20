import { connectToDatabase } from "../_lib/db.js";
import { RoomMember, User } from "../_lib/models/index.js";
import { requireAuth, publicUser } from "../_lib/auth.js";
import { isValidObjectId } from "../_lib/rooms.js";
import { getCosmetic } from "../_lib/cosmetics.js";

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

function activeCosmetics(profile) {
  return {
    title: profile.activeTitleId ? getCosmetic(profile.activeTitleId) : null,
    banner: profile.activeBannerId ? getCosmetic(profile.activeBannerId) : null,
    frame: profile.activeFrameId ? getCosmetic(profile.activeFrameId) : null,
    accent: profile.activeAccentId ? getCosmetic(profile.activeAccentId) : null,
  };
}

async function getProfile(req, res) {
  const id = req.query.id;
  if (!isValidObjectId(id)) {
    return res.status(404).json({ error: "Профіль не знайдено" });
  }

  const user = await User().findById(id).lean();
  if (!user) {
    return res.status(404).json({ error: "Профіль не знайдено" });
  }

  const [sharedRoom] = await RoomMember().aggregate([
    { $match: { userId: { $in: [req.user._id, user._id] } } },
    { $group: { _id: "$roomId", users: { $addToSet: "$userId" }, roles: { $push: "$roleInRoom" } } },
    { $match: { users: { $all: [req.user._id, user._id] } } },
    { $limit: 1 },
  ]);
  if (!sharedRoom && String(req.user._id) !== String(user._id)) {
    return res.status(403).json({ error: "Профіль доступний тільки учасникам спільної кімнати" });
  }

  const profile = defaultProfile(user.profileStyle);
  return res.status(200).json({
    user: publicUser(user),
    profile,
    activeCosmetics: activeCosmetics(profile),
    canEdit: String(req.user._id) === String(user._id),
  });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();

  if (req.method === "GET") return getProfile(req, res);

  res.setHeader("Allow", "GET");
  return res.status(405).json({ error: "Method not allowed" });
});
