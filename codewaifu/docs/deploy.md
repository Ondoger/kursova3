# Деплой GitQuest на Vercel

Гайд по перенесенню проекту з `localhost:5173` у продакшен. Розрахований
на ~30 хвилин першого разу.

---

## Чек-лист перед деплоєм

- [x] MongoDB Atlas: кластер створено, IP allowlist = `0.0.0.0/0`
- [x] Resend: акаунт є, API key згенерований
- [x] GitHub OAuth App для **dev** (callback `http://localhost:5173/auth/callback`)
- [ ] Vercel акаунт + проект залінкований до Git-репо
- [ ] Окрема GitHub OAuth App для **prod** з callback на твоєму Vercel URL
- [ ] Усі env-змінні додані у Vercel
- [ ] Resend domain верифікований (опційно, але без цього лист піде тільки на твою власну пошту)

---

## 1. Перший деплой на Vercel

### Якщо репо ще не запушений

```bash
cd codewaifu
git add .
git commit -m "GitQuest MVP"
git remote add origin git@github.com:твій-логін/gitquest.git
git push -u origin main
```

### Завести проект у Vercel

1. <https://vercel.com> → Sign in with GitHub
2. **Add New → Project** → знайди свій репо → **Import**
3. Налаштування:
   - **Framework Preset:** Vite (Vercel зазвичай детектить сам)
   - **Root Directory:** `codewaifu` (важливо! бо корінь репо — `waifu2/`,
     а наш фронтенд лежить у вкладеному `codewaifu/`)
   - **Build Command:** `npm run build` (за замовчуванням)
   - **Output Directory:** `dist`
4. **Environment Variables** — поки що не додавай, додамо в наступному кроці
5. **Deploy** → дочекайся білд (зазвичай 1-2 хв)

Перший деплой майже точно зламається з помилками БД/auth — це нормально,
бо env-змінних ще немає. Виправимо.

### Запам'ятай свій URL

Vercel дасть URL виду:
```
https://gitquest-xxxxx.vercel.app
```

Цей URL буде використано далі скрізь де треба `<TVERCEL_URL>`.

---

## 2. Окрема GitHub OAuth App для production

**Не використовуй ту саму OAuth App що для localhost.** Причини:
- GitHub дозволяє тільки **один** callback URL на апку
- Якщо засвітити dev-секрет в одному з прод-логів, обидва середовища ризикують
- Різні rate-limits треба моніторити окремо

### Створення:

1. <https://github.com/settings/applications/new>
2. Заповни:

   | Поле | Значення |
   |---|---|
   | Application name | `GitQuest (prod)` |
   | Homepage URL | `https://gitquest-xxxxx.vercel.app` |
   | Authorization callback URL | `https://gitquest-xxxxx.vercel.app/auth/callback` |

3. **Register application**
4. Скопіюй **Client ID** і **Generate a new client secret**

> 💡 Якщо плануєш додати custom domain пізніше (`gitquest.app` або типу
> того), створи третю OAuth App для нього. Або одразу робить prod на
> custom domain — тоді одна prod-апка з тим самим callback.

---

## 3. Environment Variables у Vercel

Settings → Environment Variables → додавай по одній. Для кожної постав
галочки **Production** і **Preview** (Development можна без — секрети
туди не пускає; локально все береться з `.env.local`).

