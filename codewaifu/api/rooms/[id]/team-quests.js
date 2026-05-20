import { connectToDatabase } from "../../_lib/db.js";
import {
  RoomMember,
  TeamQuest,
  User,
} from "../../_lib/models/index.js";
import { requireAuth } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";
import {
  createTeamQuestSchema,
  parseOr400,
  updateTeamQuestTeamSchema,
} from "../../_lib/validate.js";
import { parseRepoUrl } from "../../_lib/github-repo.js";

const GH = "https://api.github.com";

const TEAM_NAMES = [
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Omega",
  "Phoenix",
  "Samurai",
  "Ninja",
  "Runtime",
  "Null Squad",
];

function statusFor(quest) {
  const now = new Date();
  if (quest.archived) return "archived";
  if (now < new Date(quest.startsAt)) return "upcoming";
  if (now > new Date(quest.endsAt)) return "ended";
  return "active";
}

function ghHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "GitQuest-server",
  };
  if (process.env.GITHUB_PAT) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`;
  }
  return headers;
}

async function ghJson(path) {
  const r = await fetch(`${GH}${path}`, { headers: ghHeaders() });
  if (r.status === 404) return null;
  if (r.status === 403) {
    const remaining = r.headers.get("x-ratelimit-remaining");
    const reset = r.headers.get("x-ratelimit-reset");
    throw new Error(`GitHub rate-limited (remaining=${remaining}, reset=${reset})`);
  }
  if (!r.ok) throw new Error(`GitHub ${r.status} on ${path}`);
  return r.json();
}

async function ghPages(path, maxPages = 2) {
  const rows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const sep = path.includes("?") ? "&" : "?";
    const next = await ghJson(`${path}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(next) || next.length === 0) break;
    rows.push(...next);
    if (next.length < 100) break;
  }
  return rows;
}

function publicStudent(user, id) {
  return {
    id: String(id),
    name: user?.name ?? null,
    email: user?.email ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    githubLogin: user?.githubLogin ?? null,
  };
}

function buildTeams(members, teamSize) {
  const teamCount = Math.max(1, Math.ceil(members.length / teamSize));
  const teams = Array.from({ length: teamCount }, (_, idx) => ({
    name: TEAM_NAMES[idx] ?? `Team ${idx + 1}`,
    memberIds: [],
    repoUrl: "",
    demoUrl: "",
    note: "",
    submittedAt: null,
    teacherNote: "",
    analytics: { summary: {}, contributors: [] },
  }));

  members
    .slice()
    .sort((a, b) => new Date(a.joinedAt ?? a.createdAt) - new Date(b.joinedAt ?? b.createdAt))
    .forEach((member, idx) => {
      teams[idx % teamCount].memberIds.push(member.userId);
    });
  return teams;
}

async function getStudentMembers(roomId) {
  return RoomMember()
    .find({ roomId, roleInRoom: "student" })
    .lean();
}

async function usersByIds(ids) {
  const users = ids.length
    ? await User()
        .find(
          { _id: { $in: ids } },
          { name: 1, email: 1, avatarUrl: 1, githubLogin: 1 },
        )
        .lean()
    : [];
  return new Map(users.map((user) => [String(user._id), user]));
}

function blankContribution(githubLogin) {
  return {
    githubLogin,
    commits: 0,
    additions: 0,
    deletions: 0,
    pullRequests: 0,
    mergedPullRequests: 0,
    reviews: 0,
    issuesOpened: 0,
    activeDays: 0,
  };
}

function addActiveDay(row, date, daysByLogin) {
  if (!date || !row.githubLogin) return;
  if (!daysByLogin.has(row.githubLogin)) daysByLogin.set(row.githubLogin, new Set());
  daysByLogin.get(row.githubLogin).add(new Date(date).toISOString().slice(0, 10));
}

