# GitQuest / CodeWaifu — детальний опис проєкту

## 1. Короткий підсумок

**GitQuest** — це навчальна вебплатформа для викладачів і студентів, побудована навколо GitHub-процесу. Проєкт поєднує:

- керування класами;
- видачу та перевірку завдань;
- здачу робіт через GitHub repository / pull request;
- оцінювання, фідбек і нарахування коїнів;
- leaderboard, квести, weekly challenges, code review, командні завдання й code contests;
- магазин винагород і косметичних елементів профілю;
- профілі студентів із GitHub-інформацією та гейміфікацією.

Головна ідея: **перетворити навчання програмуванню на прозорий GitHub-native процес із гейміфікацією**, де студент виконує реальні dev-дії, а викладач отримує зручний інтерфейс для організації, перевірки й мотивації.

---

## 2. Проблема, яку вирішує проєкт

У типових навчальних курсах із програмування часто виникають такі проблеми:

1. **Роботи здаються розрізнено**
   - частина студентів надсилає архіви;
   - частина кидає посилання в чат;
   - частина здає через LMS;
   - викладачу складно тримати все в одному місці.

2. **GitHub використовується не системно**
   - студенти можуть мати репозиторії, але навчальна система їх не аналізує;
   - складно швидко побачити repo, PR, commits, README, активність;
   - GitHub не стає частиною навчального процесу.

3. **Оцінювання і мотивація відокремлені**
   - студент отримує бал, але не бачить довгострокового прогресу;
   - немає коїнів, рівнів, винагород, weekly goals;
   - студенту складно відчути “прокачку” від виконаних завдань.

4. **Рейтинги можуть бути несправедливими**
   - якщо рейтинг рахується одразу після перевірки, перевагу отримує той, кого викладач перевірив раніше;
   - для змагань потрібна модель: усі здають до дедлайну, потім усіх перевіряють, і тільки після цього відкривається рейтинг.

5. **Викладачу потрібна панель керування**
   - бачити студентів, завдання, здачі, дедлайни, leaderboard;
   - створювати shop-нагороди;
   - запускати weekly challenges, code contests, командні квести;
   - керувати доступом до класу.

---

## 3. Ціль проєкту

Мета GitQuest — створити освітню платформу, яка:

- навчає студентів працювати через GitHub;
- централізує всі навчальні активності класу;
- дає викладачу інструменти для організації курсу;
- мотивує студентів через коїни, XP, leaderboard, квести й винагороди;
- робить перевірку робіт прозорою;
- підтримує індивідуальні, командні та змагальні формати роботи.

---

## 4. Основні ролі

### 4.1. Student

Студент може:

- реєструватися й підтверджувати email;
- входити в систему;
- приєднуватися до кімнати/класу за invite code;
- бачити опубліковані завдання;
- здавати рішення через GitHub repo / PR URL;
- переглядати оцінку й фідбек;
- брати участь у:
  - weekly challenges;
  - knowledge sharing;
  - code review;
  - team quests;
  - code contests;
  - student quests;
- отримувати коїни й XP;
- купувати винагороди в shop;
- налаштовувати профіль.

### 4.2. Teacher / Co-teacher

Викладач може:

- створювати класи;
- запрошувати студентів;
- створювати, редагувати, публікувати й видаляти завдання;
- переглядати сабмішни;
- оцінювати роботи й давати фідбек;
- повертати роботи на доопрацювання;
- створювати shop-предмети;
- переглядати покупки студентів;
- запускати weekly challenges;
- approve-ити knowledge sharing роботи й нараховувати коїни;
- створювати code contests;
- перевіряти contest submissions;
- відкривати рейтинг contest після завершення перевірки;
- переглядати teacher dashboard, calendar, leaderboard;
- керувати кімнатою, invite code і налаштуваннями.

---

## 5. Основний функціонал

## 5.1. Authentication

Проєкт має server-backed authentication:

- реєстрація email/password/name/role;
- email verification через 6-значний код;
- login/logout;
- JWT-сесія в `httpOnly` cookie;
- protected routes на frontend;
- `requireAuth` middleware на backend;
- dev-login для локального/демо тестування.

Ключові backend-файли:

- `api/auth/register.js`
- `api/auth/verify-email.js`
- `api/auth/login.js`
- `api/auth/logout.js`
- `api/auth/me.js`
- `api/_lib/auth.js`

