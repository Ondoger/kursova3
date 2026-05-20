import mongoose from "mongoose";

const { Schema, model, models, deleteModel } = mongoose;

/*
 * Mongoose schemas for the GitQuest education platform.
 *
 * Conventions:
 * - All models are accessed via the helpers at the bottom (e.g. `User()`)
 *   so we re-use the connection's compiled model instead of recompiling
 *   per cold start (mongoose throws OverwriteModelError otherwise).
 * - timestamps:true → createdAt/updatedAt for free.
 * - We use ObjectId refs even though Mongo doesn't enforce them, because
 *   .populate() is cleaner than ad-hoc joins.
 * - Indexes are declared explicitly; remember to set autoIndex:false in
 *   prod and run `mongoose.syncIndexes()` from a one-off script if needed.
 */

/* ── Users ───────────────────────────────────────────────────────────── */

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["teacher", "student"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: null },
    // GitHub linkage. `githubId` is the numeric user id (immutable, unlike
    // login which can be renamed). Indexed unique-when-set so the same
    // GitHub account can't be linked to two users.
    githubLogin: { type: String, default: null, trim: true, index: true },
    githubId: { type: Number },
    githubAvatarUrl: { type: String, default: null },
    githubLinkedAt: { type: Date, default: null },
    // Encrypted access token — for now we store nothing (not needed for
    // link-only). Phase 7 may add this so we can fetch private repos.
    emailVerifiedAt: { type: Date, default: null },
    // Aggregated cross-room counters (handy for a global profile view).
    totals: {
      coins: { type: Number, default: 0 },
      xp: { type: Number, default: 0 },
    },
    profileStyle: {
      status: { type: String, default: "Пишу код і збираю XP." },
      bio: { type: String, default: "" },
      favoriteStack: { type: String, default: "" },
      ownedCosmetics: [{ type: String }],
      activeTitleId: { type: String, default: null },
      activeBannerId: { type: String, default: null },
      activeFrameId: { type: String, default: null },
      activeAccentId: { type: String, default: null },
      activeTitlePurchaseId: { type: Schema.Types.ObjectId, default: null },
      activeBannerPurchaseId: { type: Schema.Types.ObjectId, default: null },
      activeFramePurchaseId: { type: Schema.Types.ObjectId, default: null },
      activeAccentPurchaseId: { type: Schema.Types.ObjectId, default: null },
    },
  },
  { timestamps: true },
);
UserSchema.index(
  { githubId: 1 },
  {
    unique: true,
    partialFilterExpression: { githubId: { $type: "number" } },
  },
);

/* ── Email verification codes (used during signup + password reset) ─── */

const EmailCodeSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    purpose: {
      type: String,
      enum: ["signup", "reset", "login"],
      required: true,
    },
    codeHash: { type: String, required: true }, // never store the raw 6-digit code
    // expiresAt is indexed via the TTL index below — don't set index:true here
    // or Mongoose creates two competing indexes.
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
// TTL: Mongo will auto-delete documents after expiresAt. expireAfterSeconds:0
// means "delete when expiresAt is reached" (not "0s after now").
EmailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* ── Sessions (refresh tokens) — useful if we ever rotate JWTs ───────── */

const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* ── Rooms (classes / groups created by a teacher) ───────────────────── */

const RoomSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    inviteCode: { type: String, required: true, unique: true, index: true },
    archived: { type: Boolean, default: false, index: true },
    settings: {
      // Whether students can see each other's grades on the leaderboard.
      publicLeaderboard: { type: Boolean, default: true },
      // Whether the chat is enabled.
      chatEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

const RoomMemberSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roleInRoom: {
      type: String,
      enum: ["teacher", "co_teacher", "student"],
      default: "student",
    },
    joinedAt: { type: Date, default: Date.now },
    // Per-room counters — kept here so leaderboard queries don't need to
    // aggregate the whole points_ledger every time.
    coins: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
  },
  { timestamps: true },
);
RoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

/* ── Assignments + Submissions ───────────────────────────────────────── */

const AssignmentSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    deadlineAt: { type: Date, default: null, index: true },
    maxPoints: { type: Number, default: 100 },
    rewardCoins: { type: Number, default: 50 },
    // Optional hints for the (future) auto-checker.
    githubHint: {
      // e.g. /^lab1\//   — paths that must exist
      requiredPaths: [{ type: String }],
      // minimum number of commits that must touch the repo since assignment
      minCommits: { type: Number, default: 0 },
    },
    attachment: {
      fileName: { type: String, trim: true },
      mime: { type: String, trim: true },
      size: { type: Number },
      dataUrl: { type: String },
    },
    publishedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

