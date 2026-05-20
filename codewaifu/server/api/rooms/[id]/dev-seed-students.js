import { connectToDatabase } from "../../_lib/db.js";
import { RoomMember, User } from "../../_lib/models/index.js";
import { hashPassword } from "../../_lib/auth.js";
import { findRoomOr404, getMembership } from "../../_lib/rooms.js";
import { requireAuth } from "../../_lib/auth.js";

const TEST_STUDENTS = [
  { email: "student1@test.local", name: "Анна Debug", status: "Люблю чисті PR і зелені тести.", favoriteStack: "React · CSS · Jest" },
  { email: "student2@test.local", name: "Максим Merge", status: "Не пушу в main без review.", favoriteStack: "Node.js · MongoDB · Git" },
  { email: "student3@test.local", name: "Софія Commit", status: "Збираю XP за дедлайни.", favoriteStack: "Python · FastAPI · SQL" },
  { email: "student4@test.local", name: "Данило Branch", status: "Рефакторю, поки ніхто не бачить.", favoriteStack: "TypeScript · Vite · Tailwind" },
  { email: "student5@test.local", name: "Ірина Review", status: "Пишу фідбек без токсичності.", favoriteStack: "Vue · Testing · UX" },
];

function isDevAllowed() {
  return process.env.NODE_ENV !== "production";
}

export default requireAuth(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!isDevAllowed()) return res.status(404).json({ error: "Not found" });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  await connectToDatabase();
  const room = await findRoomOr404(res, req.query.id, { archived: "exclude" });
  if (!room) return;
  const membership = await getMembership(room._id, req.user._id);
  const isStaff =
    String(room.ownerId) === String(req.user._id) ||
    ["teacher", "co_teacher"].includes(membership?.roleInRoom);
  if (!isStaff) {
    return res.status(403).json({ error: "Тільки викладач може додавати тестових студентів" });
  }

  const passwordHash = await hashPassword("dev-student-password");
  const users = [];
  for (const student of TEST_STUDENTS) {
    const user = await User().findOneAndUpdate(
      { email: student.email },
      {
        $set: {
          email: student.email,
          name: student.name,
          role: "student",
          passwordHash,
          emailVerifiedAt: new Date(),
          profileStyle: {
            status: student.status,
            bio: "Тестовий студент для демо класів, рейтингу, review і командних квестів.",
            favoriteStack: student.favoriteStack,
          },
        },
        $setOnInsert: { avatarUrl: null },
      },
      { upsert: true, returnDocument: "after" },
    );
    users.push(user);
    await RoomMember().updateOne(
      { roomId: room._id, userId: user._id },
      {
        $setOnInsert: {
          roleInRoom: "student",
          joinedAt: new Date(),
          coins: 0,
          xp: 0,
        },
      },
      { upsert: true },
    );
  }

  return res.status(200).json({
    ok: true,
    students: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
    })),
  });
});