Сесія зберігається у cookie `gq_session`. Cookie має:

- `httpOnly`;
- `sameSite: lax`;
- `secure` у production;
- TTL 7 днів.

---

## 5.2. GitHub integration

GitHub використовується у двох напрямах:

1. **Профіль / статистика / legacy gamification**
   - GitHub login;
   - GitHub avatar;
   - статистика активності;
   - achievements, XP, level, 3D/character-функціонал.

2. **Навчальний процес**
   - здача assignment через repo/PR;
   - preview GitHub repository;
   - code review по сабмішнах;
   - team quest analytics;
   - contest submissions через repo/PR.

Ключові файли:

- `api/auth/link-github.js`
- `api/auth/unlink-github.js`
- `api/_lib/github-repo.js`
- `src/utils/github.js`
- `src/utils/githubAuth.js`
- `src/components/Auth/GitHubLinkCard.jsx`
- `src/components/Assignments/GitHubRepoPreview.jsx`

---

## 5.3. Rooms / Classes

Кімната — це навчальна група або клас.

Вона має:

- owner teacher;
- назву й опис;
- invite code;
- список учасників;
- per-room roles:
  - `teacher`;
  - `co_teacher`;
  - `student`;
- per-room coins/xp для кожного студента;
- налаштування, наприклад public leaderboard.

Ключові файли:

- `api/rooms/index.js`
- `api/rooms/join.js`
- `api/rooms/[id]/index.js`
- `api/rooms/[id]/members/[userId].js`
- `api/rooms/[id]/regenerate-invite.js`
- `api/rooms/[id]/leave.js`
- `api/_lib/rooms.js`
- `src/pages/Room.jsx`
- `src/components/Rooms/CreateRoomModal.jsx`
- `src/components/Rooms/JoinRoomModal.jsx`

Room page має вкладки:

- `Завдання`;
- `Календар`;
- `Панель викладача`;
- `Рейтинг`;
- `Weekly`;
- `Code Review`;
- `Командні`;
- `Code Contest`;
- `Квести`;
- `Магазин`;
- `Учасники`;
- `Налаштування`.

---

## 5.4. Assignments

Завдання — базова навчальна одиниця.

Викладач створює assignment із:

- title;
- description;
- deadline;
- max points;
- reward coins;
- GitHub hints:
  - required paths;
  - min commits.

Студент здає:

- repo URL;
- PR URL;
- commit SHA;
- note.

Після здачі викладач може:

- переглянути сабмішн;
- подивитися GitHub preview;
- виставити бали;
- написати feedback;
- повернути на доопрацювання.

Після grade:

- створюється або оновлюється `Grade`;
- submission отримує статус `graded`;
- розраховуються awarded coins;
- створюється запис у `PointsLedger`;
- оновлюються `RoomMember.coins/xp`;
- оновлюються `User.totals.coins/xp`.

Ключові файли:

- `api/rooms/[id]/assignments/index.js`
- `api/assignments/[id]/index.js`
- `api/assignments/[id]/publish.js`
- `api/assignments/[id]/submit.js`
- `api/assignments/[id]/submissions.js`
- `api/submissions/[id]/grade.js`
- `api/submissions/[id]/return.js`
- `api/submissions/[id]/github.js`
- `api/_lib/assignments.js`
- `api/_lib/rewards.js`
- `src/components/Assignments/AssignmentsTab.jsx`
- `src/components/Assignments/CreateAssignmentModal.jsx`
- `src/components/Assignments/GradeModal.jsx`
- `src/pages/Assignment.jsx`

---

## 5.5. Coins, XP і PointsLedger

У системі є два рівні балансу:

1. **Per-room balance**
   - `RoomMember.coins`;
   - `RoomMember.xp`.

2. **Global user totals**
   - `User.totals.coins`;
   - `User.totals.xp`.

Для аудиту використовується `PointsLedger`.

Ledger записує:

- `userId`;
- `roomId`;
- `delta`;
- `kind`;
- `reason`;
- `refType`;
- `refId`.

Типи ledger:

- `grade`;
- `bonus`;
- `penalty`;
- `purchase`;
- `refund`;
- `admin`.

Основні джерела coins:

