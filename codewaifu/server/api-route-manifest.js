// Generated route manifest for the single Vercel catch-all function.
import route0 from "./api/auth/dev-login.js";
import route1 from "./api/auth/link-github.js";
import route2 from "./api/auth/login.js";
import route3 from "./api/auth/logout.js";
import route4 from "./api/auth/me.js";
import route5 from "./api/auth/register.js";
import route6 from "./api/auth/resend-code.js";
import route7 from "./api/auth/unlink-github.js";
import route8 from "./api/auth/verify-email.js";
import route9 from "./api/cosmetics/buy.js";
import route10 from "./api/profile/me.js";
import route11 from "./api/rooms/join.js";
import route12 from "./api/assignments/[id]/publish.js";
import route13 from "./api/assignments/[id]/submissions.js";
import route14 from "./api/assignments/[id]/submit.js";
import route15 from "./api/rooms/[id]/assignments/index.js";
import route16 from "./api/rooms/[id]/calendar.js";
import route17 from "./api/rooms/[id]/code-reviews.js";
import route18 from "./api/rooms/[id]/dev-seed-students.js";
import route19 from "./api/rooms/[id]/leaderboard.js";
import route20 from "./api/rooms/[id]/leave.js";
import route21 from "./api/rooms/[id]/purchases.js";
import route22 from "./api/rooms/[id]/quests.js";
import route23 from "./api/rooms/[id]/regenerate-invite.js";
import route24 from "./api/rooms/[id]/shop/index.js";
import route25 from "./api/rooms/[id]/teacher-dashboard.js";
import route26 from "./api/rooms/[id]/team-quests.js";
import route27 from "./api/rooms/[id]/tournaments.js";
import route28 from "./api/rooms/[id]/weekly-challenges.js";
import route29 from "./api/shop/[id]/buy.js";
import route30 from "./api/submissions/[id]/github.js";
import route31 from "./api/submissions/[id]/grade.js";
import route32 from "./api/submissions/[id]/return.js";
import route33 from "./api/rooms/[id]/members/[userId].js";
import route34 from "./api/cosmetics/index.js";
import route35 from "./api/health.js";
import route36 from "./api/rooms/index.js";
import route37 from "./api/assignments/[id]/index.js";
import route38 from "./api/profile/[id].js";
import route39 from "./api/rooms/[id]/index.js";
import route40 from "./api/shop/[id]/index.js";
import route41 from "./api/submissions/[id]/index.js";

export const routes = [
  { pattern: ['auth', 'dev-login'], handler: route0 },
  { pattern: ['auth', 'link-github'], handler: route1 },
  { pattern: ['auth', 'login'], handler: route2 },
  { pattern: ['auth', 'logout'], handler: route3 },
  { pattern: ['auth', 'me'], handler: route4 },
  { pattern: ['auth', 'register'], handler: route5 },
  { pattern: ['auth', 'resend-code'], handler: route6 },
  { pattern: ['auth', 'unlink-github'], handler: route7 },
  { pattern: ['auth', 'verify-email'], handler: route8 },
  { pattern: ['cosmetics', 'buy'], handler: route9 },
  { pattern: ['profile', 'me'], handler: route10 },
  { pattern: ['rooms', 'join'], handler: route11 },
  { pattern: ['assignments', '[id]', 'publish'], handler: route12 },
  { pattern: ['assignments', '[id]', 'submissions'], handler: route13 },
  { pattern: ['assignments', '[id]', 'submit'], handler: route14 },
  { pattern: ['rooms', '[id]', 'assignments'], handler: route15 },
  { pattern: ['rooms', '[id]', 'calendar'], handler: route16 },
  { pattern: ['rooms', '[id]', 'code-reviews'], handler: route17 },
  { pattern: ['rooms', '[id]', 'dev-seed-students'], handler: route18 },
  { pattern: ['rooms', '[id]', 'leaderboard'], handler: route19 },
  { pattern: ['rooms', '[id]', 'leave'], handler: route20 },
  { pattern: ['rooms', '[id]', 'purchases'], handler: route21 },
  { pattern: ['rooms', '[id]', 'quests'], handler: route22 },
  { pattern: ['rooms', '[id]', 'regenerate-invite'], handler: route23 },
  { pattern: ['rooms', '[id]', 'shop'], handler: route24 },
  { pattern: ['rooms', '[id]', 'teacher-dashboard'], handler: route25 },
  { pattern: ['rooms', '[id]', 'team-quests'], handler: route26 },
  { pattern: ['rooms', '[id]', 'tournaments'], handler: route27 },
  { pattern: ['rooms', '[id]', 'weekly-challenges'], handler: route28 },
  { pattern: ['shop', '[id]', 'buy'], handler: route29 },
  { pattern: ['submissions', '[id]', 'github'], handler: route30 },
  { pattern: ['submissions', '[id]', 'grade'], handler: route31 },
  { pattern: ['submissions', '[id]', 'return'], handler: route32 },
  { pattern: ['rooms', '[id]', 'members', '[userId]'], handler: route33 },
  { pattern: ['cosmetics'], handler: route34 },
  { pattern: ['health'], handler: route35 },
  { pattern: ['rooms'], handler: route36 },
  { pattern: ['assignments', '[id]'], handler: route37 },
  { pattern: ['profile', '[id]'], handler: route38 },
  { pattern: ['rooms', '[id]'], handler: route39 },
  { pattern: ['shop', '[id]'], handler: route40 },
  { pattern: ['submissions', '[id]'], handler: route41 },
];
