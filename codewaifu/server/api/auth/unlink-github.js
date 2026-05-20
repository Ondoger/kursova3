import { connectToDatabase } from "../_lib/db.js";
import { User } from "../_lib/models/index.js";
import { requireAuth, publicUser } from "../_lib/auth.js";

/*
 * POST /api/auth/unlink-github
 *
 * Removes the GitHub linkage from the current account. Doesn't revoke
 * the GitHub OAuth grant on github.com — to truly disconnect, the user
 * must also revoke our app at https://github.com/settings/applications.
 * We mention this in the UI tooltip rather than spamming a separate
 * GitHub API call.
 *
 * If the user adopted the GitHub avatar as their main avatar (we set
 * avatarUrl=githubAvatarUrl when there was none), we leave it in place.
 * They can change it later in profile settings.
 */
export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  await connectToDatabase();

  // $unset on indexed fields needs the field to actually be unset (not
  // just null) so that the unique-sparse index stops applying. Use
  // $set: null instead — sparse only excludes missing values, not nulls.
  // For our schema, githubId index is `unique: true, sparse: true` so
  // we need to truly $unset.
  const user = await User().findByIdAndUpdate(
    req.user._id,
    {
      $unset: { githubId: "" },
      $set: {
        githubLogin: null,
        githubAvatarUrl: null,
        githubLinkedAt: null,
      },
    },
    { returnDocument: "after" },
  );

  return res.status(200).json({ ok: true, user: publicUser(user) });
});