- оцінка assignment;
- code review reward;
- weekly knowledge sharing approve;
- інші бонуси.

Основні витрати:

- покупки в shop.

---

## 5.6. Leaderboard

Leaderboard показує рейтинг студентів у кімнаті на базі coins/xp/submissions/grades.

Ключові файли:

- `api/rooms/[id]/leaderboard.js`
- `src/components/Rooms/ClassLeaderboard.jsx`

Видимість leaderboard залежить від налаштування кімнати:

- якщо `publicLeaderboard = false`, студенти не бачать рейтинг;
- staff бачить завжди.

---

## 5.7. Calendar

Calendar збирає події класу:

- assignments;
- deadlines;
- weekly challenges;
- інші навчальні активності.

Ключові файли:

- `api/rooms/[id]/calendar.js`
- `src/components/Rooms/ClassCalendar.jsx`

---

## 5.8. Teacher dashboard

Teacher dashboard — агрегована панель для викладача:

- кількість студентів;
- кількість assignments;
- сабмішни;
- grading progress;
- активність класу;
- нагороди й coins.

Ключові файли:

- `api/rooms/[id]/teacher-dashboard.js`
- `src/components/Rooms/TeacherPanel.jsx`

---

## 5.9. Student quests

Student quests — автоматичні квести на базі активності:

- перша здача;
- здача до дедлайну;
- 5 commits;
- README;
- виправлення після фідбеку;
- 90%+ score;
- здати всі опубліковані завдання.

Ключові файли:

- `api/rooms/[id]/quests.js`
- `src/components/Rooms/StudentQuests.jsx`

---

## 5.10. Weekly Challenges

Weekly Challenges — тижневі цілі класу.

Є два типи:

### Metric challenge

Автоматичний challenge на основі метрики:

- points;
- submissions;
- graded;
- activity.

Прогрес рахується автоматично за вибраний тиждень.

### Knowledge Sharing

Викладач створює тему, студент завантажує презентацію:

- PDF;
- PPT;
- PPTX.

Викладач бачить submitted presentations і має кнопку approve.

Після approve:

- submission отримує `approvedAt`;
- зберігається `approvedById`;
- фіксується `awardedCoins`;
- створюється `PointsLedger` запис;
- студент отримує coins/xp у кімнаті й глобально.

Ключові файли:

- `api/rooms/[id]/weekly-challenges.js`
- `src/components/Rooms/WeeklyChallenges.jsx`

---

## 5.11. Code Review

Code Review — студентська peer-review активність.

Сценарій:

1. Студент здає assignment.
2. Інші студенти бачать доступні submissions для review.
3. Reviewer пише:
   - rating;
   - summary;
   - strengths;
   - suggestions.
4. За review студент отримує reward coins.
5. Ledger фіксує bonus.

Ключові файли:

- `api/rooms/[id]/code-reviews.js`
- `src/components/Rooms/CodeReviewGame.jsx`

---

## 5.12. Team Quests

Team Quests — командні активності.

Викладач створює командний quest:

- title;
- description;
- team size;
- start/end dates;
- reward.

Система розподіляє студентів по командах. Команди можуть подавати:

- repo URL;
- demo URL;
- note.

Для staff може підтягуватись GitHub analytics:

- commits;
- PRs;
- merged PRs;
- reviews;
- issues;
- active days;
- contributors.

Викладач може:

- залишати teacher note;
- обрати winner team;
- очистити winner.

Ключові файли:

- `api/rooms/[id]/team-quests.js`
- `src/components/Rooms/TeamQuests.jsx`

---

## 5.13. Code Contest

Code Contest замінив стару модель “міні-турнірів”.

Проблема старого підходу:

- рейтинг рахувався одразу за метриками;
- студент, чию роботу перевірили раніше, міг отримати перевагу;
- не було чесного процесу “усі здають → усіх перевірили → рейтинг відкрили”.

Нова модель:

1. Викладач створює contest.
2. Додає 1–5 задач.
3. Кожна задача має:
   - title;
   - description;
   - maxPoints.
4. Студенти здають рішення до дедлайну:
   - repo URL;
   - PR URL;
   - note.
5. До дедлайну фінальний рейтинг прихований.
6. Після дедлайну викладач перевіряє сабмішни.
7. Після перевірки всіх сабмішнів викладач відкриває рейтинг.
8. Студенти бачать фінальний рейтинг тільки після публікації.

