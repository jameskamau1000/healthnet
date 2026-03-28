This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local vs production database (strict)

SQLite files are **never** committed (see `.gitignore`). Application code and migrations **must not** ship database files to the server.

| Environment | `DATABASE_URL` | `HEALTHNET_DATABASE_ROLE` |
|-------------|----------------|---------------------------|
| Laptop / CI | `file:./prisma/local.db` | omit or `local` |
| Production host | `file:./data/live.db` | **`live`** (required) |

- **Local:** copy `.env.example` → `.env`, run `npm run db:migrate:dev` to create/update `prisma/local.db`.
- **Production:** create the data directory once, point `.env` at the live file, and **only** apply schema with migrations (never copy a DB from your laptop):

```bash
mkdir -p /var/www/healthnet/data
# One-time: move existing DB into the live location (adjust if you already use this path)
# mv /var/www/healthnet/dev.db /var/www/healthnet/data/live.db
```

In **`/var/www/healthnet/.env`** set:

```bash
DATABASE_URL="file:./data/live.db"
HEALTHNET_DATABASE_ROLE=live
```

After each code deploy: `cd /var/www/healthnet && npx prisma migrate deploy` (then `npm ci && npm run build` and restart PM2). With `HEALTHNET_DATABASE_ROLE=live`, the app **refuses** to start if `DATABASE_URL` points at `prisma/local.db`, `./dev.db`, or `prisma/dev.db`, so a bad archive or `.env` paste cannot silently swap in a dev database.

**Deploy code without databases:** use `git pull` on the server, or `./scripts/deploy-code.sh user@host:/var/www/healthnet` (tar-based; excludes `*.db`, `.env`, `node_modules`, `.next`).

## OTP + Email Setup (Resend)

The app supports email OTP for registration, login, and withdrawal confirmation.
Set the following environment variables before using OTP flows:

```bash
RESEND_API_KEY=re_xxx
EMAIL_FROM="Ayur Health <no-reply@your-domain.com>"
APP_BASE_URL=https://ayurhealthint.com
OTP_SECRET=change-this-secret
OTP_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
```

- `EMAIL_FROM` must use a sender/domain verified in Resend.
- If `RESEND_API_KEY` is missing, OTP endpoints will fail safely.
- `APP_BASE_URL` is also used for **member referral links** (left/right URLs). Set it to your public site (e.g. `https://ayurhealthint.com`) so links are not built as `localhost` behind a proxy or odd host headers. If unset in **production**, links that would otherwise be `localhost` / `127.0.0.1` fall back to `https://ayurhealthint.com` (override anytime with `APP_BASE_URL`).
- SMS OTP is not enabled yet; current phase uses email OTP only.

### Production: login / register / withdrawal OTP fails

On the server, `/var/www/healthnet/.env` **must** include valid:

- `RESEND_API_KEY` — API key from [Resend](https://resend.com)
- `EMAIL_FROM` — Must be a verified sender, e.g. `Ayur Health <noreply@yourdomain.com>` (domain verified in Resend), or Resend’s test domain while testing

Then restart the app (`pm2 restart healthnet --update-env`) so Node picks up the variables.

### Password reset (email OTP)

- On `/login`, use **Forgot password?** (or open `/login?tab=forgot`).
- Enter your account email → API sends a **PASSWORD_RESET** OTP via Resend (same as login/register).
- Enter the code and a new password (min. 6 characters) → all sessions for that user are cleared; sign in again with the new password.
- Endpoints: `POST /api/auth/forgot-password` `{ "email" }`, `POST /api/auth/reset-password` `{ "challengeId", "otpCode", "newPassword" }`.

After pulling code, run `npx prisma migrate deploy` (or `db push`) so the `OtpPurpose` enum includes `PASSWORD_RESET`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
