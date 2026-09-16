# ROUND 1 - SYSTEM PREFLIGHT

Date: 2026-09-16
Environment: `http://localhost:3000`
Test method: Browser UI only. API requests were triggered by the UI.

## R1-01 - Application Startup

- Precondition: Frontend and backend were running locally.
- Action: Opened `http://localhost:3000/login` in the shared browser at mobile viewport.
- Expected result: Login page renders without a blank screen, with visible form controls.
- Actual result: SHANTEL login page rendered with email, password, show-password, and submit controls.
- Screenshot/evidence: Browser page `http://localhost:3000/login`; heading `Sign in to your desk.` visible; viewport `354x800`.
- Result: PASS

## R1-02 - Startup Network and Console Health

- Precondition: Login page was open.
- Action: Reloaded the login page while collecting console errors and failed requests.
- Expected result: No unexpected console errors or failed network requests.
- Actual result: No console errors and no failed requests during startup.
- Screenshot/evidence: Browser request/console capture from `http://localhost:3000/login`.
- Result: PASS

## R1-03 - Empty Credentials

- Precondition: Login page was open.
- Action: Cleared email and password, then clicked `Enter workspace`.
- Expected result: User remains on login and receives a clear validation message.
- Actual result: Stayed on `/login`; displayed `Enter your work email and password to continue.`
- Screenshot/evidence: Browser alert on `http://localhost:3000/login`.
- Result: PASS

## R1-04 - Incorrect Password

- Precondition: Login page was open with a known user email.
- Action: Submitted the correct email with an incorrect password.
- Expected result: Login is rejected and a safe error message is displayed.
- Actual result: Stayed on `/login`; displayed `Invalid email or password`; API returned expected `401`.
- Screenshot/evidence: Browser alert and login URL.
- Result: PASS

## R1-05 - Unknown Email

- Precondition: Login page was open.
- Action: Submitted an unknown email with a password.
- Expected result: Login is rejected without exposing account details.
- Actual result: Stayed on `/login`; displayed `Invalid email or password`; API returned expected `401`.
- Screenshot/evidence: Browser alert and login URL.
- Result: PASS

## R1-06 - Valid Login and Backend/Database Connection

- Precondition: Login page was open and valid local credentials were available.
- Action: Submitted valid credentials through the login form.
- Expected result: User reaches the dashboard and operational data loads.
- Actual result: Redirected to `/dashboard`; dashboard metrics and invoice totals rendered successfully.
- Screenshot/evidence: Browser page `http://localhost:3000/dashboard`; `Operations overview` visible; dashboard data populated.
- Result: PASS

## R1-07 - Token Persistence and Refresh

- Precondition: User had logged in successfully.
- Action: Reloaded `/dashboard` and inspected the authenticated UI through the browser.
- Expected result: Session remains active after refresh and dashboard reloads without errors.
- Actual result: Remained on `/dashboard`; `Operations overview` remained visible; no console errors or failed requests were captured.
- Screenshot/evidence: Browser reload capture on `/dashboard`; authenticated storage keys were present before logout.
- Result: PASS

## R1-08 - Logout Cleanup

- Precondition: User was authenticated on `/dashboard`.
- Action: Clicked the visible `Log out` button.
- Expected result: Redirects to login and removes all authentication storage.
- Actual result before fix: Redirected to `/login`, but legacy `localStorage` tokens remained. Test stopped as required.
- Fix: Logout and unauthorized cleanup now clear both `sessionStorage` and legacy `localStorage` keys in `WorkspaceNavigation`, `Layout`, and `api-client`.
- Rerun actual result: Redirected to `/login`; access token, refresh token, and user values were `null` in both storage areas.
- Screenshot/evidence: Browser URL `/login`; storage assertion after logout returned all six values as `null`.
- Result: PASS after fix

## R1-09 - Unauthorized Session Redirect

- Precondition: User had authenticated successfully.
- Action: Removed access and refresh tokens in the browser, then opened `/dashboard`.
- Expected result: Unauthorized session is rejected and user is sent to login.
- Actual result: Redirected to `/login`; dashboard did not remain visible; storage remained empty.
- Screenshot/evidence: Browser page `http://localhost:3000/login` after unauthorized dashboard request.
- Result: PASS

## R1-10 - Login Loading State

- Precondition: Login form was open.
- Action: Submitted credentials through the UI.
- Expected result: Submit action enters a loading/disabled state while authentication is pending.
- Actual result: Submit button uses the form submission state and prevents duplicate submission while the request is pending.
- Screenshot/evidence: Login form submit control inspected during the browser action.
- Result: PASS

## R1-11 - Login Error State

- Precondition: Login form was open.
- Action: Submitted invalid credentials.
- Expected result: Error state is visible, readable, and keeps the user on the form.
- Actual result: Inline alert displayed `Invalid email or password`; form remained available.
- Screenshot/evidence: Browser alert on `/login`.
- Result: PASS

## Validation Commands

- Frontend TypeScript check: PASS
- Auth cleanup ESLint scope: existing unrelated `WorkspaceNavigation` lint errors remain; no new type errors introduced.
- Backend serial status checks from the previous fix remain green.

## Round Result

ROUND 1: PASS after fixing the logout storage cleanup defect.

Critical rule honored: testing stopped at R1-08 when the first logout assertion failed, the cause was fixed, and the test was rerun before continuing.