async function fetchRepoAnalytics(team, userById, quest) {
  const parsed = parseRepoUrl(team.repoUrl);
  if (!parsed) {
    return {
      error: "Repo URL не схожий на GitHub repository",
      summary: {},
      contributors: [],
    };
  }

  const memberLogins = (team.memberIds ?? [])
    .map((id) => userById.get(String(id))?.githubLogin)
    .filter(Boolean);
  const byLogin = new Map(memberLogins.map((login) => [login, blankContribution(login)]));
  const daysByLogin = new Map();
  const start = new Date(quest.startsAt).toISOString();
  const end = new Date(quest.endsAt).toISOString();
  const repoPath = `/repos/${parsed.owner}/${parsed.repo}`;

  try {
    const [readme, repo, commits, pulls, issues] = await Promise.all([
      ghJson(`${repoPath}/readme`),
      ghJson(repoPath),
      ghPages(`${repoPath}/commits?since=${encodeURIComponent(start)}&until=${encodeURIComponent(end)}`, 1),
      ghPages(`${repoPath}/pulls?state=all`, 1),
      ghPages(`${repoPath}/issues?state=all&since=${encodeURIComponent(start)}`, 1),
    ]);

    const commitDetails = await Promise.all(
      commits.slice(0, 50).map((commit) => ghJson(`${repoPath}/commits/${commit.sha}`)),
    );
    for (const commit of commitDetails.filter(Boolean)) {
      const login = commit.author?.login;
      if (!login) continue;
      if (!byLogin.has(login)) byLogin.set(login, blankContribution(login));
      const row = byLogin.get(login);
      row.commits += 1;
      row.additions += commit.stats?.additions ?? 0;
      row.deletions += commit.stats?.deletions ?? 0;
      addActiveDay(row, commit.commit?.author?.date ?? commit.commit?.committer?.date, daysByLogin);
    }

    const questPulls = pulls.filter((pull) => {
      const created = new Date(pull.created_at);
      return created >= new Date(start) && created <= new Date(end);
    });
    for (const pull of questPulls) {
      const login = pull.user?.login;
      if (login) {
        if (!byLogin.has(login)) byLogin.set(login, blankContribution(login));
        const row = byLogin.get(login);
        row.pullRequests += 1;
        if (pull.merged_at) row.mergedPullRequests += 1;
        addActiveDay(row, pull.created_at, daysByLogin);
      }
    }

    const reviewsByPull = await Promise.all(
      questPulls.slice(0, 30).map((pull) => ghPages(`${repoPath}/pulls/${pull.number}/reviews`, 1)),
    );
    for (const review of reviewsByPull.flat()) {
      const login = review.user?.login;
      if (!login) continue;
      if (!byLogin.has(login)) byLogin.set(login, blankContribution(login));
      const row = byLogin.get(login);
      row.reviews += 1;
      addActiveDay(row, review.submitted_at, daysByLogin);
    }

    const plainIssues = issues.filter((issue) => !issue.pull_request);
    for (const issue of plainIssues) {
      const login = issue.user?.login;
      if (!login) continue;
      if (!byLogin.has(login)) byLogin.set(login, blankContribution(login));
      const row = byLogin.get(login);
      row.issuesOpened += 1;
      addActiveDay(row, issue.created_at, daysByLogin);
    }

    for (const [login, days] of daysByLogin) {
      if (byLogin.has(login)) byLogin.get(login).activeDays = days.size;
    }

    const contributors = [...byLogin.values()].sort((a, b) =>
      (b.commits + b.pullRequests + b.reviews + b.issuesOpened) -
      (a.commits + a.pullRequests + a.reviews + a.issuesOpened),
    );
    return {
      fetchedAt: new Date().toISOString(),
      summary: {
        fullName: repo?.full_name ?? `${parsed.owner}/${parsed.repo}`,
        defaultBranch: repo?.default_branch ?? null,
        readmeExists: Boolean(readme),
        commits: commitDetails.filter(Boolean).length,
        pullRequests: questPulls.length,
        mergedPullRequests: questPulls.filter((pull) => pull.merged_at).length,
        issues: plainIssues.length,
        reviews: reviewsByPull.flat().length,
      },
      contributors,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
      summary: {},
      contributors: [...byLogin.values()],
    };
  }
}

