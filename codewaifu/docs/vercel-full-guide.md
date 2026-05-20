# Повний гайд: як безкоштовно захостити GitQuest / CodeWaifu на Vercel

Цей гайд описує повний шлях від локального проєкту до робочого сайту з власним безкоштовним посиланням виду:

```text
https://твоя-назва.vercel.app
```

Проєкт знаходиться в папці `codewaifu`, використовує **Vite + React** для frontend і **Vercel Serverless Functions** у папці `api/` для backend. Через це найкращий безкоштовний хостинг для нього — **Vercel**.

---

## 0. Що вийде в результаті

Після деплою ти отримаєш:

- сайт за посиланням `https://your-project.vercel.app`
- frontend React/Vite
- backend API routes з папки `api/`
- авторизацію через cookies/JWT
- підключення до MongoDB Atlas
- опціонально: email-коди через Resend
- опціонально: привʼязку GitHub акаунта через GitHub OAuth

---

## 1. Що потрібно підготувати

Обовʼязково:

1. GitHub акаунт
2. Vercel акаунт
3. MongoDB Atlas акаунт
4. Проєкт має бути запушений на GitHub

Опціонально, але бажано:

1. Resend акаунт — для email-кодів
2. GitHub OAuth App — для привʼязки GitHub акаунта
3. Власний домен — якщо хочеш не `vercel.app`, а щось типу `my-site.com`

---

## 2. Перевірка проєкту перед деплоєм

Перейди в папку проєкту:

```bash
cd codewaifu
```

Встанови залежності, якщо ще не встановлені:

```bash
npm install
```

Запусти production build:

```bash
npm run build
```

Очікуваний результат:

```text
✓ built
```

Якщо build проходить — Vercel зможе зібрати frontend.

У цьому проєкті build command:

```text
npm run build
```

Output directory:

```text
dist
```

---

## 3. Важливо: структура проєкту

Репозиторій має приблизно таку структуру:

```text
waifu2/
  codewaifu/
    api/
    src/
    docs/
    package.json
    vite.config.js
    vercel.json
```

Тобто `package.json` знаходиться **не в корені репозиторію**, а в папці:

```text
codewaifu
```

Тому у Vercel обовʼязково треба вказати:

```text
Root Directory: codewaifu
```

Якщо цього не зробити, Vercel не знайде правильний `package.json` і деплой може впасти.

---

## 4. Підготовка GitHub репозиторію

Перевір, що локальні секрети не потраплять у GitHub.

У `.gitignore` мають бути такі рядки:

```gitignore
.env
.env.*
!.env.example
node_modules
dist
```

Файли, які не можна пушити:

```text
.env
.env.local
```

Файл, який можна пушити:

```text
.env.example
```

Якщо репозиторій ще не створений на GitHub:

```bash
git add .
git commit -m "Prepare project for Vercel deployment"
git branch -M main
git remote add origin https://github.com/ТВІЙ-ЛОГІН/НАЗВА-РЕПО.git
git push -u origin main
```

Якщо репозиторій уже є:

```bash
git add .
git commit -m "Update project before deployment"
git push
```

---

## 5. MongoDB Atlas: безкоштовна база даних

Backend цього проєкту використовує MongoDB. Без `MONGODB_URI` API routes, реєстрація, логін і кімнати не працюватимуть.

### 5.1 Створити MongoDB Atlas акаунт

1. Перейди на MongoDB Atlas
2. Створи безкоштовний акаунт
3. Створи новий cluster
4. Обери free tier, якщо доступний

### 5.2 Створити database user

У MongoDB Atlas:

```text
Database Access → Add New Database User
```

Створи користувача з паролем.

Збережи:

```text
username
password
```

### 5.3 Дозволити доступ з Vercel

У MongoDB Atlas:

```text
Network Access → Add IP Address
```

Для Vercel найпростіший варіант:

```text
0.0.0.0/0
```

Це дозволяє підключення з будь-якого IP. Для serverless-хостингу це часто потрібно, бо IP у Vercel можуть змінюватися.

### 5.4 Отримати connection string

У MongoDB Atlas:

```text
Database → Connect → Drivers → Node.js
```

Скопіюй рядок виду:

```text
mongodb+srv://USER:PASSWORD@cluster.mongodb.net/gitquest?retryWrites=true&w=majority
```

Замінити:

```text
USER
PASSWORD
```

на свій username і password.

