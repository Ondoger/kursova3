# GitHub OAuth App — налаштування

Щоб юзер міг прив'язати свій GitHub-акаунт через `Прив'язати GitHub` на
дашборді, треба зареєструвати OAuth-апку на GitHub. Це 2-хвилинна
процедура.

## 1. Створення OAuth App

1. Відкрий <https://github.com/settings/applications/new>
2. Заповни поля:

   | Поле | Що писати |
   |---|---|
   | **Application name** | `GitQuest` (або як хочеш) |
   | **Homepage URL** | `http://localhost:5173` (для dev) або URL продакшену |
   | **Authorization callback URL** | `http://localhost:5173/auth/callback` (для dev) |

3. Натисни **Register application**
4. На сторінці апки:
   - Скопіюй **Client ID** (буде використано і на фронті, і на беку)
   - Натисни **Generate a new client secret** → скопіюй (показується **один** раз)

> 💡 Якщо плануєш деплоїти на Vercel — створи **окрему** OAuth App для
> продакшену. У неї callback буде `https://твій-проект.vercel.app/auth/callback`.
> GitHub дозволяє кілька callback URL у одній апці, але це поганий тон —
> dev і prod мають бути ізольовані.

## 2. Додай у `.env.local`

```
VITE_GITHUB_CLIENT_ID=<Client ID з GitHub>
GITHUB_CLIENT_ID=<той самий Client ID>
GITHUB_CLIENT_SECRET=<Client Secret з GitHub>
```

`VITE_GITHUB_CLIENT_ID` потрапляє в bundle і вимушено публічний — це
норм, OAuth client_id не є секретом. Секрет (`GITHUB_CLIENT_SECRET`) —
**тільки серверна** змінна, ніколи не префіксуй `VITE_`.

## 3. Додай ті самі змінні у Vercel

Settings → Environment Variables → додай:
- `VITE_GITHUB_CLIENT_ID` (Production + Preview)
- `GITHUB_CLIENT_ID` (Production + Preview)
- `GITHUB_CLIENT_SECRET` (Production + Preview)

Перебилди проект після додавання (інакше `VITE_*` не потрапить у bundle).

## 4. Перевірка

1. Перезапусти dev: `npm run dev`
2. Зайди на <http://localhost:5173/dashboard>
3. Має з'явитися банер «Прив'яжи GitHub до акаунту»
4. Натисни **Прив'язати** → попадеш на github.com → дозволиш доступ →
   повернешся на `/auth/callback` → автоматично перейде на dashboard
5. У навбарі справа з'явиться кнопка з твоїм @github-ніком

## Що саме ми просимо у GitHub?

Scope — `read:user`. Це **тільки публічний профіль** (login, avatar,
name, public email). Жодного доступу до твоїх репозиторіїв, приватних
даних чи можливості писати від твого імені.

## Як відкликати?

В сайті: дашборд → банер → **Відв'язати**. Це знімає прив'язку у нашій БД.

Щоб додатково відкликати дозвіл на стороні GitHub:
<https://github.com/settings/applications> → знайди GitQuest →
**Revoke access**.

Обидві дії опціональні: можна відв'язати в нашій БД і не чіпати GitHub
(наступний раз `Прив'язати` пройде без перепитування дозволу).
