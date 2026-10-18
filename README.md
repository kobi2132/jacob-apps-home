# jacob-apps-home

העמוד הראשי של [jacob-apps.co.il](https://jacob-apps.co.il): כרטיס לכל אפליקציה, וטופס צור קשר ששולח הודעה לבוט בטלגרם.

## מבנה

| נתיב | מה זה |
| --- | --- |
| `site/` | הדף עצמו (HTML/CSS/JS בלי build) |
| `site/apps.json` | רשימת האפליקציות. זה הקובץ היחיד שצריך לערוך כדי להוסיף או לשנות אפליקציה |
| `contact/server.js` | שרת קטן ב-Node שמקבל את הטופס ושולח לטלגרם |
| `docker-compose.yml` | שני קונטיינרים: `home` (nginx) ו-`home-contact` (Node), ברשת `web` |
| `deploy/Caddyfile.snippet` | הבלוק שצריך להוסיף ל-Caddy |

## הוספת אפליקציה

מוסיפים אובייקט ל-`site/apps.json`:

```json
{
  "name": "שם",
  "subdomain": "myapp",
  "description": "משפט אחד שמסביר מה האפליקציה עושה",
  "category": "כלי עבודה",
  "status": "active",
  "icon": "https://myapp.jacob-apps.co.il/icons/icon-512.png"
}
```

- `status`: `active` (כפתור "פתח"), `display` (מוצגת בלי אפשרות לפתוח), `hidden` (לא מופיעה).
- `badge`: הטקסט שמופיע על אפליקציה שלא פתוחה, למשל "בקרוב" או "פרטי".
- `url`: כתובת מלאה, אם האפליקציה לא יושבת בתת-דומיין (למשל GitHub Pages). אחרת הכתובת נבנית מ-`subdomain`.
- `icon`: כתובת לתמונה. אם אין או שהיא לא נטענת, מוצגת האות הראשונה של השם.

## בוט טלגרם (פעם אחת)

1. בטלגרם, שולחים ל-@BotFather את `/newbot` ומקבלים טוקן.
2. שולחים לבוט החדש הודעה כלשהי.
3. פותחים בדפדפן `https://api.telegram.org/bot<TOKEN>/getUpdates` ומעתיקים את `chat.id`.

## התקנה על השרת (פעם אחת)

```bash
cd /srv/apps
git clone https://github.com/kobi2132/jacob-apps-home.git home
cd home
cp .env.example .env    # למלא TELEGRAM_BOT_TOKEN ו-TELEGRAM_CHAT_ID
docker compose up -d
```

אחר כך:

1. להוסיף את התוכן של `deploy/Caddyfile.snippet` ל-`/srv/proxy/Caddyfile` ולטעון מחדש את Caddy.
2. ב-LiveDNS: רשומת A בשם `@` (ואם רוצים גם `www`) אל 65.109.12.170.
3. עדכון אוטומטי, כמו באקורדי: `* * * * * cd /srv/apps/home && git pull -q` ב-crontab.

שינויים ב-`site/` נכנסים מיד אחרי ה-pull. שינוי ב-`contact/server.js` דורש `docker compose restart contact`.

## בדיקה מקומית

```bash
cd site && python3 -m http.server 8080
```

הטופס לא יעבוד מקומית בלי שרת ה-contact. כדי להריץ גם אותו:
`TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... node contact/server.js`
