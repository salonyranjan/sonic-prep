# Verification

## Automated checks

- `npm run check`: lint, TypeScript, and 14 regression tests.
- `npm run format:check`: consistent formatting.
- `npm run build`: production compilation without private service credentials.
- GitHub Actions runs these checks on pushes to `main` and pull requests using Node.js 24.

Tests use mocked Firebase, AI providers, and cookies. They cover authentication sessions, invalid and expired tokens, interrupted profile setup, webhook authorization, invalid JSON, input limits, missing accounts, successful generation, and provider error handling.

## Browser checks

The production build was checked in headless Microsoft Edge at 320, 390, 768, and 1440 px widths. Both authentication pages passed overflow, empty-field validation, first-invalid-field focus, and password visibility checks. Protected routes redirected to sign-in, the unconfigured generation endpoint returned HTTP 503, and no browser runtime exceptions were observed.

## Service setup

Copy `.env.example` to `.env.local` and supply Firebase, Gemini, and Vapi configuration. Enable Email/Password sign-in in Firebase Authentication and add your app's domain to its authorized domains.

Configure the Vapi generation request to send `Authorization: Bearer <VAPI_WEBHOOK_SECRET>`. The value must match the server's private environment variable. Unauthenticated requests are rejected; missing server configuration returns HTTP 503. Do not expose this secret through a `NEXT_PUBLIC_` variable.

Firestore may request composite indexes for the dashboard's user/date and finalized/user/date queries. Create the indexes using the links reported by your configured Firestore project.

## Manual acceptance checks

1. At 320, 375, 768, and 1440 px widths, inspect sign-in, sign-up, dashboard, and interview pages for overflow and keyboard accessibility.
2. Submit empty and malformed fields. Confirm inline errors, first-invalid-field focus, password visibility, and browser autofill.
3. Create an account, verify arrival at the dashboard, reload, sign out, and sign back in.
4. Request a password reset and follow the received email link.
5. Start and end an interview. Test microphone failures, call cleanup when navigating away, and feedback retry after a failed save.
6. Check private feedback access, a zero score, missing feedback redirects, and community interviews.

Live sign-in, email delivery, voice calls, Firestore indexes, and Gemini responses still require a configured project. The [documentation screenshots](docs/screenshots/README.md) use sample data and do not verify these integrations.

## Dependency audit

Security updates were applied to Next.js and the dependency tree. The latest local audit reports no high or critical advisories and two moderate transitive advisories in the optional Cloud Storage dependency (`gaxios` / `uuid`) included by Firebase Admin. This app does not import the Storage SDK. Review `npm audit` as upstream fixes become available; no incompatible overrides were added to hide advisories.
