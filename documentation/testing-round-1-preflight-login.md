# Round 1: Preflight and Login Test Record

Date: 2026-09-07
Environment: `http://localhost:3000`

## Results

| Test ID | Precondition | Action | Expected | Actual | Evidence | Status |
|---|---|---|---|---|---|---|
| R1-01 | Frontend and backend available | Open `/login` | Login UI renders without blank screen | SHANTEL login page rendered with email, password, and submit controls | Browser screenshot: login baseline | PASS |
| R1-02 | Login page open, fields empty | Submit form | Client validation prevents request and shows validation error | `Enter your work email and password to continue.` shown; URL remained `/login` | Browser alert | PASS |
| R1-03 | Valid admin account available | Submit `admin@shantel.local` with valid password | User enters dashboard and token is stored | Redirected to `/dashboard`; dashboard metrics and transactions rendered; access token stored | Browser UI and storage check | PASS |
| R1-04 | Valid email, invalid password | Submit invalid password | Login rejected without account disclosure | URL remained `/login`; `Invalid email or password` shown; HTTP 401 expected | Browser alert and network event | PASS |
| R1-05 | Unknown email | Submit unknown email and invalid password | Login rejected with same generic message | URL remained `/login`; `Invalid email or password` shown; HTTP 401 expected | Browser alert and network event | PASS |
| R1-06 | Authenticated dashboard | Refresh `/dashboard` | Session remains active | Dashboard rendered after refresh | Browser UI | PASS |
| R1-07 | Authenticated dashboard | Click Log out | Tokens removed and user returns to login | Access, refresh, and user storage entries removed; redirected to `/login` | Browser UI and storage check | PASS |
| R1-08 | Logged-out browser | Navigate directly to `/dashboard` | Protected route redirects to login | Redirected to `/login`; dashboard did not render | Browser URL and UI | PASS |
| R1-09 | Invalid/expired access token | Reload dashboard | Session is cleared and user returns to login | Authentication-specific 403 was handled; storage cleared; redirected to `/login` | Browser UI and storage check | PASS |
| R1-10 | Frontend source updated | Run production build | Build and TypeScript validation pass | `pnpm run build` completed successfully | Terminal build output | PASS |

## Fixes Made During Testing

- Added a client-side access-token check before dashboard data loading in `frontend/app/dashboard/page.tsx`.
- Updated the API response interceptor in `frontend/lib/api-client.ts` to clear session data and redirect for authentication-specific 403 responses, while preserving ordinary permission-denied 403 responses.

## Notes

- HTTP 401/403 events during invalid-login and expired-token tests are expected negative-test responses and were handled by the UI.
- Round 1 is complete. No Round 2 testing was started.
