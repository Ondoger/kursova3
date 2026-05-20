import { connectToDatabase } from "../../_lib/db.js";
import {
  Assignment,
  CodeReview,
  PointsLedger,
  RoomMember,
  Submission,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";
import { createCodeReviewSchema, parseOr400 } from "../../_lib/validate.js";

const REVIEW_REWARD = 5;

function isStaff(room, membership, userId) {
  return (
    String(room.ownerId) === String(userId) ||
    ["teacher", "co_teacher"].includes(membership?.roleInRoom)
  );
}

function publicStudent(user, fallbackId) {
  return {
    id: String(user?._id ?? fallbackId),
    name: user?.name ?? null,
    email: user?.email ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    githubLogin: user?.githubLogin ?? null,
  };
}

function publicAssignmentMini(assignment) {
  return {
    id: String(assignment._id),
    title: assignment.title,
    deadlineAt: assignment.deadlineAt ?? null,
    maxPoints: assignment.maxPoints ?? 100,
  };
}

function publicSubmissionTarget(submission, assignment, author, { reviewCount = 0, myReview = null } = {}) {
  return {
    id: String(submission._id),
    status: submission.status,
    repoUrl: submission.repoUrl ?? null,
    prUrl: submission.prUrl ?? null,
    note: submission.note ?? "",
    submittedAt: submission.submittedAt,
    assignment: publicAssignmentMini(assignment),
    author: publicStudent(author, submission.studentId),
    reviewCount,
    myReview,
  };
}

function publicReview(review, { assignment, submission, reviewer, author } = {}) {
  return {
    id: String(review._id),
    rating: review.rating,
    summary: review.summary,
    strengths: review.strengths ?? "",
    suggestions: review.suggestions ?? "",
    rewardCoins: review.rewardCoins ?? REVIEW_REWARD,
    awardedAt: review.awardedAt ?? null,
    createdAt: review.createdAt,
    assignment: assignment ? publicAssignmentMini(assignment) : null,
    submission: submission
      ? {
          id: String(submission._id),
          repoUrl: submission.repoUrl ?? null,
          prUrl: submission.prUrl ?? null,
          status: submission.status,
        }
      : null,
    reviewer: publicStudent(reviewer, review.reviewerId),
    author: publicStudent(author, review.authorId),
  };
}

async function loadReviewContext(room, staff, currentUserId) {
  const assignmentFilter = { roomId: room._id };
  if (!staff) assignmentFilter.publishedAt = { $ne: null };

  const assignments = await Assignment().find(assignmentFilter).lean();
  const assignmentById = new Map(assignments.map((assignment) => [String(assignment._id), assignment]));
  const assignmentIds = assignments.map((assignment) => assignment._id);
  const submissions = assignmentIds.length
    ? await Submission()
        .find({
          assignmentId: { $in: assignmentIds },
          status: { $in: ["submitted", "returned", "graded"] },
        })
        .sort({ submittedAt: -1, updatedAt: -1 })
        .lean()
    : [];
  const reviews = submissions.length
    ? await CodeReview()
        .find({
          submissionId: { $in: submissions.map((submission) => submission._id) },
        })
        .sort({ createdAt: -1 })
        .lean()
    : [];
  const userIds = [
    ...new Set([
      ...submissions.map((submission) => String(submission.studentId)),
      ...reviews.map((review) => String(review.reviewerId)),
      ...reviews.map((review) => String(review.authorId)),
    ]),
  ];
  const users = userIds.length
    ? await User()
        .find({ _id: { $in: userIds } }, { name: 1, email: 1, avatarUrl: 1, githubLogin: 1 })
        .lean()
    : [];
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const submissionById = new Map(submissions.map((submission) => [String(submission._id), submission]));
  const reviewsBySubmission = new Map();
  for (const review of reviews) {
    const key = String(review.submissionId);
    const list = reviewsBySubmission.get(key) ?? [];
    list.push(review);
    reviewsBySubmission.set(key, list);
  }
  const myReviewBySubmission = new Map(
    reviews
      .filter((review) => String(review.reviewerId) === String(currentUserId))
      .map((review) => [String(review.submissionId), review]),
  );
  return {
    assignments,
    assignmentById,
    submissions,
    submissionById,
    reviews,
    reviewsBySubmission,
    myReviewBySubmission,
    userById,
  };
}

async function listCodeReviews(req, res, room, membership, staff) {
  const context = await loadReviewContext(room, staff, req.user._id);
  const targetSubmissions = context.submissions
    .filter((submission) => staff || String(submission.studentId) !== String(req.user._id))
    .map((submission) => {
      const assignment = context.assignmentById.get(String(submission.assignmentId));
      return publicSubmissionTarget(
        submission,
        assignment,
        context.userById.get(String(submission.studentId)),
        {
          reviewCount: context.reviewsBySubmission.get(String(submission._id))?.length ?? 0,
          myReview: context.myReviewBySubmission.has(String(submission._id))
            ? publicReview(context.myReviewBySubmission.get(String(submission._id)), {
                assignment,
                submission,
                reviewer: req.user,
                author: context.userById.get(String(submission.studentId)),
              })
            : null,
        },
      );
    });
  const queue = staff
    ? targetSubmissions
    : targetSubmissions.filter((target) => !target.myReview);
  const myReviews = context.reviews
    .filter((review) => String(review.reviewerId) === String(req.user._id))
    .map((review) => {
      const submission = context.submissionById.get(String(review.submissionId));
      return publicReview(review, {
        assignment: context.assignmentById.get(String(review.assignmentId)),
        submission,
        reviewer: req.user,
        author: context.userById.get(String(review.authorId)),
      });
    });
  const receivedReviews = context.reviews
    .filter((review) => staff || String(review.authorId) === String(req.user._id))
    .slice(0, staff ? 30 : 100)
    .map((review) => {
      const submission = context.submissionById.get(String(review.submissionId));
      return publicReview(review, {
        assignment: context.assignmentById.get(String(review.assignmentId)),
        submission,
        reviewer: context.userById.get(String(review.reviewerId)),
        author: context.userById.get(String(review.authorId)),
      });
    });

  return res.status(200).json({
    rewardCoins: REVIEW_REWARD,
    isStaff: staff,
    queue,
    myReviews,
    receivedReviews,
    totals: {
      targets: targetSubmissions.length,
      queue: queue.length,
      reviews: context.reviews.length,
      myReviews: myReviews.length,
      receivedReviews: receivedReviews.length,
    },
    membership: {
      coins: membership.coins ?? 0,
      xp: membership.xp ?? 0,
    },
  });
}

async function createReview(req, res, room, membership, staff) {
  if (staff) {
    return res.status(400).json({ error: "Peer review — це студентська активність" });
  }

  const body = parseOr400(res, createCodeReviewSchema, req.body);
  if (!body) return;

  const submission = await Submission().findById(body.submissionId);
  if (!submission || !["submitted", "returned", "graded"].includes(submission.status)) {
    return res.status(404).json({ error: "Сабмішн для review не знайдено" });
  }
  if (String(submission.studentId) === String(req.user._id)) {
    return res.status(400).json({ error: "Не можна review-ити власну роботу" });
  }

  const assignment = await Assignment().findById(submission.assignmentId);
  if (!assignment || String(assignment.roomId) !== String(room._id) || !assignment.publishedAt) {
    return res.status(404).json({ error: "Сабмішн для review не знайдено" });
  }

  const existing = await CodeReview().findOne({
    submissionId: submission._id,
    reviewerId: req.user._id,
  });
  if (existing) {
    return res.status(409).json({ error: "Ти вже зробив review цієї роботи" });
  }

  const review = await CodeReview().create({
    roomId: room._id,
    assignmentId: assignment._id,
    submissionId: submission._id,
    reviewerId: req.user._id,
    authorId: submission.studentId,
    rating: body.rating,
    summary: body.summary,
    strengths: body.strengths ?? "",
    suggestions: body.suggestions ?? "",
    rewardCoins: REVIEW_REWARD,
    awardedAt: new Date(),
  });

  await PointsLedger().create({
    userId: req.user._id,
    roomId: room._id,
    delta: REVIEW_REWARD,
    kind: "bonus",
    reason: `Code review for "${assignment.title}"`,
    refType: "code_review",
    refId: review._id,
  });
  await RoomMember().updateOne(
    { roomId: room._id, userId: req.user._id },
    { $inc: { coins: REVIEW_REWARD, xp: REVIEW_REWARD } },
  );
  await User().updateOne(
    { _id: req.user._id },
    { $inc: { "totals.coins": REVIEW_REWARD, "totals.xp": REVIEW_REWARD } },
  );

  const author = await User()
    .findById(submission.studentId, { name: 1, email: 1, avatarUrl: 1, githubLogin: 1 })
    .lean();

  return res.status(201).json({
    review: publicReview(review, {
      assignment,
      submission,
      reviewer: req.user,
      author,
    }),
    reward: {
      coins: REVIEW_REWARD,
      xp: REVIEW_REWARD,
      balance: {
        coins: (membership.coins ?? 0) + REVIEW_REWARD,
        xp: (membership.xp ?? 0) + REVIEW_REWARD,
      },
    },
  });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();

  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;
  const membership = await getMembership(room._id, req.user._id);
  if (!membership) {
    return res.status(403).json({ error: "Ти не учасник цієї кімнати" });
  }
  const staff = isStaff(room, membership, req.user._id);

  if (req.method === "GET") return listCodeReviews(req, res, room, membership, staff);
  if (req.method === "POST") return createReview(req, res, room, membership, staff);
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
});