| Key | Value | Звідки |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://7373zxc_db_user:...gitquest?...` | Atlas → Connect |
| `JWT_SECRET` | 32+ hex символів, **різний** від dev | згенеруй: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RESEND_API_KEY` | `re_xxxxx` | Resend → API Keys (рекомендую окремий key для prod) |
| `EMAIL_FROM` | `GitQuest <noreply@твійдомен.com>` після verify, або `<onboarding@resend.dev>` як заглушка | Див. секцію 5 |
| `VITE_GITHUB_CLIENT_ID` | Client ID з prod OAuth App | GitHub |
| `GITHUB_CLIENT_ID` | те саме значення | GitHub |
| `GITHUB_CLIENT_SECRET` | Client secret з prod OAuth App | GitHub |

> ⚠️ **`VITE_*` змінні запікаються у JS-bundle при білді.** Якщо ти
> додав/змінив `VITE_GITHUB_CLIENT_ID` після деплою — обов'язково
> перебилди (Deployments → ⋯ → Redeploy → **Use existing Build Cache: NO**).
> Серверні змінні (`GITHUB_CLIENT_SECRET`, `MONGODB_URI` і т.д.)
> підхоплюються рантайм, перебилд для них не потрібен.

---

## 4. Перебилд після env

```
Vercel → Project → Deployments → останній деплой → ⋯ → Redeploy
```

Зніми галочку **«Use existing Build Cache»** щоб VITE_* змінні попали
у новий bundle.

---

## 5. Resend: вийти зі sandbox-режиму

У sandbox Resend дає слати **тільки на пошту з якою зареєстрований у
Resend**. У продакшені треба верифікувати свій домен — інакше реєстрації
будуть мовчазно ламатися для всіх крім тебе.

### Якщо у тебе є домен:

1. <https://resend.com/domains> → **Add domain** → введи свій (`gitquest.app`)
2. Resend дасть DNS-records (TXT для SPF + DKIM, MX для bounce)
3. Зайди в DNS-провайдера домену (Namecheap/Cloudflare/etc.) → додай ці
   записи
4. Дочекайся verified (10-30 хв, інколи до 24 год)
5. У Vercel зміни `EMAIL_FROM` на `GitQuest <noreply@твійдомен.com>`
6. Redeploy

### Якщо домену немає:

- **Купити** (~$10/рік на Namecheap, ще дешевше на Cloudflare Registrar)
- **Або** залишитися на sandbox — реєстрація працюватиме тільки для
  email що збігається з тим, з яким ти зареєстрований у Resend

> Альтернатива на старті: додати у admin-скрипт `npm run code <email>`
> можливість видавати коди через консоль (вже є!) — тестові юзери
> отримують код від тебе вручну.

---

## 6. Перевірка прод-білду

1. Відкрий `https://gitquest-xxxxx.vercel.app/api/health`
   - Має повернути `{"ok":true,"db":{...readyState:1...}}`
   - Якщо ні — глянь Logs у Vercel (Deployments → конкретний build → Functions)
2. Відкрий `/register` → зареєструйся → введи код → потрап на dashboard
3. Натисни **Прив'язати GitHub** → авторизуйся → перевір що пілка з
   ніком з'явилася у navbar

---

## 7. Custom domain (опційно)

1. Купи домен (Namecheap/Cloudflare/etc.)
2. Vercel → Project → Settings → Domains → **Add** → введи `gitquest.app`
3. Vercel покаже які DNS-записи додати:
   - `A` на `76.76.21.21`
   - `CNAME` на `cname.vercel-dns.com` (для `www`)
4. Зачекай DNS propagation (5 хв – 1 год)
5. Vercel автоматично згенерує SSL (Let's Encrypt)
6. **Онови GitHub OAuth App** prod-апки:
   - Homepage URL → `https://gitquest.app`
   - Authorization callback → `https://gitquest.app/auth/callback`
7. **Онови Resend** (якщо домен інший — пройди verify знову)

---

## 8. Поширені проблеми

### `redirect_uri mismatch`
GitHub callback URL в OAuth App не співпадає з тим що шле клієнт. Перевір:
- Чи URL у Settings → Developer settings → OAuth Apps співпадає
  **точно** (з/без trailing `/`, http vs https, з/без `www`)
- Чи `VITE_GITHUB_CLIENT_ID` у Vercel = Client ID prod-апки (не dev!)

### `MONGODB_URI is not configured`
Не додав змінну у Vercel або забув галочку Production. Settings →
Environment Variables → перевір.

### `MongoServerSelectionError`
Atlas IP allowlist не пускає. Зайди Atlas → Network Access → переконайся
що `0.0.0.0/0` додано (Vercel functions мають динамічні IP).

### Health endpoint повертає 503 з 30+ секундним таймаутом
Cold start на Vercel free tier — перший запит після простою може йти
~5-10 сек. Якщо більше — глянь Logs, найімовірніше БД недоступна.

### Email не приходить
1. Якщо адреса не та, з якою ти на Resend — sandbox блокує
2. Перевір `RESEND_API_KEY` у Vercel — і що ключ не revoked
3. Глянь Resend dashboard → Logs — там видно delivery status

### `gq_session` cookie не виставляється
SameSite + Secure: у production cookie має бути `Secure` (HTTPS only).
У dev `Secure: false`. Перевір що NODE_ENV=production на Vercel
(встановлюється автоматично).

---

## TL;DR

```
1. Vercel: Import repo (Root: codewaifu/) → Deploy
2. GitHub: New OAuth App для prod URL → копіюй Client ID + Secret
3. Vercel: додай 7 env-змінних → Redeploy без cache
4. Resend: verify domain (опційно)
5. Тест: /register → /verify-email → /dashboard → Прив'язати GitHub
```
