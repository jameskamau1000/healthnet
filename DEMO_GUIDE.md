# HealthNet Demo Guide

This guide helps you run a clean product demo of HealthNet and explain how the system works.

## 1) What HealthNet Is

HealthNet is a member operations platform for network-driven wellness organizations.  
It combines:

- Member onboarding and package management
- Commission logic (referral, binary, and matching bonuses)
- M-Pesa deposits (STK Push) and withdrawals (B2C flow)
- Support ticketing
- In-app notifications and SMS events
- Audit and reconciliation views for admins

## 2) Demo Accounts

Use these accounts for demo:

- Admin:
  - Email: `admin@healthnet.local` (or `HEALTHNET_ADMIN_EMAIL` if you set it)
  - Password: set `HEALTHNET_ADMIN_PASSWORD` in `.env`. On each app start the server applies it to the admin account (one sync per process). Production builds do **not** show default credentials on the login page or `/api/auth/me`.  
  - **Local dev without `HEALTHNET_ADMIN_PASSWORD`:** the first-time seed still uses `ChangeMe123!` and the UI may show that hint only in development.
- Member:
  - Email: `member@healthnet.local`
  - Password: `Member@12345`

If the member account does not exist, register a new one from the public homepage.

## 3) Start The App

From project root:

```bash
npm run dev
```

Open: `http://localhost:3000`

## 4) Demo Flow (Recommended Script)

Use this order for a strong 10-15 minute walkthrough.

### A. Public Website (1-2 min)

1. Open homepage.
2. Explain this is the company-facing front end with branding, value proposition, and onboarding.
3. Show login/register area.

### B. Admin Experience (4-5 min)

1. Log in as admin.
2. Show left menu navigation and role-based dashboard tabs.
3. Open **Members**:
   - Create a sample member (or show existing list).
4. Open **Packages / Comp Settings**:
   - Show package pricing and compensation percentages.
5. Open **Transactions / Audit / Reconciliation**:
   - Explain traceability and operational governance.

### C. Member Experience (4-5 min)

1. Log out and log in as member.
2. Show limited member tabs (role-based access).
3. Open **Deposits**:
   - Submit STK deposit request (if sandbox/live credentials are configured).
4. Open **Withdrawals**:
   - Submit withdrawal request.
5. Open **Support**:
   - Create a support ticket.
6. Open **Notifications**:
   - Show read/unread and action links.

### D. Return to Admin (2-3 min)

1. Review pending withdrawal request in **Admin Withdrawals**.
2. Approve or reject.
3. Show resulting records in:
   - Transactions
   - Notifications
   - SMS logs
   - Audit log

## 5) How The System Works (Architecture)

Current implementation is a modular monolith (single Next.js app) with service-oriented boundaries emerging.

- Frontend:
  - Next.js App Router pages
- API layer:
  - Route handlers in `src/app/api/**`
- Domain/services:
  - Shared business logic in `src/services/**` and `src/lib/**`
- Contracts:
  - Shared Zod schemas/types in `src/contracts/**`
- Data:
  - Prisma ORM + SQLite (`prisma/schema.prisma`)

### Core Domain Responsibilities

- Auth/session: `src/lib/auth.ts`
- Member onboarding/domain rules: `src/services/member-onboarding-service.ts`
- Compensation formulas: `src/lib/compensation.ts`
- M-Pesa integration: `src/lib/mpesa.ts`
- Notifications: `src/lib/notifications.ts`
- SMS delivery/logging: `src/lib/sms.ts`
- Auditing: `src/lib/audit.ts`
- Wallet balance rules: `src/lib/wallet.ts`

## 6) Compensation Logic (Business Rules)

Configured model:

- Referral bonus: **20%**
- Binary bonus: **15%**
- Matching bonus: package-ratio based levels

Package tiers currently include:

- Starter (`$50`)
- Fair (`$250`)
- Good (`$500`)
- Better (`$750`)
- Best (`$1000`)

Ranks/council status are derived from package assignment and admin actions.

## 7) Payments & Messaging Flow

### Deposit (STK Push)

1. Member submits amount + phone.
2. System initiates M-Pesa STK request.
3. Callback updates deposit status.
4. On success: wallet credit + notification + optional SMS.

### Withdrawal (B2C)

1. Member submits withdrawal request.
2. Admin reviews and approves/rejects.
3. On approval: B2C payout initiation and callback processing.
4. Status updates reflected in withdrawals, notifications, SMS logs, and audit.

### Security Notes

- Callback token validation is enabled via `MPESA_CALLBACK_TOKEN`.
- Sensitive values are sourced from `.env`.

## 8) Demo Tips / Talking Points

- "Single operational cockpit for member organizations"
- "Role-based access keeps member and admin experiences clean"
- "Every sensitive operation is traceable through logs and reconciliation"
- "Payments + notifications + support are integrated, not fragmented"

## 9) If Something Fails During Demo

- Re-check `.env` M-Pesa and SMS credentials.
- Confirm app is running on `http://localhost:3000`.
- Use admin audit/reconciliation screens to diagnose state.
- For dry demo, explain payment callbacks with existing historical rows if live rails are unavailable.

---

For handoff: share this file with stakeholders as the live demo script and system overview.
