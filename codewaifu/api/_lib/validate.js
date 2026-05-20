import { z } from "zod";

/*
 * Shared zod schemas for API input validation. Keep them small and
 * focused — each handler imports the schema it needs and runs .safeParse().
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Некоректний email");

export const passwordSchema = z
  .string()
  .min(8, "Пароль має містити мінімум 8 символів")
  .max(128, "Задовгий пароль");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Ім'я закоротке")
  .max(60, "Ім'я задовге");

export const roleSchema = z.enum(["teacher", "student"]);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: roleSchema,
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/u, "Код має складатися з 6 цифр"),
});

export const resendCodeSchema = z.object({
  email: emailSchema,
  purpose: z.enum(["signup", "reset", "login"]).default("signup"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/* ── Rooms ───────────────────────────────────────────────────────────── */

const roomNameSchema = z
  .string()
  .trim()
  .min(2, "Назва закоротка")
  .max(80, "Назва задовга");

const roomDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Опис задовгий")
  .default("");

export const createRoomSchema = z.object({
  name: roomNameSchema,
  description: roomDescriptionSchema.optional(),
});

export const patchRoomSchema = z.object({
  name: roomNameSchema.optional(),
  description: roomDescriptionSchema.optional(),
  archived: z.boolean().optional(),
  settings: z
    .object({
      publicLeaderboard: z.boolean().optional(),
      chatEnabled: z.boolean().optional(),
    })
    .partial()
    .optional(),
});

export const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, "Код закороткий")
    .max(20, "Код задовгий"),
});

/* ── Assignments ─────────────────────────────────────────────────────── */

const assignmentTitleSchema = z
  .string()
  .trim()
  .min(2, "Назва закоротка")
  .max(120, "Назва задовга");

const assignmentDescriptionSchema = z
  .string()
  .max(5000, "Опис задовгий")
  .default("");

// Optional ISO datetime string. zod.coerce.date so frontend can pass
// either ISO string or millis-since-epoch.
const optionalDeadline = z
  .union([z.string().datetime({ offset: true }), z.string().datetime(), z.date()])
  .optional()
  .nullable();

const githubHintSchema = z
  .object({
    requiredPaths: z.array(z.string().min(1).max(200)).max(20).optional(),
    minCommits: z.number().int().min(0).max(1000).optional(),
  })
  .partial()
  .optional();

const assignmentAttachmentSchema = z
  .object({
    fileName: z.string().trim().min(1).max(180),
    mime: z.string().trim().min(1).max(180),
    size: z.number().int().min(1).max(8_000_000),
    dataUrl: z.string().max(11_000_000).regex(/^data:[^;]+;base64,/u, "Некоректний файл"),
  })
  .optional()
  .nullable();

export const createAssignmentSchema = z.object({
  title: assignmentTitleSchema,
  description: assignmentDescriptionSchema.optional(),
  deadlineAt: optionalDeadline,
  maxPoints: z.number().int().min(1).max(10_000).default(100),
  rewardCoins: z.number().int().min(0).max(1_000_000).default(50),
  publish: z.boolean().default(true), // teachers usually want it visible immediately
  githubHint: githubHintSchema,
  attachment: assignmentAttachmentSchema,
});

export const patchAssignmentSchema = z.object({
  title: assignmentTitleSchema.optional(),
  description: assignmentDescriptionSchema.optional(),
  deadlineAt: optionalDeadline,
  maxPoints: z.number().int().min(1).max(10_000).optional(),
  rewardCoins: z.number().int().min(0).max(1_000_000).optional(),
  githubHint: githubHintSchema,
  attachment: assignmentAttachmentSchema,
});

/* ── Submissions ─────────────────────────────────────────────────────── */

// Accept any URL but flag as warn (not fail) if it isn't a github.com URL —
// teachers might use GitLab in the future, this just keeps the door open.
const repoUrlSchema = z
  .string()
  .trim()
  .url("Некоректний URL")
  .max(500);

export const submitAssignmentSchema = z.object({
  repoUrl: repoUrlSchema.optional().nullable(),
  prUrl: repoUrlSchema.optional().nullable(),
  commitSha: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{7,40}$/i, "Некоректний commit SHA")
    .optional()
    .nullable(),
  note: z.string().max(2000, "Заглядно").default(""),
});

export const gradeSubmissionSchema = z.object({
  points: z.number().int().min(0).max(10_000),
  feedback: z.string().max(2000, "Задовгий фідбек").default(""),
});

export const createCodeReviewSchema = z.object({
  submissionId: z.string().trim().min(1, "Сабмішн обов'язковий"),
  rating: z.number().int().min(1, "Оціни від 1 до 5").max(5, "Оціни від 1 до 5"),
  summary: z.string().trim().min(20, "Напиши хоча б 20 символів").max(1200, "Задовгий підсумок"),
  strengths: z.string().trim().max(1200, "Задовгі сильні сторони").default(""),
  suggestions: z.string().trim().max(1200, "Задовгі поради").default(""),
});

/* ── Shop ────────────────────────────────────────────────────────────── */

const shopItemKindSchema = z.enum([
  "auto_pass",      // Автомат на іспит / залік
  "retake",         // Перездача
  "extra_attempt",  // Додаткова спроба
  "title",          // Косметичний титул
  "cosmetic",       // Косметика (банер/колір)
  "custom",         // Власна нагорода (текст)
]);