function teamCompleteness(team) {
  const checks = [Boolean(team.repoUrl), Boolean(team.demoUrl), Boolean(team.note)];
  return {
    repoConnected: checks[0],
    demoSubmitted: checks[1],
    noteSubmitted: checks[2],
    percent: Math.round((checks.filter(Boolean).length / checks.length) * 100),
  };
}

function publicQuest(quest, userById, currentUserId, isStaff) {
  const teams = (quest.teams ?? []).map((team) => {
    const members = (team.memberIds ?? []).map((id) => {
      const studentId = String(id);
      return {
        student: publicStudent(userById.get(studentId), studentId),
        isMe: String(currentUserId) === studentId,
      };
    });
    return {
      name: team.name,
      members,
      repoUrl: team.repoUrl ?? "",
      demoUrl: team.demoUrl ?? "",
      note: team.note ?? "",
      submittedAt: team.submittedAt ?? null,
      teacherNote: isStaff ? team.teacherNote ?? "" : undefined,
      analytics: isStaff
        ? team.analytics ?? { summary: {}, contributors: [] }
        : undefined,
      completeness: teamCompleteness(team),
      isMyTeam: members.some((member) => member.isMe),
    };
  });
  return {
    id: String(quest._id),
    type: quest.type ?? "shared_codebase",
    title: quest.title,
    description: quest.description ?? "",
    startsAt: quest.startsAt,
    endsAt: quest.endsAt,
    reward: quest.reward ?? "",
    winnerTeamName: quest.winnerTeamName ?? "",
    winnerNote: isStaff ? quest.winnerNote ?? "" : undefined,
    status: statusFor(quest),
    teams,
    myTeam: teams.find((team) => team.isMyTeam) ?? null,
    createdAt: quest.createdAt,
  };
}

async function listQuests(req, res, room, isStaff) {
  const [quests, members] = await Promise.all([
    TeamQuest()
      .find({ roomId: room._id, archived: false })
      .sort({ startsAt: -1, createdAt: -1 })
      .lean(),
    getStudentMembers(room._id),
  ]);
  const memberIds = [
    ...new Set(
      quests.flatMap((quest) =>
        (quest.teams ?? []).flatMap((team) => team.memberIds ?? []).map(String),
      ),
    ),
  ];
  const userById = await usersByIds(memberIds);
  if (isStaff) {
    await Promise.all(
      quests.flatMap((quest) =>
        (quest.teams ?? [])
          .filter((team) => team.repoUrl)
          .map(async (team) => {
            team.analytics = await fetchRepoAnalytics(team, userById, quest);
          }),
      ),
    );
  }
  return res.status(200).json({
    studentCount: members.length,
    quests: quests.map((quest) =>
      publicQuest(quest, userById, req.user._id, isStaff),
    ),
  });
}

