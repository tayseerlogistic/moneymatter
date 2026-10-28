# MoneyMatter Firebase / GitHub Pages starter (MVP)

This is a **separate, simplified application** under `firebase-pages/`. It is **not a drop-in Firebase conversion of the original MoneyMatter** and does not import its database.

Currently implemented:
- Firebase email/password signup and login.
- Owner-isolated Cloud Firestore accounts and income/expense transactions.
- Live synchronization, balances calculated from transaction records, delete operations.
- Downloadable JSON backup export (**restore/import is not yet implemented**).
- Vue responsive starter UI and GitHub Pages deployment workflow.

Not implemented: existing MoneyMatter imports, transfers, budgets, investments, reports, attachments, AI, background jobs, CSV, audit trail and backup restore. Do not use for irreplaceable financial data until tested and backed up. This is not an audited financial system.

## Firebase setup

1. Create a **new** Firebase project for this MoneyMatter starter at https://console.firebase.google.com/. Keep it separate from any other application.
2. Register a **Web app** and copy its Firebase configuration.
3. Authentication > Sign-in method: enable **Email/Password**.
4. Authentication > Settings > Authorized domains: add `tayseerlogistic.github.io` (and `localhost` if required for local testing).
5. Firestore Database: create a database, selecting a suitable region. **Do not leave test-mode / open rules in place.**
6. In Firestore > Rules, paste the complete contents of `firebase-pages/firestore.rules` and **Publish**.
7. In GitHub repository Settings > Secrets and variables > Actions, add four repository secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
8. In GitHub repository Settings > Pages > Build and deployment, select **GitHub Actions**.
9. Trigger the workflow **Firebase MoneyMatter GitHub Pages MVP** from Actions, or commit to the feature branch. The expected URL is `https://tayseerlogistic.github.io/moneymatter/` after successful deployment.

The Firebase web configuration is intentionally visible in the compiled frontend; it is **not a secret**. Security is enforced through Firebase Authentication and Firestore security rules. Never put admin credentials or server secrets in frontend environment variables.

## Local development

With Node.js 24 installed:

```bash
cd firebase-pages
cp .env.example .env
# Enter Firebase web app configuration in .env
npm install
npm run dev
```

## Financial data limitations

- Amounts are stored in integer minor units (for example 150 SAR = 15000), avoiding common floating-point storage issues. This MVP assumes 2-decimal currencies; it must be extended before using currencies with other precision.
- Balances are derived from all fetched transactions. This simple model may exceed Firestore reads and browser performance for large histories.
- **No backups are stored by GitHub**; download the JSON export periodically and retain encrypted copies.
- There is no automatic restoration yet; exported records are not importable with the current UI.
- The current rules allow a user to delete their own entries. For stronger accounting controls, prefer immutable journals, reversal entries and audit logs.
- Firebase's free tier has quotas and usage limits; data persistence is not the same as a guaranteed backup.
- The deployment workflow builds this independent MVP, not the original `packages/frontend` app.
- On a public or commercial site, review GitHub Pages terms and Firebase billing/quotas before deployment.

## Next engineering phases

1. Integration testing of permissions and finance operations with Firebase emulators.
2. Safe import/restore with validation, atomic chunked writes and duplicate detection.
3. Transaction categorization, monthly reports and multi-currency safeguards.
4. Transfers as linked, atomic entries and reversal-based accounting.
5. Migrate existing MoneyMatter feature screens, stores and backend logic in small increments.