export const createShopItemSchema = z.object({
  title: z.string().trim().min(2, "Назва закоротка").max(120),
  description: z.string().max(2000).default(""),
  cost: z.number().int().min(1, "Ціна має бути додатньою").max(1_000_000),
  kind: shopItemKindSchema.default("custom"),
  // -1 = unlimited; null/undefined → -1.
  stock: z.number().int().min(-1).max(10_000).default(-1),
  // Free-form payload — depends on kind. Frontend sets only what it needs.
  payload: z.any().optional(),
});

export const patchShopItemSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  cost: z.number().int().min(1).max(1_000_000).optional(),
  kind: shopItemKindSchema.optional(),
  stock: z.number().int().min(-1).max(10_000).optional(),
  payload: z.any().optional(),
  archived: z.boolean().optional(),
});

export const createTournamentSchema = z.object({
  title: z.string().trim().min(2, "Назва закоротка").max(120),
  description: z.string().trim().max(2000).default(""),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }),
  reward: z.string().trim().max(160).default(""),
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(2, "Назва задачі закоротка").max(120),
        description: z.string().trim().min(1, "Опис задачі обов'язковий").max(5000),
        maxPoints: z.number().int().min(1).max(10_000).default(100),
      }),
    )
    .min(1, "Додай хоча б одну задачу")
    .max(5, "Максимум 5 задач"),
});

const contestUrlSchema = z.string().trim().url("Некоректний URL").max(500).optional().or(z.literal(""));

export const submitTournamentSolutionSchema = z.object({
  action: z.literal("submit_solution"),
  tournamentId: z.string().trim().min(1),
  taskId: z.string().trim().min(1),
  repoUrl: contestUrlSchema,
  prUrl: contestUrlSchema,
  note: z.string().trim().max(2000).default(""),
});

export const gradeTournamentSubmissionSchema = z.object({
  action: z.literal("grade_submission"),
  tournamentId: z.string().trim().min(1),
  taskId: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
  points: z.number().int().min(0).max(10_000),
  feedback: z.string().trim().max(2000).default(""),
});

export const publishTournamentResultsSchema = z.object({
  action: z.literal("publish_results"),
  tournamentId: z.string().trim().min(1),
});

export const createWeeklyChallengeSchema = z.object({
  type: z.enum(["metric", "knowledge_sharing"]).default("metric"),
  title: z.string().trim().min(2, "Назва закоротка").max(120),
  description: z.string().trim().max(1000).default(""),
  topic: z.string().trim().max(160).default(""),
  metric: z.enum(["points", "submissions", "graded", "activity"]).default("submissions"),
  target: z.number().int().min(1, "Ціль має бути додатньою").max(10_000).default(1),
  weekStart: z.string().datetime({ offset: true }).optional(),
  reward: z.string().trim().max(160).default(""),
  rewardCoins: z.number().int().min(0).max(1_000_000).default(20),
});

export const submitKnowledgeSharingSchema = z.object({
  action: z.literal("submit_knowledge"),
  challengeId: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(180),
  mime: z.string().trim().min(1).max(180),
  size: z.number().int().min(1).max(8_000_000),
  dataUrl: z.string().max(11_000_000).regex(/^data:[^;]+;base64,/u, "Некоректний файл"),
  note: z.string().trim().max(1000).default(""),
});

export const approveKnowledgeSharingSchema = z.object({
  action: z.literal("approve_knowledge"),
  challengeId: z.string().trim().min(1),
  studentId: z.string().trim().min(1),
});

export const createTeamQuestSchema = z.object({
  title: z.string().trim().min(2, "Назва закоротка").max(120),
  description: z.string().trim().max(1000).default(""),
  teamSize: z.number().int().min(2).max(8).default(3),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }),
  reward: z.string().trim().max(160).default(""),
});

export const updateTeamQuestTeamSchema = z.object({
  questId: z.string().trim().min(1),
  action: z.enum(["update_team", "set_winner", "clear_winner"]).default("update_team"),
  teamName: z.string().trim().min(1).max(120).optional(),
  repoUrl: z.string().trim().url("Некоректний repo URL").max(500).optional().or(z.literal("")),
  demoUrl: z.string().trim().url("Некоректний demo URL").max(500).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional(),
  teacherNote: z.string().trim().max(1000).optional(),
  winnerNote: z.string().trim().max(1000).optional(),
});

export const updateProfileSchema = z.object({
  avatarDataUrl: z
    .string()
    .max(750_000, "Фото завелике. Стисни до ~500KB.")
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/u, "Некоректне зображення")
    .optional(),
  profile: z
    .object({
      status: z.string().trim().max(80).optional(),
      bio: z.string().trim().max(220).optional(),
      favoriteStack: z.string().trim().max(90).optional(),
    })
    .partial()
    .optional(),
  active: z
    .object({
      title: z.string().max(80).nullable().optional(),
      banner: z.string().max(80).nullable().optional(),
      frame: z.string().max(80).nullable().optional(),
      accent: z.string().max(80).nullable().optional(),
    })
    .partial()
    .optional(),
});

/**
 * Helper: run a schema, on failure send a 400 with the first error.
 * Returns the parsed value or null (caller must early-return on null).
 */
export function parseOr400(res, schema, body) {
  const r = schema.safeParse(body ?? {});
  if (!r.success) {
    const first = r.error.issues?.[0];
    res.status(400).json({
      error: first?.message ?? "Validation failed",
      field: first?.path?.join(".") ?? null,
      issues: r.error.issues,
    });
    return null;
  }
  return r.data;
}
