# Publishing the website

`npm run build` produces `dist/`: a single self-contained `index.html` (JS+CSS inlined), plus `ad-config.json`, `privacy.html`, `terms.html`, `legal.css`, `ads.txt`, `robots.txt`, `admin/`. Upload the **contents** of `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, Apache/Nginx shared hosting). HTTPS is required for ads and consent.

## Checklist
1. Replace placeholders: `src/game/site-config.ts` (contact e-mail, owner), `public/privacy.html`, `public/terms.html` (`[DATE]`, `[OWNER NAME]`, `[JURISDICTION]`, e-mail). Rebuild.
2. Fill `ads.txt` after network approval.
3. Edit `ad-config.json` (keep ads off until approved).
4. **Protect `/admin/`** (see below). It is `noindex` and disallowed in `robots.txt`, but that is not security.
5. Serve `ad-config.json` with short cache (the game fetches it with `no-cache`).
6. Submit the site in AdSense / Adsterra, wait for approval, then enable placements.

## Protecting the dashboard (real security)
The dashboard is a static page and contains no secrets, but anyone who finds it could download a config file — they still could not change your site (changes only apply when **you** upload the JSON). Still, protect it:

**Apache** — `/admin/.htaccess`:
```apache
AuthType Basic
AuthName "Owner only"
AuthUserFile /absolute/path/.htpasswd
Require valid-user
```
Create the password file with `htpasswd -c .htpasswd youruser`.

**Nginx**: `location /admin/ { auth_basic "Owner only"; auth_basic_user_file /etc/nginx/.htpasswd; }`

**Cloudflare Pages/Netlify/Vercel**: use Cloudflare Access, Netlify password protection, or Vercel deployment protection for the `/admin` path — or simply **delete `admin/` from the deployed site** and run the dashboard locally (`npm run dev` → `/admin/`).

Never store AdSense/Adsterra/AdMob **API secrets, passwords or payment data** in any frontend file. If you later need private settings, store them in a backend with real authentication and expose only public IDs to the client.

## Security headers (recommended)
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`. A strict CSP is awkward with ad scripts; if you add one, allow the specific ad network origins you enable.

## Android
See ANDROID_BUILD.md. Remember that changing `ad-config.json` for Android requires rebuilding the app (the config is bundled).