Це буде значення для:

```env
MONGODB_URI=...
```

---

## 6. JWT_SECRET

`JWT_SECRET` потрібен для авторизації користувачів і підпису session token.

Згенеруй його командою:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Приклад результату:

```text
e3c5b8d0f0a5d1f4c0c0a0e3b8d2f1a9a4f7c1e2d3b5a6c7d8e9f0011223344
```

У Vercel це буде:

```env
JWT_SECRET=e3c5...
```

Важливо:

- не використовуй короткий секрет
- не пуш його в GitHub
- для production краще мати окремий секрет, не такий як у `.env.local`

---

## 7. Resend для email-кодів

Проєкт має email-підтвердження. Для production бажано налаштувати Resend.

Без `RESEND_API_KEY` у production код підтвердження не буде показуватись користувачу в браузері. Тобто реєстрація може не працювати нормально для реальних користувачів.

### 7.1 Створити Resend API key

1. Зареєструйся в Resend
2. Відкрий API Keys
3. Створи новий key
4. Скопіюй його

У Vercel:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

### 7.2 EMAIL_FROM

Для тесту можна використати:

```env
EMAIL_FROM=GitQuest <onboarding@resend.dev>
```

Для нормального production краще підтвердити власний домен у Resend і використовувати:

```env
EMAIL_FROM=GitQuest <noreply@твій-домен.com>
```

Якщо домен не підтверджений, Resend може обмежувати відправку листів.

---

## 8. GitHub OAuth для привʼязки GitHub акаунта

Цей крок потрібен, якщо на сайті має працювати кнопка привʼязки GitHub акаунта.

Потрібні змінні:

```env
VITE_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### 8.1 Створити GitHub OAuth App

Перейди в GitHub:

```text
Settings → Developer settings → OAuth Apps → New OAuth App
```

Заповни:

```text
Application name: GitQuest Production
Homepage URL: https://твоя-назва.vercel.app
Authorization callback URL: https://твоя-назва.vercel.app/auth/callback
```

Після створення скопіюй:

```text
Client ID
Client Secret
```

У Vercel додай:

```env
VITE_GITHUB_CLIENT_ID=твій_Client_ID
GITHUB_CLIENT_ID=твій_Client_ID
GITHUB_CLIENT_SECRET=твій_Client_Secret
```

Важливо:

- `VITE_GITHUB_CLIENT_ID` потрапляє у frontend bundle
- `GITHUB_CLIENT_SECRET` має бути тільки у server environment
- якщо змінюєш `VITE_GITHUB_CLIENT_ID`, треба робити redeploy без build cache

---

## 9. Необовʼязкова змінна GITHUB_PAT

У проєкті є GitHub API-запити для перевірки репозиторіїв/завдань.

Без токена GitHub дає нижчий rate limit.

Якщо буде помилка rate limit, можна додати:

```env
GITHUB_PAT=github_pat_...
```

Це не обовʼязково для першого деплою.

---

## 10. Повний список Environment Variables

Мінімум для роботи backend:

```env
MONGODB_URI=...
JWT_SECRET=...
```

Для email:

```env
RESEND_API_KEY=...
EMAIL_FROM=GitQuest <onboarding@resend.dev>
```

Для GitHub OAuth:

```env
VITE_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Опціонально:

```env
GITHUB_PAT=...
MONGODB_DNS=...
ENABLE_DEMO_LOGIN=true
```

Для demo-кнопок тестового входу на Vercel потрібна змінна:

```env
ENABLE_DEMO_LOGIN=true
```

`ENABLE_DEMO_LOGIN` вмикає backend endpoint `/api/auth/dev-login`. Кнопки в інтерфейсі показуються завжди.

Повний рекомендований набір:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
RESEND_API_KEY=...
EMAIL_FROM=GitQuest <onboarding@resend.dev>
VITE_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_PAT=...
ENABLE_DEMO_LOGIN=true
```

---

## 11. Деплой на Vercel

### 11.1 Імпорт проєкту

1. Відкрий Vercel
2. Увійди через GitHub
3. Натисни:

```text
Add New → Project
```

4. Обери GitHub репозиторій
5. Натисни Import

### 11.2 Налаштування проєкту

У Vercel вкажи:

```text
Framework Preset: Vite
Root Directory: codewaifu
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Найважливіше:

```text
Root Directory: codewaifu
```

### 11.3 Environment Variables