Contest states:

- `upcoming`;
- `active`;
- `review`;
- `completed`;
- `archived`.

Ключові файли:

- `api/rooms/[id]/tournaments.js`
- `src/components/Rooms/MiniTournaments.jsx`
- `api/_lib/models/index.js` (`MiniTournamentSchema`, `ContestTaskSchema`, `ContestSubmissionSchema`)

---

## 5.14. Shop

Shop дозволяє викладачу створювати винагороди, які студент купує за coins.

Типи items:

- `auto_pass`;
- `retake`;
- `extra_attempt`;
- `title`;
- `cosmetic`;
- `custom`.

Purchase:

- списує coins;
- створює `Purchase`;
- створює ledger entry;
- може активувати косметику або титул.

Ключові файли:

- `api/rooms/[id]/shop/index.js`
- `api/shop/[id]/buy.js`
- `api/shop/[id]/index.js`
- `api/rooms/[id]/purchases.js`
- `src/components/Shop/ShopTab.jsx`
- `src/components/Shop/CreateShopItemModal.jsx`
- `src/components/Shop/PurchasesModal.jsx`

---

## 5.15. Profile і cosmetics

Профіль користувача містить:

- імʼя;
- email;
- avatar;
- GitHub login;
- totals coins/xp;
- status;
- bio;
- favorite stack;
- owned cosmetics;
- active title/banner/frame/accent.

Ключові файли:

- `api/profile/me.js`
- `api/profile/[id].js`
- `api/cosmetics/index.js`
- `api/cosmetics/buy.js`
- `src/pages/Profile.jsx`
- `src/components/Character/ShareableCard.jsx`

---

## 6. Frontend архітектура

Frontend побудований як SPA:

- React 19;
- Vite;
- React Router;
- Zustand;
- Framer Motion;
- Tailwind CSS;
- Recharts;
- Three.js / React Three Fiber для legacy character/gamification частини.

### 6.1. Routing

Основні маршрути:

| Route | Сторінка | Призначення |
|---|---|---|
| `/` | `Landing` | Публічна головна |
| `/register` | `Register` | Реєстрація |
| `/login` | `Login` | Вхід |
| `/verify-email` | `VerifyEmail` | Підтвердження email |
| `/auth/callback` | `AuthCallback` | GitHub OAuth callback |
| `/dashboard` | `Dashboard` | Dashboard користувача |
| `/rooms/:id` | `Room` | Кімната/клас |
| `/assignments/:id` | `Assignment` | Деталі assignment |
| `/profile` | `ProfilePage` | Власний профіль |
| `/profile/:id` | `ProfilePage` | Публічний профіль іншого користувача |

Файл маршрутизації:

- `src/App.jsx`

### 6.2. Auth guards

Protected pages обгорнуті у:

- `ProtectedRoute`;
- `GuestOnlyRoute`.

Ключовий файл:

- `src/components/Auth/ProtectedRoute.jsx`

### 6.3. API client

Frontend API client:

- `src/utils/api.js`

Він:

- додає `credentials: "include"`;
- автоматично JSON-stringify body;
- парсить JSON responses;
- кидає `ApiError` для неуспішних HTTP статусів;
- групує API helper-и за доменами:
  - `authApi`;
  - `roomsApi`;
  - `assignmentsApi`;
  - `submissionsApi`;
  - `shopApi`;
  - `profileApi`;
  - `cosmeticsApi`.

### 6.4. Global state

Zustand store:

- `src/store/useStore.js`

Він зберігає:

- auth user;
- auth ready/loading/error;
- pending verify email;
- legacy GitHub stats;
- character mood;
- achievements;
- coins;
- profile customization;
- friends;
- methods для login/register/logout/hydrate.

### 6.5. UI components

UI-компоненти:

- `Modal`;
- `Navbar`;
- `GlassCard`;
- `NeonButton`;
- backgrounds;
- animated numbers.

Ключова директорія:

- `src/components/UI/`

### 6.6. Domain components

Основні доменні компоненти:

- `src/components/Assignments/`
- `src/components/Rooms/`
- `src/components/Shop/`
- `src/components/Auth/`
- `src/components/Dashboard/`
- `src/components/Character/`

---

## 7. Backend архітектура

