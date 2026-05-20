import { connectToDatabase } from "../_lib/db.js";
import { User } from "../_lib/models/index.js";
import {
  hashPassword,
  publicUser,
  setSessionCookie,
  signSessionToken,
} from "../_lib/auth.js";

function isDevAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO_LOGIN === "true";
}

const TEST_STUDENTS = [
  { key: "student-1", email: "student1@test.local", name: "Анна Debug", status: "Люблю чисті PR і зелені тести.", favoriteStack: "React · CSS · Jest" },
  { key: "student-2", email: "student2@test.local", name: "Максим Merge", status: "Не пушу в main без review.", favoriteStack: "Node.js · MongoDB · Git" },
  { key: "student-3", email: "student3@test.local", name: "Софія Commit", status: "Збираю XP за дедлайни.", favoriteStack: "Python · FastAPI · SQL" },
  { key: "student-4", email: "student4@test.local", name: "Данило Branch", status: "Рефакторю, поки ніхто не бачить.", favoriteStack: "TypeScript · Vite · Tailwind" },
  { key: "student-5", email: "student5@test.local", name: "Ірина Review", status: "Пишу фідбек без токсичності.", favoriteStack: "Vue · Testing · UX" },
];

function testUserForRole(role, persona) {
  if (role === "teacher") {
    return {
      email: "teacher@test.local",
      name: "Тестовий викладач",
      role: "teacher",
    };
  }
  const selected = TEST_STUDENTS.find((student) => student.key === persona);
  if (selected) {
    return {
      email: selected.email,
      name: selected.name,
      role: "student",
      profileStyle: {
        status: selected.status,
        bio: "Тестовий студент для демо класів, рейтингу, review і командних квестів.",
        favoriteStack: selected.favoriteStack,
      },
    };
  }
  return {
    email: "student@test.local",
    name: "Тестовий студент",
    role: "student",
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!isDevAllowed()) {
    return res.status(404).json({ error: "Not found" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const role = req.body?.role === "teacher" ? "teacher" : "student";
  const persona = typeof req.body?.persona === "string" ? req.body.persona : null;
  const testUser = testUserForRole(role, persona);

  await connectToDatabase();

  const user = await User().findOneAndUpdate(
    { email: testUser.email },
    {
      $set: {
        ...testUser,
        passwordHash: await hashPassword(`dev-${role}-password`),
        emailVerifiedAt: new Date(),
      },
      $setOnInsert: {
        avatarUrl: null,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  const token = signSessionToken(user);
  setSessionCookie(res, token);

  return res.status(200).json({ ok: true, user: publicUser(user), dev: true });
}