У Vercel:

```text
Project → Settings → Environment Variables
```

Додай змінні з розділу 10.

Для кожної змінної вибери середовища:

```text
Production
Preview
```

Можна також вибрати `Development`, але локально зазвичай використовується `.env.local`.

### 11.4 Deploy

Натисни:

```text
Deploy
```

Після завершення Vercel дасть посилання виду:

```text
https://your-project.vercel.app
```

---

## 12. Redeploy після зміни env-змінних

Якщо ти додав або змінив environment variables після першого деплою, зроби redeploy.

У Vercel:

```text
Project → Deployments → останній deployment → ⋯ → Redeploy
```

Якщо змінював `VITE_*` змінні, обовʼязково вимкни cache:

```text
Use existing Build Cache: No
```

Причина: `VITE_*` змінні вбудовуються у frontend під час build.

---

## 13. Перевірка після деплою

Після деплою перевір:

### 13.1 Frontend

Відкрий:

```text
https://your-project.vercel.app
```

Має завантажитися головна сторінка.

### 13.2 API health endpoint

Відкрий:

```text
https://your-project.vercel.app/api/health
```

Очікувано має бути JSON-відповідь.

Якщо API повертає помилку, відкрий logs у Vercel:

```text
Project → Deployments → конкретний deployment → Functions / Logs
```

### 13.3 Реєстрація

Перевір:

```text
/register
```

Спробуй створити користувача.

Якщо email не приходить:

- перевір `RESEND_API_KEY`
- перевір `EMAIL_FROM`
- перевір Resend logs
- перевір, чи Resend не в sandbox-обмеженнях

### 13.4 Логін

Перевір:

```text
/login
```

Спробуй увійти після реєстрації.

### 13.5 GitHub OAuth

Якщо налаштований GitHub OAuth:

1. Увійди в акаунт
2. Натисни привʼязку GitHub
3. GitHub має повернути тебе на:

```text
https://your-project.vercel.app/auth/callback
```

Якщо бачиш `redirect_uri mismatch`, перевір callback URL у GitHub OAuth App.

---

## 14. Як отримати красивіше безкоштовне посилання

У Vercel можна змінити назву проєкту.

Наприклад, якщо назва project:

```text
codewaifu
```

посилання може бути:

```text
https://codewaifu.vercel.app
```

Якщо назва зайнята, Vercel дасть іншу або додасть суфікс.

Змінити назву:

```text
Vercel → Project → Settings → General → Project Name
```

Після зміни назви також онови GitHub OAuth callback, якщо він використовується.

---

## 15. Власний домен

Безкоштовне посилання Vercel:

```text
https://your-project.vercel.app
```

Власний домен типу:

```text
https://my-site.com
```

зазвичай платний, бо домен треба купити.

Якщо домен уже є:

1. Vercel → Project → Settings → Domains
2. Add domain
3. Введи домен
4. Vercel покаже DNS records
5. Додай ці records у провайдера домену
6. Дочекайся активації SSL

Після підключення домену онови:

```text
GitHub OAuth App → Homepage URL
GitHub OAuth App → Authorization callback URL
Resend EMAIL_FROM / domain settings
```

Callback має бути:

```text
https://твій-домен.com/auth/callback
```

---

## 16. Типові проблеми та рішення

### Vercel не знаходить package.json

Причина: неправильно вказаний root directory.

Рішення:

```text
Root Directory: codewaifu
```

---

### Build падає

Локально запусти:

```bash
cd codewaifu
npm install
npm run build
```

Якщо локально build падає, виправ помилки перед деплоєм.

---

### `MONGODB_URI is not configured`

Причина: у Vercel не доданий `MONGODB_URI`.

Рішення:

```text
Vercel → Project → Settings → Environment Variables
```

Додай:

```env
MONGODB_URI=...
```

Після цього redeploy.

---

### `Database unavailable`

Можливі причини:

1. неправильний MongoDB connection string
2. неправильний пароль
3. IP Vercel не дозволений у MongoDB Atlas
4. база не прокинулась після cold start

Перевір у MongoDB Atlas:

```text
Network Access → 0.0.0.0/0
```

---

### `JWT_SECRET is missing or too short`

Причина: `JWT_SECRET` не заданий або коротший за 32 символи.

Рішення:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Додай результат у Vercel.

---

### Email не приходить

Перевір:

```env
RESEND_API_KEY
EMAIL_FROM
```

