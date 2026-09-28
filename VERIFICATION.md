# Verification

## Automated checks

- `npm run check`: lint, TypeScript, and regression tests, including optional resume upload and question context.
- `npm run format:check`: consistent formatting.
- `npm run build`: production compilation without private service credentials.
- `npm ci`: reproducible installation from the project `package-lock.json`.
- GitHub Actions runs these checks on pushes to `main` and pull requests using Node.js 24.

Tests use mocked Firebase, AI providers, and cookies. They cover authentication sessions, interview authorization and generation, feedback and attempt saving, company cover selection, and PDF report structure and long-content handling.

The resume tests check signed-in access, PDF validation, size limits, detailed extraction, temporary Firestore storage, and use of that content in question generation. They do not make a live Gemini or Vapi call.

For the initial resume feature, 32 regression tests passed. ESLint, TypeScript, formatting, and the Next.js production build passed. A local production server returned HTTP 200 for sign-in and sign-up, redirected protected pages to sign-in, and rejected an unauthenticated resume upload with HTTP 401.

The resume-reading repair adds checks for PDFs with no browser MIME type, detailed extraction without the former 3,500-character summary limit, and a first question grounded in a resume detail. The updated suite has 33 tests.

The voice-workflow repair acknowledges resume-backed generation before starting the slower Gemini and Firestore work. The tests verify that no interview is written before the scheduled work runs and that the ordinary no-resume flow remains synchronous. The client waits for the saved interview after a resume-backed voice call ends or reports a connection event.

The subsequent creation repair removes the voice setup dependency from the interview creation page. The authenticated create endpoint checks role details and the current setup intent, saves the interview before returning its ID, and returns the same ID on a retry. If Gemini question generation fails, it saves role-based fallback questions, including a resume-grounded first question when a resume was uploaded. Voice practice and feedback remain on the saved interview page.

For this repair, 37 regression tests, ESLint, TypeScript, formatting, and the production build passed. A local production server returned HTTP 200 for sign-in, redirected unauthenticated interview setup to sign-in, and rejected unauthenticated interview creation with HTTP 401. Live Firebase, Gemini, and Vapi calls still require configured credentials for end-to-end verification.

## Browser checks

The current dashboard, interview setup, interview practice, and feedback pages were checked in headless Microsoft Edge at 320, 390, 768, and 1440 px widths using fictional demo data. No horizontal overflow or browser runtime errors were observed. The avatar choice updated the candidate image, and the report endpoint returned a downloadable PDF. Both PDF pages were rendered and visually checked with normal and long sample feedback. Sign-in and sign-up screenshots were captured at desktop and mobile widths in the preceding UI pass.

The production build was then checked without demo data or service credentials. Sign-in and sign-up returned HTTP 200 and had no overflow or browser runtime errors at 320, 390, 768, or 1440 px. Protected pages redirected to sign-in, the report endpoint denied unauthenticated access with HTTP 401, and the unconfigured generation endpoint returned HTTP 503.

## Service setup

Copy `.env.example` to `.env.local` and supply Firebase, Gemini, and Vapi configuration. Enable Email/Password sign-in in Firebase Authentication and add your app's domain to its authorized domains.

The current creation page saves interviews directly and does not require a Vapi generation workflow. If the legacy generation webhook remains in use elsewhere, configure it to send `Authorization: Bearer <VAPI_WEBHOOK_SECRET>`. The value must match the server's private environment variable. Unauthenticated requests are rejected; missing server configuration returns HTTP 503. Do not expose this secret through a `NEXT_PUBLIC_` variable.

## Manual acceptance checks

1. At 320, 375, 768, and 1440 px widths, inspect sign-in, sign-up, dashboard, and interview pages for overflow and keyboard accessibility.
2. Submit empty and malformed fields. Confirm inline errors, first-invalid-field focus, password visibility, and browser autofill.
3. Create an account, verify arrival at the dashboard, reload, sign out, and sign back in.
4. Request a password reset and follow the received email link.
5. Start and end an interview. Test microphone failures, call cleanup when navigating away, and feedback retry after a failed save.
6. Check private feedback access, a zero score, missing feedback redirects, and community interviews.
7. Upload a valid resume PDF, submit the setup form, and confirm at least one saved question refers to its content. Repeat with no file, an invalid file, and an oversized file. Confirm the temporary summary is removed after generation.

Live sign-in, email delivery, voice calls, Firestore data, and Gemini responses still require a configured project. The [documentation screenshots](docs/screenshots/README.md) use sample data and do not verify these integrations.

## Dependency audit

The dependency lockfile has been restored for reproducible CI installs. Run a fresh `npm audit` with network access before release; advisory data can change after this local review.

## Final regression audit - September 28, 2026

All 41 automated tests pass. The suite covers authentication, interview creation, resume extraction, feedback persistence, interview history, access controls, and PDF reports with mocked service responses. New regressions exercise lost-save-response retries, expired setup recovery, concurrent setup preservation, and truncated resume rejection. Resume extraction is reused on retries within the same setup. Feedback generation has a 25-second provider timeout so the fallback report can save within the practice page's 60-second budget. Long voice transcripts are capped at the latest 300 messages when submitted to match server validation.

Local verification: automated tests, ESLint, TypeScript, Prettier, and the production build. Live Firebase, Gemini, Vapi voice calls, and account-specific PDF downloads require configured credentials and were not exercised in this audit.