const SubmissionSchema = new Schema(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    repoUrl: { type: String, default: null },
    prUrl: { type: String, default: null },
    commitSha: { type: String, default: null },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "submitted", "returned", "graded"],
      default: "draft",
      index: true,
    },
    submittedAt: { type: Date, default: null },
    returnedAt: { type: Date, default: null },
    resubmittedAfterReturnAt: { type: Date, default: null },
  },
  { timestamps: true },
);
SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

const GradeSchema = new Schema(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
      unique: true,
      index: true,
    },
    points: { type: Number, required: true },
    awardedCoins: { type: Number, default: 0 },
    feedback: { type: String, default: "" },
    gradedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    gradedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const CodeReviewSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    submissionId: { type: Schema.Types.ObjectId, ref: "Submission", required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    summary: { type: String, required: true, trim: true },
    strengths: { type: String, default: "", trim: true },
    suggestions: { type: String, default: "", trim: true },
    rewardCoins: { type: Number, default: 5 },
    awardedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
CodeReviewSchema.index({ submissionId: 1, reviewerId: 1 }, { unique: true });

/* ── Points / coins / shop ───────────────────────────────────────────── */

const PointsLedgerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", default: null, index: true },
    delta: { type: Number, required: true }, // can be negative (purchases)
    kind: {
      type: String,
      enum: ["grade", "bonus", "penalty", "purchase", "refund", "admin"],
      required: true,
    },
    reason: { type: String, default: "" },
    refType: { type: String, default: null }, // "submission" | "purchase" | ...
    refId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

const ShopItemSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    cost: { type: Number, required: true, min: 0 },
    kind: {
      type: String,
      enum: ["auto_pass", "retake", "extra_attempt", "title", "cosmetic", "custom"],
      required: true,
    },
    // Free-form data that depends on kind (e.g. {assignmentId} for retake).
    payload: { type: Schema.Types.Mixed, default: {} },
    archived: { type: Boolean, default: false, index: true },
    stock: { type: Number, default: -1 }, // -1 = unlimited
  },
  { timestamps: true },
);

const PurchaseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    shopItemId: { type: Schema.Types.ObjectId, ref: "ShopItem", required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    cost: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "granted", "consumed", "revoked"],
      default: "granted",
    },
  },
  { timestamps: true },
);

const ContestTaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    maxPoints: { type: Number, default: 100, min: 1 },
  },
  { _id: true },
);

const ContestSubmissionSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    repoUrl: { type: String, default: "" },
    prUrl: { type: String, default: "" },
    note: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now, index: true },
    points: { type: Number, default: null },
    feedback: { type: String, default: "" },
    gradedAt: { type: Date, default: null, index: true },
    gradedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true },
);

const MiniTournamentSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: {
      type: String,
      enum: ["code_contest"],
      default: "code_contest",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    metric: {
      type: String,
      enum: ["points", "submissions", "graded", "activity"],
      default: "points",
      index: true,
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    tasks: { type: [ContestTaskSchema], default: [] },
    submissions: { type: [ContestSubmissionSchema], default: [] },
    reviewCompletedAt: { type: Date, default: null, index: true },
    rankingsPublishedAt: { type: Date, default: null, index: true },
    reward: { type: String, default: "" },
    winnerTeamName: { type: String, default: "" },
    winnerNote: { type: String, default: "" },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

const WeeklyChallengeSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["metric", "knowledge_sharing"],
      default: "metric",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    topic: { type: String, default: "", trim: true },
    metric: {
      type: String,
      enum: ["points", "submissions", "graded", "activity"],
      default: "activity",
      index: true,
    },
    target: { type: Number, default: 1, min: 1 },
    weekStart: { type: Date, required: true, index: true },
    weekEnd: { type: Date, required: true, index: true },
    reward: { type: String, default: "" },
    rewardCoins: { type: Number, default: 20, min: 0 },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

const WeeklyChallengeSubmissionSchema = new Schema(
  {
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyChallenge",
      required: true,
      index: true,
    },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true, trim: true },
    mime: { type: String, required: true, trim: true },
    size: { type: Number, required: true },
    dataUrl: { type: String, required: true },
    note: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now, index: true },
    approvedAt: { type: Date, default: null, index: true },
    approvedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    awardedCoins: { type: Number, default: 0 },
  },
  { timestamps: true },
);
WeeklyChallengeSubmissionSchema.index({ challengeId: 1, studentId: 1 }, { unique: true });

const TeamQuestSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["shared_codebase"],
      default: "shared_codebase",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    reward: { type: String, default: "" },
    teams: [
      {
        name: { type: String, required: true },
        memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
        repoUrl: { type: String, default: "" },
        demoUrl: { type: String, default: "" },
        note: { type: String, default: "" },
        submittedAt: { type: Date, default: null },
        teacherNote: { type: String, default: "" },
        analytics: {
          fetchedAt: { type: Date, default: null },
          summary: { type: Schema.Types.Mixed, default: {} },
          contributors: { type: [Schema.Types.Mixed], default: [] },
        },
      },
    ],
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

/* ── Chat (room-scoped) ──────────────────────────────────────────────── */

const MessageSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, default: "" },
    parentId: { type: Schema.Types.ObjectId, ref: "Message", default: null }, // threading
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
MessageSchema.index({ roomId: 1, createdAt: -1 }); // pagination

const AttachmentSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: "Message", required: true, index: true },
    blobUrl: { type: String, required: true },
    filename: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true },
);

/* ── Achievements (global) ───────────────────────────────────────────── */

const AchievementSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary"],
      default: "common",
    },
    icon: { type: String, default: null },
    // Free-form criteria — interpreted server-side by an evaluator.
    criteria: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const UserAchievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    achievementId: {
      type: Schema.Types.ObjectId,
      ref: "Achievement",
      required: true,
      index: true,
    },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

/* ── Model accessors ─────────────────────────────────────────────────── */
/*
 * IMPORTANT: do NOT export the model objects directly at module scope.
 * On serverless cold start the first import triggers schema compilation,
 * but on a warm container the second import would re-compile the schema
 * and throw OverwriteModelError. Using `models[name] || model(name, schema)`
 * lazy-resolves the registered model.
 */

export const User = () => models.User || model("User", UserSchema);
export const EmailCode = () => models.EmailCode || model("EmailCode", EmailCodeSchema);
export const Session = () => models.Session || model("Session", SessionSchema);
export const Room = () => models.Room || model("Room", RoomSchema);
export const RoomMember = () => models.RoomMember || model("RoomMember", RoomMemberSchema);
export const Assignment = () => {
  const existing = models.Assignment;
  if (existing && !existing.schema.path("attachment.fileName")) {
    deleteModel("Assignment");
  }
  return models.Assignment || model("Assignment", AssignmentSchema);
};
export const Submission = () => models.Submission || model("Submission", SubmissionSchema);
export const Grade = () => models.Grade || model("Grade", GradeSchema);
export const CodeReview = () => models.CodeReview || model("CodeReview", CodeReviewSchema);
export const PointsLedger = () =>
  models.PointsLedger || model("PointsLedger", PointsLedgerSchema);
export const ShopItem = () => models.ShopItem || model("ShopItem", ShopItemSchema);
export const Purchase = () => models.Purchase || model("Purchase", PurchaseSchema);
export const MiniTournament = () => {
  const existing = models.MiniTournament;
  if (
    existing &&
    (!existing.schema.path("tasks") ||
      !existing.schema.path("submissions") ||
      !existing.schema.path("rankingsPublishedAt"))
  ) {
    deleteModel("MiniTournament");
  }
  return models.MiniTournament || model("MiniTournament", MiniTournamentSchema);
};
export const WeeklyChallenge = () => {
  const existing = models.WeeklyChallenge;
  if (
    existing &&
    (!existing.schema.path("type") ||
      !existing.schema.path("topic") ||
      !existing.schema.path("rewardCoins"))
  ) {
    deleteModel("WeeklyChallenge");
  }
  return models.WeeklyChallenge || model("WeeklyChallenge", WeeklyChallengeSchema);
};
export const WeeklyChallengeSubmission = () => {
  const existing = models.WeeklyChallengeSubmission;
  if (existing && !existing.schema.path("approvedAt")) {
    deleteModel("WeeklyChallengeSubmission");
  }
  return models.WeeklyChallengeSubmission ||
    model("WeeklyChallengeSubmission", WeeklyChallengeSubmissionSchema);
};
export const TeamQuest = () => {
  const existing = models.TeamQuest;
  if (
    existing &&
    (!existing.schema.path("type") ||
      !existing.schema.path("teams.repoUrl") ||
      !existing.schema.path("winnerTeamName") ||
      existing.schema.path("metric") ||
      existing.schema.path("target"))
  ) {
    deleteModel("TeamQuest");
  }
  return models.TeamQuest || model("TeamQuest", TeamQuestSchema);
};
export const Message = () => models.Message || model("Message", MessageSchema);
export const Attachment = () => models.Attachment || model("Attachment", AttachmentSchema);
export const Achievement = () =>
  models.Achievement || model("Achievement", AchievementSchema);
export const UserAchievement = () =>
  models.UserAchievement || model("UserAchievement", UserAchievementSchema);