async function createQuest(req, res, room, isStaff) {
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладачі створюють командні квести" });
  }

  const body = parseOr400(res, createTeamQuestSchema, req.body);
  if (!body) return;

  const members = await getStudentMembers(room._id);
  if (members.length < 2) {
    return res.status(400).json({
      error: `У класі зараз ${members.length} студентів. Для командного квесту потрібно мінімум 2.`,
      field: "teamSize",
      studentCount: members.length,
    });
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  const endsAt = new Date(body.endsAt);
  if (endsAt <= startsAt) {
    return res.status(400).json({ error: "Дата завершення має бути після старту" });
  }

  let quest;
  try {
    quest = await TeamQuest().create({
      roomId: room._id,
      authorId: req.user._id,
      type: "shared_codebase",
      title: body.title,
      description: body.description ?? "",
      startsAt,
      endsAt,
      reward: body.reward ?? "",
      teams: buildTeams(members, body.teamSize),
    });
  } catch (err) {
    console.error("[team-quests] create error:", err);
    return res.status(500).json({
      error: "Не вдалось створити командний sprint",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const userById = await usersByIds(
    quest.teams.flatMap((team) => team.memberIds ?? []).map(String),
  );
  return res.status(201).json({
    quest: publicQuest(quest.toObject(), userById, req.user._id, true),
  });
}

async function updateTeam(req, res, room, isStaff) {
  const body = parseOr400(res, updateTeamQuestTeamSchema, req.body);
  if (!body) return;

  const quest = await TeamQuest().findOne({ _id: body.questId, roomId: room._id, archived: false });
  if (!quest) {
    return res.status(404).json({ error: "Квест не знайдено" });
  }

  if (body.action === "clear_winner") {
    if (!isStaff) {
      return res.status(403).json({ error: "Тільки викладач може змінювати переможця" });
    }
    quest.winnerTeamName = "";
    quest.winnerNote = "";
    await quest.save();
    const userById = await usersByIds(
      quest.teams.flatMap((item) => item.memberIds ?? []).map(String),
    );
    return res.status(200).json({
      quest: publicQuest(quest.toObject(), userById, req.user._id, isStaff),
    });
  }

  if (!body.teamName) {
    return res.status(400).json({ error: "Team name обов'язковий" });
  }

  const team = quest.teams.find((item) => item.name === body.teamName);
  if (!team) {
    return res.status(404).json({ error: "Команду не знайдено" });
  }

  if (body.action === "set_winner") {
    if (!isStaff) {
      return res.status(403).json({ error: "Тільки викладач може обрати переможця" });
    }
    quest.winnerTeamName = team.name;
    quest.winnerNote = body.winnerNote ?? "";
    await quest.save();
    const userById = await usersByIds(
      quest.teams.flatMap((item) => item.memberIds ?? []).map(String),
    );
    return res.status(200).json({
      quest: publicQuest(quest.toObject(), userById, req.user._id, isStaff),
    });
  }

  const isTeamMember = (team.memberIds ?? []).some((id) => String(id) === String(req.user._id));
  if (!isStaff && !isTeamMember) {
    return res.status(403).json({ error: "Редагувати може тільки учасник цієї команди" });
  }

  if (body.repoUrl !== undefined) team.repoUrl = body.repoUrl;
  if (body.demoUrl !== undefined) team.demoUrl = body.demoUrl;
  if (body.note !== undefined) team.note = body.note;
  if (isStaff && body.teacherNote !== undefined) team.teacherNote = body.teacherNote;
  team.submittedAt = new Date();
  await quest.save();

  const userById = await usersByIds(
    quest.teams.flatMap((item) => item.memberIds ?? []).map(String),
  );
  return res.status(200).json({
    quest: publicQuest(quest.toObject(), userById, req.user._id, isStaff),
  });
}

async function deleteQuest(req, res, room, isStaff) {
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладачі видаляють командні квести" });
  }
  const id = req.body?.id;
  if (!id) {
    return res.status(400).json({ error: "Quest id обов'язковий" });
  }
  const result = await TeamQuest().updateOne(
    { _id: id, roomId: room._id },
    { $set: { archived: true } },
  );
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Квест не знайдено" });
  }
  return res.status(200).json({ ok: true, deleted: true });
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

  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    ["teacher", "co_teacher"].includes(membership.roleInRoom);

  if (req.method === "GET") return listQuests(req, res, room, isStaff);
  if (req.method === "POST") return createQuest(req, res, room, isStaff);
  if (req.method === "PATCH") return updateTeam(req, res, room, isStaff);
  if (req.method === "DELETE") return deleteQuest(req, res, room, isStaff);

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
});
