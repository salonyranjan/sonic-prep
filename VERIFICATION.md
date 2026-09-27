# Verification

## Automated checks

- `npm run check`: lint, TypeScript, and regression tests, including optional resume upload and question context.
- `npm run format:check`: consistent formatting.
- `npm run build`: production compilation without private service credentials.
- `npm ci`: reproducible installation from the project `package-lock.json`.
- GitHub Actions runs these checks on pushes to `main` and pull requests using Node.js 24.

Tests use mocked Firebase, AI providers, and cookies. They cover authentication sessions, interview authorization and generation, feedback and attempt saving, company cover selection, and PDF report structure and long-content handling.

The resume tests check signed-in access, PDF validation, size limits, AI summarization, temporary Firestore storage, and use of that summary in question generation. They do not make a live Gemini or Vapi call.

For this change, 32 regression tests passed. ESLint, TypeScript, formatting, and the Next.js production build passed. A local production server returned HTTP 200 for sign-in and sign-up, redirected protected pages to sign-in, and rejected an unauthenticated resume upload with HTTP 401.

## Browser checks

The current dashboard, interview setup, interview practice, and feedback pages were checked in headless Microsoft Edge at 320, 390, 768, and 1440 px widths using fictional demo data. No horizontal overflow or browser runtime errors were observed. The avatar choice updated the candidate image, and the report endpoint returned a downloadable PDF. Both PDF pages were rendered and visually checked with normal and long sample feedback. Sign-in and sign-up screenshots were captured at desktop and mobile widths in the preceding UI pass.

The production build was then checked without demo data or service credentials. Sign-in and sign-up returned HTTP 200 and had no overflow or browser runtime errors at 320, 390, 768, or 1440 px. Protected pages redirected to sign-in, the report endpoint denied unauthenticated access with HTTP 401, and the unconfigured generation endpoint returned HTTP 503.

## Service setup

Copy `.env.example` to `.env.local` and supply Firebase, Gemini, and Vapi configuration. Enable Email/Password sign-in in Firebase Authentication and add your app's domain to its authorized domains.

Configure the Vapi generation request to send `Authorization: Bearer <VAPI_WEBHOOK_SECRET>`. The value must match the server's private environment variable. Unauthenticated requests are rejected; missing server configuration returns HTTP 503. Do not expose this secret through a `NEXT_PUBLIC_` variable.

## Manual acceptance checks

1. At 320, 375, 768, and 1440 px widths, inspect sign-in, sign-up, dashboard, and interview pages for overflow and keyboard accessibility.
2. Submit empty and malformed fields. Confirm inline errors, first-invalid-field focus, password visibility, and browser autofill.
3. Create an account, verify arrival at the dashboard, reload, sign out, and sign back in.
4. Request a password reset and follow the received email link.
5. Start and end an interview. Test microphone failures, call cleanup when navigating away, and feedback retry after a failed save.
6. Check private feedback access, a zero score, missing feedback redirects, and community interviews.
7. Upload a valid resume PDF, finish voice setup, and confirm at least one saved question refers to its content. Repeat with no file, an invalid file, and an oversized file. Confirm the temporary summary is removed after generation.

Live sign-in, email delivery, voice calls, Firestore data, and Gemini responses still require a configured project. The [documentation screenshots](docs/screenshots/README.md) use sample data and do not verify these integrations.

## Dependency audit

The dependency lockfile has been restored for reproducible CI installs. Run a fresh `npm audit` with network access before release; advisory data can change after this local review.
