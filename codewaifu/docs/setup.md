# GitQuest — Setup

## 1. MongoDB Atlas (free tier, 5 хвилин)

1. Реєструйся на <https://www.mongodb.com/cloud/atlas/register>
2. Create a deployment → **M0 (Free)** → AWS, region ближче до тебе
   (для України підходить `eu-central-1` Frankfurt або `eu-west-1` Ireland)
3. У вікні "Security Quickstart":
   - **Username/Password** — створи окремого DB-юзера, лиши пароль у менеджері
   - **Network Access** — додай `0.0.0.0/0` (Allow Access from Anywhere)
     - так, це необхідно: Vercel functions мають динамічні IP, окремі IP allowlist'и тут не працюють
     - захист — на рівні логіну/паролю, не IP
4. Дочекайся "Cluster is ready" (1–2 хв)
5. Connect → Drivers → копіюй URI вигляду
   `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. Додай у URI назву БД: `.../gitquest?retryWrites=...`
   (інакше Mongoose використає дефолтну `test`)

## 2. Local env

```bash
cp .env.example .env.local
```

Запиши у `.env.local`:

```
MONGODB_URI=mongodb+srv://...gitquest?retryWrites=true&w=majority
JWT_SECRET=<згенерований 32+ chars hex>
```

Згенерувати JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Vercel env

У дашборді Vercel → Project → Settings → Environment Variables додай ті самі:

- `MONGODB_URI` (Production + Preview + Development)
- `JWT_SECRET`

`VITE_*` змінні теж там додавай — вони билдяться в bundle.

## 4. Перевірка підключення

Локально:

```bash
npm run dev
```

Відкрий <http://localhost:5173/api/health> — має бути JSON
з `"ok": true` і `db.readyState: 1`. Якщо помилка — дивись консоль `vite-dev.err.log`.

Продакшен:

```
https://<твій-проект>.vercel.app/api/health
```

## 5. Корисні команди MongoDB

Підключитися з CLI (треба `mongosh`):

```bash
mongosh "$MONGODB_URI"
```

Подивитись колекції:

```js
use gitquest
show collections
db.users.find().limit(5)
```

## 6. Безпека на старті

- ❌ Не комітити `.env.local`. Перевір: `git status` не повинен його показувати.
- ❌ Не використовувати один JWT_SECRET для dev і prod. Згенеруй два різні.
- ❌ Не тримати в БД raw 6-digit codes — ми зберігаємо тільки hash (див. EmailCode model).