Також перевір Resend dashboard logs.

Якщо використовуєш `onboarding@resend.dev`, можуть бути sandbox-обмеження.

---

### `redirect_uri mismatch`

Причина: GitHub OAuth callback URL не співпадає.

У GitHub OAuth App має бути:

```text
https://your-project.vercel.app/auth/callback
```

Якщо використовуєш власний домен:

```text
https://your-domain.com/auth/callback
```

Також перевір, що `VITE_GITHUB_CLIENT_ID` у Vercel саме від цієї OAuth App.

---

### GitHub OAuth кнопка не працює

Перевір, що у Vercel є:

```env
VITE_GITHUB_CLIENT_ID
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

Якщо ти додав `VITE_GITHUB_CLIENT_ID` після деплою, зроби redeploy без build cache.

---

### API routes дають 404

Перевір:

1. Чи `api/` знаходиться всередині `codewaifu`
2. Чи Vercel root directory = `codewaifu`
3. Чи файл `vercel.json` є в `codewaifu`

---

### React routes дають 404 після refresh

Для SPA потрібен rewrite на `index.html`.

У проєкті має бути `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 17. Чи треба виправляти lint перед деплоєм

У цьому проєкті команда build:

```bash
npm run build
```

не запускає lint автоматично.

Тому якщо:

```bash
npm run build
```

проходить, Vercel deployment має пройти.

Але окремо:

```bash
npm run lint
```

може показувати помилки. Їх бажано виправити, але вони не блокують деплой, якщо Vercel build command не запускає lint.

---

## 18. Мінімальний швидкий шлях

Якщо треба дуже коротко:

1. Запуш проєкт на GitHub
2. Vercel → Add New Project
3. Import repository
4. Settings:

```text
Root Directory: codewaifu
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

5. Додай env:

```env
MONGODB_URI=...
JWT_SECRET=...
```

6. Якщо потрібні email:

```env
RESEND_API_KEY=...
EMAIL_FROM=GitQuest <onboarding@resend.dev>
```

7. Якщо потрібен GitHub OAuth:

```env
VITE_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

8. Deploy
9. Перевір:

```text
https://your-project.vercel.app
https://your-project.vercel.app/api/health
```

---

## 19. Рекомендований порядок дій саме для цього проєкту

1. Перевір локально:

```bash
cd codewaifu
npm install
npm run build
```

2. Створи MongoDB Atlas cluster
3. Отримай `MONGODB_URI`
4. Згенеруй `JWT_SECRET`
5. Запуш код на GitHub
6. Імпортуй репозиторій у Vercel
7. Вкажи `Root Directory: codewaifu`
8. Додай `MONGODB_URI` і `JWT_SECRET`
9. Зроби Deploy
10. Перевір `/api/health`
11. Додай Resend, якщо потрібні email-коди
12. Додай GitHub OAuth, якщо потрібна привʼязка GitHub
13. Після зміни `VITE_*` змінних зроби redeploy без cache

---

## 20. Готовий шаблон env для Vercel

Скопіюй і заповни:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/gitquest?retryWrites=true&w=majority
JWT_SECRET=GENERATE_WITH_NODE_CRYPTO

RESEND_API_KEY=
EMAIL_FROM=GitQuest <onboarding@resend.dev>

VITE_GITHUB_CLIENT_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

GITHUB_PAT=
```

Мінімально можна почати тільки з:

```env
MONGODB_URI=...
JWT_SECRET=...
```

---

## 21. Фінальний чек-лист

- [ ] Код запушений на GitHub
- [ ] У Vercel обраний правильний repository
- [ ] `Root Directory` = `codewaifu`
- [ ] `Build Command` = `npm run build`
- [ ] `Output Directory` = `dist`
- [ ] `MONGODB_URI` доданий у Vercel
- [ ] `JWT_SECRET` доданий у Vercel
- [ ] MongoDB Atlas allowlist містить `0.0.0.0/0`
- [ ] Якщо потрібні email — доданий `RESEND_API_KEY`
- [ ] Якщо потрібен GitHub OAuth — додані `VITE_GITHUB_CLIENT_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- [ ] Якщо змінював `VITE_*` — зроблений redeploy без cache
- [ ] `/api/health` працює
- [ ] `/register` працює
- [ ] `/login` працює
- [ ] React routes не падають після refresh

Після цього сайт готовий до використання.