Backend реалізований як набір Vercel-style serverless API handlers у директорії `api/`.

Кожен файл у `api/` відповідає endpoint-у.

### 7.1. Основні принципи

- ESM modules.
- MongoDB через Mongoose.
- Підключення до DB кешується через `globalThis`.
- Auth через JWT cookie.
- Input validation через Zod.
- Domain helpers винесені в `api/_lib`.
- Кожен endpoint сам перевіряє:
  - auth;
  - room membership;
  - role/staff permission;
  - ownership where needed.

### 7.2. Shared backend libs

| Файл | Призначення |
|---|---|
| `api/_lib/db.js` | MongoDB connection cache, DNS fallback |
| `api/_lib/auth.js` | password hashing, JWT, cookies, requireAuth |
| `api/_lib/models/index.js` | Mongoose schemas/models |
| `api/_lib/rooms.js` | room access helpers |
| `api/_lib/assignments.js` | assignment/submission access helpers |
| `api/_lib/rewards.js` | reward coins formulas |
| `api/_lib/validate.js` | Zod schemas |
| `api/_lib/email.js` | email delivery |
| `api/_lib/invite.js` | invite code generation |
| `api/_lib/github-repo.js` | GitHub repo/PR checks |
| `api/_lib/shop.js` | shop helpers |
| `api/_lib/cosmetics.js` | cosmetics catalog/helpers |

### 7.3. Endpoint groups

#### Auth

- `api/auth/register.js`
- `api/auth/verify-email.js`
- `api/auth/resend-code.js`
- `api/auth/login.js`
- `api/auth/logout.js`
- `api/auth/me.js`
- `api/auth/dev-login.js`
- `api/auth/link-github.js`
- `api/auth/unlink-github.js`

#### Rooms

- `api/rooms/index.js`
- `api/rooms/join.js`
- `api/rooms/[id]/index.js`
- `api/rooms/[id]/leave.js`
- `api/rooms/[id]/leaderboard.js`
- `api/rooms/[id]/calendar.js`
- `api/rooms/[id]/teacher-dashboard.js`
- `api/rooms/[id]/regenerate-invite.js`
- `api/rooms/[id]/members/[userId].js`

#### Assignments / submissions

- `api/rooms/[id]/assignments/index.js`
- `api/assignments/[id]/index.js`
- `api/assignments/[id]/publish.js`
- `api/assignments/[id]/submit.js`
- `api/assignments/[id]/submissions.js`
- `api/submissions/[id]/index.js`
- `api/submissions/[id]/grade.js`
- `api/submissions/[id]/return.js`
- `api/submissions/[id]/github.js`

#### Activities

- `api/rooms/[id]/quests.js`
- `api/rooms/[id]/weekly-challenges.js`
- `api/rooms/[id]/code-reviews.js`
- `api/rooms/[id]/team-quests.js`
- `api/rooms/[id]/tournaments.js`

#### Shop / cosmetics / profile

- `api/rooms/[id]/shop/index.js`
- `api/shop/[id]/index.js`
- `api/shop/[id]/buy.js`
- `api/rooms/[id]/purchases.js`
- `api/cosmetics/index.js`
- `api/cosmetics/buy.js`
- `api/profile/me.js`
- `api/profile/[id].js`

---

## 8. Database architecture

Database: MongoDB Atlas / MongoDB через Mongoose.

### 8.1. Основні колекції

#### User

Зберігає:

- email;
- passwordHash;
- role;
- name;
- avatar;
- GitHub linkage;
- email verification status;
- totals coins/xp;
- profile style/cosmetics.

#### EmailCode

Зберігає verification/reset/login codes:

- email;
- purpose;
- codeHash;
- expiresAt;
- attempts;
- consumedAt.

Коди мають TTL index.

#### Session

Майбутня структура для refresh-token rotation.

#### Room

Клас/група:

- ownerId;
- name;
- description;
- inviteCode;
- archived;
- settings.

#### RoomMember

Membership у кімнаті:

- roomId;
- userId;
- roleInRoom;
- joinedAt;
- coins;
- xp.

#### Assignment

Навчальне завдання:

- roomId;
- authorId;
- title;
- description;
- deadlineAt;
- maxPoints;
- rewardCoins;
- githubHint;
- publishedAt.

#### Submission

Здача assignment:

