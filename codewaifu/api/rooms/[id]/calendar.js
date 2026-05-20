import { connectToDatabase } from "../../_lib/db.js";
import {
  Assignment,
  MiniTournament,
  Submission,
  TeamQuest,
  WeeklyChallenge,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";

function isStaff(room, membership, userId) {
  return (
    String(room.ownerId) === String(userId) ||
    ["teacher", "co_teacher"].includes(membership?.roleInRoom)
  );
}

function statusForRange(start, end) {
  const now = new Date();
  if (now < new Date(start)) return "upcoming";
  if (now > new Date(end)) return "ended";
  return "active";
}

function assignmentStatus(assignment, submission, staff) {
  if (staff) return assignment.publishedAt ? "published" : "draft";
  if (!submission || submission.status === "draft") return "todo";
  if (submission.status === "returned") return "returned";
  return "done";
}

function isActionNeeded(status) {
  return ["todo", "returned"].includes(status);
}

function eventBase({ id, sourceId, source, kind, title, description, date, startsAt, endsAt, status, url }) {
  return {
    id,
    sourceId: String(sourceId),
    source,
    kind,
    title,
    description: description ?? "",
    date,
    startsAt: startsAt ?? date,
    endsAt: endsAt ?? date,
    status,
    url: url ?? null,
  };
}

async function calendar(req, res) {
  const room = await findRoomOr404(res, req.query.id);
  if (!room) return;

  const membership = await getMembership(room._id, req.user._id);
  if (!membership) {
    return res.status(403).json({ error: "Ти не учасник цієї кімнати" });
  }

  const staff = isStaff(room, membership, req.user._id);
  const roomTabUrl = (tab) => `/rooms/${room._id}?tab=${tab}`;
  const assignmentFilter = { roomId: room._id, deadlineAt: { $ne: null } };
  if (!staff) assignmentFilter.publishedAt = { $ne: null };

  const [assignments, weeklyChallenges, teamQuests, tournaments] = await Promise.all([
    Assignment().find(assignmentFilter).sort({ deadlineAt: 1 }).lean(),
    WeeklyChallenge().find({ roomId: room._id, archived: false }).sort({ weekStart: 1 }).lean(),
    TeamQuest().find({ roomId: room._id, archived: false }).sort({ startsAt: 1 }).lean(),
    MiniTournament().find({ roomId: room._id, archived: false }).sort({ startsAt: 1 }).lean(),
  ]);

  const submissions = staff || assignments.length === 0
    ? []
    : await Submission()
        .find({
          assignmentId: { $in: assignments.map((assignment) => assignment._id) },
          studentId: req.user._id,
        })
        .lean();
  const submissionByAssignment = new Map(
    submissions.map((submission) => [String(submission.assignmentId), submission]),
  );

  const events = [];
  for (const assignment of assignments) {
    const status = assignmentStatus(
      assignment,
      submissionByAssignment.get(String(assignment._id)),
      staff,
    );
    events.push(eventBase({
      id: `assignment-${assignment._id}-deadline`,
      sourceId: assignment._id,
      source: "assignment",
      kind: "deadline",
      title: assignment.title,
      description: assignment.description,
      date: assignment.deadlineAt,
      status,
      url: `/assignments/${assignment._id}`,
    }));
  }

  for (const challenge of weeklyChallenges) {
    const status = statusForRange(challenge.weekStart, challenge.weekEnd);
    events.push(eventBase({
      id: `weekly-${challenge._id}-start`,
      sourceId: challenge._id,
      source: "weekly",
      kind: "start",
      title: challenge.title,
      description: challenge.description,
      date: challenge.weekStart,
      startsAt: challenge.weekStart,
      endsAt: challenge.weekEnd,
      status,
      url: roomTabUrl("weekly"),
    }));
    events.push(eventBase({
      id: `weekly-${challenge._id}-deadline`,
      sourceId: challenge._id,
      source: "weekly",
      kind: "deadline",
      title: challenge.title,
      description: challenge.description,
      date: challenge.weekEnd,
      startsAt: challenge.weekStart,
      endsAt: challenge.weekEnd,
      status,
      url: roomTabUrl("weekly"),
    }));
  }

  for (const quest of teamQuests) {
    const status = statusForRange(quest.startsAt, quest.endsAt);
    events.push(eventBase({
      id: `team-${quest._id}-start`,
      sourceId: quest._id,
      source: "teamQuest",
      kind: "start",
      title: quest.title,
      description: quest.description,
      date: quest.startsAt,
      startsAt: quest.startsAt,
      endsAt: quest.endsAt,
      status,
      url: roomTabUrl("teamQuests"),
    }));
    events.push(eventBase({
      id: `team-${quest._id}-deadline`,
      sourceId: quest._id,
      source: "teamQuest",
      kind: "deadline",
      title: quest.title,
      description: quest.description,
      date: quest.endsAt,
      startsAt: quest.startsAt,
      endsAt: quest.endsAt,
      status,
      url: roomTabUrl("teamQuests"),
    }));
  }

  for (const tournament of tournaments) {
    const status = statusForRange(tournament.startsAt, tournament.endsAt);
    events.push(eventBase({
      id: `tournament-${tournament._id}-start`,
      sourceId: tournament._id,
      source: "tournament",
      kind: "start",
      title: tournament.title,
      description: tournament.description,
      date: tournament.startsAt,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      status,
      url: roomTabUrl("tournaments"),
    }));
    events.push(eventBase({
      id: `tournament-${tournament._id}-deadline`,
      sourceId: tournament._id,
      source: "tournament",
      kind: "deadline",
      title: tournament.title,
      description: tournament.description,
      date: tournament.endsAt,
      startsAt: tournament.startsAt,
      endsAt: tournament.endsAt,
      status,
      url: roomTabUrl("tournaments"),
    }));
  }

  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  const now = new Date();
  return res.status(200).json({
    events,
    totals: {
      events: events.length,
      deadlines: events.filter((event) => event.kind === "deadline").length,
      starts: events.filter((event) => event.kind === "start").length,
      actionNeeded: events.filter((event) => isActionNeeded(event.status)).length,
      overdue: events.filter((event) =>
        event.kind === "deadline" &&
        isActionNeeded(event.status) &&
        new Date(event.date) < now,
      ).length,
    },
  });
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  await connectToDatabase();
  if (req.method === "GET") return calendar(req, res);
  res.setHeader("Allow", "GET");
  return res.status(405).json({ error: "Method not allowed" });
});
