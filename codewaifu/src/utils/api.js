/*
 * Tiny fetch wrapper for our /api/* endpoints.
 *
 * - Always sends cookies (credentials: "include") so the JWT cookie
 *   roundtrips on every request.
 * - Throws ApiError on !ok responses, with the parsed JSON body attached.
 * - Auto-stringifies POST bodies as JSON.
 */

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? 0;
    this.data = data ?? null;
  }
}

async function request(path, { method = "GET", body, headers, ...rest } = {}) {
  const init = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...rest,
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(path, init);
  } catch (e) {
    throw new ApiError("Не вдалось з'єднатися з сервером", {
      status: 0,
      data: { detail: e?.message },
    });
  }

  let data = null;
  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) {
    try { data = await res.json(); } catch { data = null; }
  }

  if (!res.ok) {
    const message = data?.error || `HTTP ${res.status}`;
    throw new ApiError(message, { status: res.status, data });
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

/* ── Auth-specific helpers ───────────────────────────────────────────── */

export const authApi = {
  me: () => api.get("/api/auth/me"),
  register: ({ email, password, name, role }) =>
    api.post("/api/auth/register", { email, password, name, role }),
  verifyEmail: ({ email, code }) =>
    api.post("/api/auth/verify-email", { email, code }),
  resendCode: ({ email, purpose = "signup" }) =>
    api.post("/api/auth/resend-code", { email, purpose }),
  login: ({ email, password }) =>
    api.post("/api/auth/login", { email, password }),
  devLogin: (role, persona) => api.post("/api/auth/dev-login", { role, persona }),
  logout: () => api.post("/api/auth/logout"),
};

/* ── Rooms API ───────────────────────────────────────────────────────── */

export const roomsApi = {
  list: () => api.get("/api/rooms"),
  create: ({ name, description }) =>
    api.post("/api/rooms", { name, description }),
  get: (id) => api.get(`/api/rooms/${encodeURIComponent(id)}`),
  teacherDashboard: (id) =>
    api.get(`/api/rooms/${encodeURIComponent(id)}/teacher-dashboard`),
  leaderboard: (id) =>
    api.get(`/api/rooms/${encodeURIComponent(id)}/leaderboard`),
  calendar: (id) =>
    api.get(`/api/rooms/${encodeURIComponent(id)}/calendar`),
  codeReviews: (id) =>
    api.get(`/api/rooms/${encodeURIComponent(id)}/code-reviews`),
  createCodeReview: (id, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/code-reviews`, payload),
  devSeedStudents: (id) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/dev-seed-students`),
  tournaments: (id) =>
    api.get(`/api/rooms/${encodeURIComponent(id)}/tournaments`),
  createTournament: (id, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/tournaments`, payload),
  submitTournamentSolution: (id, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/tournaments`, {
      action: "submit_solution",
      ...payload,
    }),
  gradeTournamentSubmission: (id, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/tournaments`, {
      action: "grade_submission",
      ...payload,
    }),
  publishTournamentResults: (id, tournamentId) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/tournaments`, {
      action: "publish_results",
      tournamentId,
    }),
  deleteTournament: (id, tournamentId) =>
    api.delete(`/api/rooms/${encodeURIComponent(id)}/tournaments`, { body: { id: tournamentId } }),
  weeklyChallenges: (id) =>
    api.get(`/api/rooms/${encodeURIComponent(id)}/weekly-challenges`),
  createWeeklyChallenge: (id, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/weekly-challenges`, payload),
  submitKnowledgeSharing: (id, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/weekly-challenges`, {
      action: "submit_knowledge",
      ...payload,
    }),
  approveKnowledgeSharing: (id, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/weekly-challenges`, {
      action: "approve_knowledge",
      ...payload,
    }),
  deleteWeeklyChallenge: (id, challengeId) =>
    api.delete(`/api/rooms/${encodeURIComponent(id)}/weekly-challenges`, { body: { id: challengeId } }),
  teamQuests: (id) =>
    api.get(`/api/rooms/${encodeURIComponent(id)}/team-quests`),
  createTeamQuest: (id, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/team-quests`, payload),
  updateTeamQuestTeam: (id, payload) =>
    api.patch(`/api/rooms/${encodeURIComponent(id)}/team-quests`, payload),
  deleteTeamQuest: (id, questId) =>
    api.delete(`/api/rooms/${encodeURIComponent(id)}/team-quests`, { body: { id: questId } }),
  quests: (id) => api.get(`/api/rooms/${encodeURIComponent(id)}/quests`),
  patch: (id, patch) =>
    api.patch(`/api/rooms/${encodeURIComponent(id)}`, patch),
  archive: (id) => api.delete(`/api/rooms/${encodeURIComponent(id)}`),
  regenerateInvite: (id) =>
    api.post(`/api/rooms/${encodeURIComponent(id)}/regenerate-invite`),
  join: (code) => api.post("/api/rooms/join", { code }),
  leave: (id) => api.post(`/api/rooms/${encodeURIComponent(id)}/leave`),
  removeMember: (id, userId) =>
    api.delete(
      `/api/rooms/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
    ),
};

/* ── Assignments API ─────────────────────────────────────────────────── */

export const assignmentsApi = {
  listInRoom: (roomId) =>
    api.get(`/api/rooms/${encodeURIComponent(roomId)}/assignments`),
  createInRoom: (roomId, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(roomId)}/assignments`, payload),
  get: (id) => api.get(`/api/assignments/${encodeURIComponent(id)}`),
  patch: (id, payload) =>
    api.patch(`/api/assignments/${encodeURIComponent(id)}`, payload),
  delete: (id) => api.delete(`/api/assignments/${encodeURIComponent(id)}`),
  publish: (id, publish = true) =>
    api.post(`/api/assignments/${encodeURIComponent(id)}/publish`, { publish }),
  submit: (id, payload) =>
    api.post(`/api/assignments/${encodeURIComponent(id)}/submit`, payload),
  submissions: (id) =>
    api.get(`/api/assignments/${encodeURIComponent(id)}/submissions`),
};

/* ── Submissions API ─────────────────────────────────────────────────── */

export const submissionsApi = {
  get: (id) => api.get(`/api/submissions/${encodeURIComponent(id)}`),
  github: (id) => api.get(`/api/submissions/${encodeURIComponent(id)}/github`),
  grade: (id, { points, feedback }) =>
    api.post(`/api/submissions/${encodeURIComponent(id)}/grade`, {
      points,
      feedback,
    }),
  returnSub: (id) =>
    api.post(`/api/submissions/${encodeURIComponent(id)}/return`),
};

/* ── Shop API ────────────────────────────────────────────────────────── */

export const shopApi = {
  listInRoom: (roomId) =>
    api.get(`/api/rooms/${encodeURIComponent(roomId)}/shop`),
  createInRoom: (roomId, payload) =>
    api.post(`/api/rooms/${encodeURIComponent(roomId)}/shop`, payload),
  get: (id) => api.get(`/api/shop/${encodeURIComponent(id)}`),
  patch: (id, payload) =>
    api.patch(`/api/shop/${encodeURIComponent(id)}`, payload),
  archive: (id) => api.delete(`/api/shop/${encodeURIComponent(id)}`),
  buy: (id) => api.post(`/api/shop/${encodeURIComponent(id)}/buy`),
  purchases: (roomId, opts = {}) => {
    const qs = opts.userId ? `?userId=${encodeURIComponent(opts.userId)}` : "";
    return api.get(`/api/rooms/${encodeURIComponent(roomId)}/purchases${qs}`);
  },
};

export const profileApi = {
  me: () => api.get("/api/profile/me"),
  get: (id) => api.get(`/api/profile/${encodeURIComponent(id)}`),
  update: (payload) => api.patch("/api/profile/me", payload),
};

export const cosmeticsApi = {
  list: () => api.get("/api/cosmetics"),
  buy: (cosmeticId) => api.post("/api/cosmetics/buy", { cosmeticId }),
};