- assignmentId;
- studentId;
- repoUrl;
- prUrl;
- commitSha;
- note;
- status;
- submittedAt;
- returnedAt;
- resubmittedAfterReturnAt.

#### Grade

Оцінка:

- submissionId;
- points;
- awardedCoins;
- feedback;
- gradedById;
- gradedAt.

#### PointsLedger

Аудит coins/xp:

- userId;
- roomId;
- delta;
- kind;
- reason;
- refType;
- refId.

#### CodeReview

Peer review:

- roomId;
- assignmentId;
- submissionId;
- reviewerId;
- authorId;
- rating;
- summary;
- strengths;
- suggestions;
- rewardCoins;
- awardedAt.

#### ShopItem / Purchase

Shop item і покупка.

#### MiniTournament / Code Contest

Попри стару назву model accessor `MiniTournament`, фактично це Code Contest:

- kind = `code_contest`;
- tasks;
- submissions;
- startsAt;
- endsAt;
- reviewCompletedAt;
- rankingsPublishedAt.

#### WeeklyChallenge / WeeklyChallengeSubmission

Weekly goals і knowledge sharing submissions.

#### TeamQuest

Командні активності з teams, repo/demo/note і analytics.

#### Message / Attachment

Підготовка до room chat.

#### Achievement / UserAchievement

Глобальні achievements.

---

## 9. Основні сценарії роботи

## 9.1. Реєстрація студента

1. Користувач відкриває `/register`.
2. Вводить email/password/name/role.
3. Frontend викликає `authApi.register`.
4. Backend:
   - валідує input;
   - хешує password;
   - створює user;
   - генерує verification code;
   - зберігає hash code;
   - відправляє email.
5. Користувач переходить на `/verify-email`.
6. Вводить код.
7. Backend підтверджує email і ставить session cookie.
8. Frontend отримує `authUser` і відкриває dashboard.

## 9.2. Створення класу

1. Teacher відкриває dashboard.
2. Створює room.
3. Backend створює `Room` і `RoomMember` для teacher.
4. Teacher копіює invite code.
5. Student вводить invite code і стає `RoomMember`.

## 9.3. Assignment workflow

1. Teacher створює assignment.
2. Assignment публікується.
3. Student бачить assignment у кімнаті.
4. Student здає repo/PR.
5. Teacher відкриває submission.
6. Teacher перевіряє GitHub preview.
7. Teacher grade-ить.
8. Student отримує:
   - points;
   - feedback;
   - coins/xp;
   - оновлення leaderboard.

## 9.4. Weekly Knowledge Sharing

1. Teacher створює weekly challenge типу `knowledge_sharing`.
2. Student завантажує PDF/PPT/PPTX.
3. Teacher бачить submissions.
4. Teacher натискає approve.
5. Backend одноразово:
   - ставить approvedAt;
   - записує awardedCoins;
   - додає ledger;
   - інкрементить coins/xp.

## 9.5. Code Contest workflow

1. Teacher створює Code Contest.
2. Додає 1–5 задач.
3. До дедлайну students здають рішення.
4. Рейтинг прихований.
5. Після дедлайну teacher перевіряє всі submissions.
6. Коли pending submissions = 0, teacher відкриває рейтинг.
7. Students бачать фінальний standings.

## 9.6. Shop workflow

1. Teacher створює shop item.
2. Student купує item за coins.
3. Backend списує coins через ledger.
4. Purchase зберігається.
5. Teacher може переглядати purchases.

---

## 10. Безпека

Проєкт враховує базові security practices:

- password hashing через bcrypt;
- JWT secret не потрапляє у frontend;
- session token у `httpOnly` cookie;
- email verification codes зберігаються як HMAC hash;
- verification codes мають TTL;
- input validation через Zod;
- room access перевіряється через membership;
- teacher-only actions мають role checks;
- GitHub OAuth secret має бути тільки у backend env;
- frontend API завжди використовує `credentials: "include"`;
- public API responses не повертають `passwordHash`.

---

## 11. Environment variables

Файл прикладу:

- `.env.example`

Основні змінні:

```bash
VITE_GITHUB_CLIENT_ID=
MONGODB_URI=
JWT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
RESEND_API_KEY=
EMAIL_FROM="GitQuest <onboarding@resend.dev>"
```

Пояснення:

- `VITE_GITHUB_CLIENT_ID` — browser-visible GitHub client id;
- `MONGODB_URI` — MongoDB connection string;
- `JWT_SECRET` — секрет для session JWT і HMAC verification codes;
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — server-side OAuth;
- `RESEND_API_KEY` — email delivery;
- `EMAIL_FROM` — sender address.

---

## 12. Build, lint, запуск

Основні команди:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

`package.json` scripts:

- `dev` — Vite dev server;
- `build` — production build;
- `lint` — ESLint;
- `preview` — preview production build;
- `code` — generation script.

---

## 13. Deployment

Проєкт орієнтований на Vercel-style deployment:

- frontend build через Vite;
- backend endpoints у `api/` як serverless functions;
- MongoDB Atlas для persistence;
- Resend для email verification.

Корисні docs:

- `docs/setup.md`
- `docs/deploy.md`
- `docs/github-oauth.md`

---

## 14. Архітектурна схема

```text
Browser
  |
  | React SPA
  | - React Router
  | - Zustand store
  | - Tailwind UI
  |
  v
src/utils/api.js
  |
  | fetch(..., credentials: "include")
  |
  v
Vercel API functions /api/*
  |
  | requireAuth
  | require room membership / staff checks
  | Zod validation
  |
  v
Mongoose models
  |
  v
MongoDB Atlas

External services:
  - GitHub API
  - Resend Email
```

---

## 15. Дані та звʼязки

```text
User
  ├── RoomMember ── Room
  ├── Submission ── Assignment ── Room
  ├── Grade ── Submission
  ├── PointsLedger
  ├── Purchase ── ShopItem ── Room
  ├── CodeReview
  ├── WeeklyChallengeSubmission ── WeeklyChallenge ── Room
  └── MiniTournament.submissions ── MiniTournament.tasks

Room
  ├── RoomMember[]
  ├── Assignment[]
  ├── ShopItem[]
  ├── WeeklyChallenge[]
  ├── TeamQuest[]
  ├── MiniTournament / CodeContest[]
  └── PointsLedger[]
```

---

## 16. Поточний стан і важливі нюанси

1. Проєкт історично починався як GitHub gamification / 3D character app, але зараз розширений до повноцінної educational platform.
2. У README ще є legacy-опис GitHub-гейміфікації, але код уже містить:
   - auth;
   - rooms;
   - assignments;
   - shop;
   - contests;
   - weekly challenges;
   - team quests.
3. `MiniTournament` model accessor зберіг стару назву, але фактично використовується як Code Contest.
4. `Message` і `Attachment` schemas уже є, але chat вкладка поки закоментована як майбутня.
5. Частина legacy GitHub direct flow у Zustand лишена для сумісності.

---

## 17. Можливі напрями розвитку

### 17.1. Технічні покращення

- винести Code Contest model у окрему назву `CodeContest`;
- додати міграцію для старих `MiniTournament`;
- додати unit/integration tests для API handlers;
- додати e2e tests для основних сценаріїв;
- покращити lint config, щоб не блокувався на legacy warnings;
- розділити великі frontend chunks через dynamic imports.

### 17.2. Продуктові покращення

- chat у кімнаті;
- автоматична перевірка GitHub repo за test cases;
- plagiarism detection;
- rubrics для grading;
- badges за contest/weekly/team quests;
- notification system;
- student progress timeline;
- export grades to CSV;
- teacher analytics по темах/складності задач;
- інтеграція з GitHub Classroom.

### 17.3. Security/operations

- refresh-token rotation;
- rate limiting для auth endpoints;
- CSRF token для mutating endpoints;
- audit log для teacher actions;
- background jobs для GitHub analytics;
- production index sync strategy.

---

## 18. Висновок

GitQuest — це не просто dashboard для GitHub-статистики. У поточному вигляді це навчальна платформа, яка обʼєднує:

- GitHub-native здачу робіт;
- класи й ролі;
- оцінювання;
- coins/xp;
- leaderboard;
- shop;
- weekly challenges;
- peer review;
- командні квести;
- code contests із чесним прихованим рейтингом до завершення перевірки.

Проєкт вирішує практичну проблему організації навчання програмуванню: робить процес здачі, перевірки, мотивації й аналітики централізованим, прозорим і ближчим до реального software development workflow.
