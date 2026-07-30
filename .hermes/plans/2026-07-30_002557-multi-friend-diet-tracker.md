# Multi-friend Diet Tracker Implementation Plan

> **For Hermes:** Use `subagent-driven-development` to implement this plan task-by-task after the user grants separate build authorization.

**Goal:** Convert the single-user diet tracker into a closed four-profile accountability tracker, where WhatsApp LIDs own diet data and the public dashboard lets the group view and edit every profile with complete audit/undo support.

**Architecture:** Introduce a `profiles` entity and add `profile_id` ownership to all personal records. Keep the existing Turso database and Next.js dashboard, but make every repository/API query profile-aware. Add a WhatsApp onboarding state machine that binds the first self-claimed LID to one of the approved profiles and calculates individual calorie/macro targets from an intake questionnaire. The public frontend opens on a group overview, then filters analytics by profile; browser edits are intentionally open and are protected by immutable audit records plus restore operations.

**Tech Stack:** Turso/libSQL, Next.js 14 App Router, React/TypeScript, existing Python `tracker.py` adapter for WhatsApp actions, Node test runner.

---

## Confirmed product decisions

### Initial roster
- `Matheus`, `Joyce`, `Allan`, and `Musi` are the only claimable profiles in the initial rollout.
- Existing single-user data must be preserved under a separate `Legacy` profile.
- New profiles begin without prior meal/workout history.

### Identity and WhatsApp flow
- A group member claims a profile with text such as `sou Joyce`.
- The first matching LID permanently binds to that profile immediately; no admin approval or invite code.
- Before claim completion, regular food/workout messages must not write data for an unidentified sender.
- After the claim, WhatsApp runs one intake question at a time, collecting: age, sex, height, current weight, usual activity level, goal (loss/maintenance/gain), and desired pace.
- The backend calculates calories and macros automatically. Goals remain editable later.

### Shared public dashboard
- The dashboard is publicly readable and writable: visitors may view and edit any selected profile.
- The initial/default screen is a group accountability overview with four profile cards, not a ranking leaderboard.
- A profile selector at the top switches the active analytics/journal profile.
- Individual daily/weekly analytics, goals, meals, workouts, and history are visible to the entire group.
- Because browser mutations are unauthenticated, audit records can identify the target profile and action but cannot truthfully identify the human editor. Do not fabricate an editor identity.

### Recovery and audit
- Every browser/API edit, delete, restore, and goal/profile change must create an immutable audit event with before/after JSON snapshots.
- Deletes are soft deletes. Records remain recoverable.
- The dashboard shows recent changes and supports one-click restore for an audit event.

## Current codebase facts

- The database is currently single-user: `meals`, `workouts`, `goals`, `favorites`, `activity`, and chat tables have no profile/user foreign key.
- Dashboard data is currently aggregated in `lib/repositories/dashboard.js` without owner filtering.
- The current public dashboard already has editing/deleting UI in `app/_components/analytics-screen.tsx` and `app/_components/edit-item-modal.tsx`.
- Chat persistence currently uses one rolling `chat_threads` record in `lib/chat/store.js`.
- The Python WhatsApp adapter at `~/.hermes/skills/openclaw-imports/diet-tracker/scripts/tracker.py` writes and summarizes without a profile parameter.
- Existing migrations are `001_add_workout_details.sql` and `002_add_chat_ingestion.sql`.

## Data model

### New table: `profiles`
Required fields:
- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `slug TEXT NOT NULL UNIQUE` — `matheus`, `joyce`, `allan`, `musi`, `legacy`
- `display_name TEXT NOT NULL`
- `whatsapp_lid TEXT UNIQUE NULL` — null until the person claims their profile
- `status TEXT NOT NULL` — `pending`, `onboarding`, `active`, `legacy`
- intake fields: `birth_date` or `age`, `sex`, `height_cm`, `weight_kg`, `activity_level`, `goal_type`, `goal_pace`
- `created_at`, `updated_at`

Use a persisted birth date if provided; otherwise persist age only as the initial MVP decision. Do not claim health/medical accuracy beyond a standard estimate.

### Existing records that gain `profile_id`
- `meals`
- `workouts`
- `workout_exercises` indirectly via `workouts`; do not duplicate `profile_id` unless query performance requires it later.
- `goals` (one current goals row per profile; historical rows remain profile-scoped)
- `favorites`
- `activity`
- `chat_threads`
- `chat_messages`
- `chat_attachments` indirectly via `chat_threads`
- `parse_runs` indirectly via `chat_messages`
- `message_record_links` indirectly via `chat_messages`

### New table: `audit_events`
Required fields:
- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `profile_id INTEGER NOT NULL`
- `entity_type TEXT NOT NULL` — `meal`, `workout`, `goals`, `profile`, etc.
- `entity_id TEXT NOT NULL`
- `action TEXT NOT NULL` — `create`, `update`, `delete`, `restore`
- `before_json TEXT NULL`
- `after_json TEXT NULL`
- `source TEXT NOT NULL` — `public_dashboard`, `whatsapp`, `migration`, `system`
- `reverted_audit_event_id INTEGER NULL`
- `created_at TEXT NOT NULL`

The audit log is append-only. Restore creates a new event rather than mutating an older event.

## Implementation tasks

### Task 1: Establish migration and profile ownership tests

**Objective:** Define the expected multi-profile data contract before touching live data.

**Files:**
- Create: `migrations/003_add_profiles_and_audit.sql`
- Create: `tests/repositories/profiles.test.js`
- Create: `tests/repositories/audit.test.js`
- Modify: `migrations/run_migration.py` only if it cannot apply the new migration safely

**Steps:**
1. Write tests that describe the seeded profiles, profile-scoped reads, and soft-delete/restore behavior.
2. Create the additive migration with `profiles`, `audit_events`, nullable `profile_id` columns, indexes, and soft-delete columns such as `deleted_at`/`deleted_by_audit_id` on mutable record tables.
3. Seed exactly five profiles: Matheus, Joyce, Allan, Musi, Legacy.
4. Backfill all existing records to Legacy before changing any read path.
5. Add non-destructive indexes for common profile/date queries, e.g. `(profile_id, logged_at)` on meals and workouts.
6. Run migration against a disposable/copy database first, then the configured Turso database only after verified backup/export.

**Verification:**
```bash
cd /home/clawd/git/diet-tracker-dashboard
npm test
# Execute the migration runner only after a backup query/export is verified.
```

### Task 2: Create profile and audit repositories

**Objective:** Centralize profile lookup, LID binding, audit writes, and restore logic.

**Files:**
- Create: `lib/repositories/profiles.js`
- Create: `lib/repositories/audit.js`
- Modify: `lib/db.js` if a transaction helper needs adjustment
- Test: `tests/repositories/profiles.test.js`, `tests/repositories/audit.test.js`

**Steps:**
1. Add `listProfiles`, `getProfileById`, `getProfileBySlug`, and `getProfileByLid`.
2. Add an atomic `claimProfileByLid({ slug, lid })` that succeeds only when the target profile has no LID and the LID is not bound elsewhere.
3. Add onboarding state read/write helpers.
4. Add `appendAuditEvent` that accepts before/after snapshots and source.
5. Add `restoreFromAuditEvent` using a transaction and an allowlist of restorable entity types.
6. Ensure every restore appends a new audit event.

**Verification:**
```bash
npm test -- tests/repositories/profiles.test.js tests/repositories/audit.test.js
```

### Task 3: Make nutrition and activity repositories profile-scoped

**Objective:** Prevent records from leaking or aggregating across friends.

**Files:**
- Modify: `lib/repositories/dashboard.js`
- Modify: `lib/repositories/meals.js`
- Modify: `lib/repositories/workouts.js`
- Modify: `lib/repositories/goals.js`
- Create or modify: repositories for `favorites` and `activity` when those APIs are exposed
- Test: new repository tests under `tests/repositories/`

**Steps:**
1. Require `profileId` in all list, summary, create, update, delete, and history calls.
2. Filter soft-deleted records from default reads.
3. Scope goals and favorites to the selected profile.
4. Preserve the existing optional-workout-column compatibility behavior in `workouts.js`.
5. Emit audit events for all mutable records.
6. Update `getDashboardData(profileId, targetDate)` to return only the selected profile’s summary, items, workouts, and dense history.

**Verification:**
- A meal under Joyce must not contribute to Matheus’s daily totals.
- A soft-deleted meal must disappear from normal analytics but remain restorable.
- History must be dense per profile, not across the whole group.

### Task 4: Update API contracts for profiles and recovery

**Objective:** Expose profile selection, profile-scoped analytics, and audit restore through explicit endpoints.

**Files:**
- Create: `app/api/profiles/route.ts`
- Create: `app/api/profiles/[id]/route.ts`
- Create: `app/api/audit/route.ts`
- Create: `app/api/audit/[id]/restore/route.ts`
- Modify: `app/api/data/route.ts`
- Modify: `app/api/meals/[id]/route.ts`
- Modify: `app/api/workouts/[id]/route.ts`
- Modify: `app/api/goals/route.ts`
- Test: route/repository tests as appropriate

**Contract:**
- `GET /api/profiles` lists safe public profile metadata and onboarding status.
- `GET /api/data?profileId=<id>&date=YYYY-MM-DD` returns analytics for exactly one profile.
- Mutations require an explicit `profileId` and verify that the entity belongs to it before changing it.
- `GET /api/audit?profileId=<id>` returns recent audit events.
- `POST /api/audit/<id>/restore` restores a supported event and appends a new audit event.

**Verification:**
- Entity ID from profile A cannot be updated via profile B’s request.
- Restore endpoint returns the new state and refreshable profile-specific analytics.
- Existing single-user client requests fail loudly until updated rather than silently writing to the wrong profile.

### Task 5: Partition chat storage and ingestion by profile

**Objective:** Give each person an independent web chat history and make parsed writes target the selected profile.

**Files:**
- Modify: `lib/chat/store.js`
- Modify: `lib/chat/persist.js`
- Modify: `lib/chat/confirm.js`
- Modify: `app/api/chat/thread/route.ts`
- Modify: `app/api/chat/messages/route.ts`
- Modify: `app/api/chat/messages/[id]/confirm/route.ts`
- Test: `tests/chat/store.test.js`, `tests/chat/persist.test.js`, `tests/chat/confirm.test.js`

**Steps:**
1. Replace the single `ensureRollingThread()` assumption with `ensureProfileThread(profileId)`.
2. Add profile ownership to chat messages/attachments through threads.
3. Require `profileId` in web-chat reads and writes.
4. Include the profile ID when creating meals/workouts through chat confirmation.
5. Audit auto-saves, manual confirms, edits, deletes, and restores.

### Task 6: Add WhatsApp LID onboarding and profile-aware tracker actions

**Objective:** Route group messages to the claimed person and complete onboarding before nutrition logging.

**Files:**
- Modify: `/home/clawd/.hermes/skills/openclaw-imports/diet-tracker/scripts/tracker.py`
- Create: a focused profile/onboarding module under the same skill, e.g. `scripts/profile_onboarding.py`
- Modify: the gateway-facing message adapter only where needed to pass `senderId`/LID into the structured payload
- Test: Python unit tests or import-level test harness in the skill directory

**Steps:**
1. Accept an explicit `sender_lid` / `profile_id` in every tracker action and summary query.
2. Detect claim messages only in the closed target group: `sou Matheus`, `sou Joyce`, `sou Allan`, `sou Musi`.
3. Call atomic profile claim logic; report that a previously bound profile cannot be reclaimed.
4. Persist onboarding progress by LID/profile and ask one question at a time.
5. Implement a documented standard calorie/TDEE and macro calculation. Keep the formula in one pure function with tests.
6. Write the calculated goals to the claimed profile.
7. Refuse or guide unclaimed senders instead of writing to Legacy or a default profile.
8. Update every `log_*`, `get_summary`, favorite, workout, and correction path to filter by profile.

**Verification:**
- Two LIDs logging identical meals create records under different profiles.
- A second LID cannot claim Joyce after Joyce is bound.
- Unclaimed sender cannot create a meal.
- Each onboarding response resumes the correct person’s questionnaire.

### Task 7: Build the group overview and profile selector

**Objective:** Make it fast to inspect any friend while preserving profile-specific detail.

**Files:**
- Create: `app/_components/group-overview.tsx`
- Create: `app/_components/profile-selector.tsx`
- Modify: `app/page.tsx`
- Modify: `app/_components/analytics-screen.tsx`
- Modify: `app/_components/types.ts`
- Test: component/presentation tests where practical

**UI behavior:**
- Dashboard opens with four profile cards (Matheus, Joyce, Allan, Musi); Legacy is de-emphasized but accessible for historical reference.
- Each card shows the selected date’s calories/net status, protein progress, and onboarding status when incomplete.
- The persistent top selector controls active profile across Analytics, Chat, and Profile tabs.
- Selecting a card updates the profile-scoped API requests and detail views.
- The current profile is persisted in URL query parameters or local storage; URL query parameters are preferred for shareable group links.

### Task 8: Add public edit audit history and restore UX

**Objective:** Make public browser writes observable and reversible.

**Files:**
- Create: `app/_components/audit-timeline.tsx`
- Modify: `app/_components/analytics-screen.tsx`
- Modify: `app/_components/edit-item-modal.tsx`
- Modify: `app/page.tsx`
- Modify: relevant API client helpers
- Test: `tests/analytics/audit-presentation.test.js` and API/repository tests

**UI behavior:**
- Edit/delete confirmations explicitly say the action is public and will be recorded.
- Deleting a meal/workout uses soft delete.
- Show recent changes for the active profile with action, timestamp, source, target item, and before/after summary.
- Restore action asks for confirmation, invokes the restore endpoint, refreshes profile data, and adds the compensating audit event.
- Do not display a fake “editor” name for anonymous browser writes.

### Task 9: Migration verification and production rollout

**Objective:** Move from single-user data without loss and verify public deployment.

**Files:**
- Create: `docs/multi-profile-rollout.md`
- Update: `README.md` or relevant operational docs

**Steps:**
1. Export/backup current database rows and record row counts per table.
2. Apply migration in a controlled sequence.
3. Confirm all pre-existing rows are attached to Legacy and no unowned active records remain.
4. Create the four roster profiles and test LID claims in a non-production group/test sender path if possible.
5. Run full unit tests and `npm run build`.
6. Deploy to Vercel.
7. Verify public endpoints against each profile and verify dashboard rendering on a mobile viewport.
8. Document a rollback strategy: disable new UI routes, retain backups, and restore database only if the migration verification fails.

## Acceptance criteria

- Matheus, Joyce, Allan, and Musi appear as distinct profiles; Legacy preserves prior data.
- An LID can claim only one unclaimed roster profile, and the first claim wins.
- A claimed user completes WhatsApp onboarding and receives calculated targets.
- Every meal/workout/goal/favorite/summary is isolated to one profile.
- The public dashboard shows group cards by default and switches cleanly between profile detail views.
- Public edits/deletes create audit events, and a supported undo flow restores prior state.
- No public UI/API mutation can alter a record while claiming it belongs to a different profile.
- Existing analytics remains functional for Legacy data after migration.
- `npm test`, `npm run build`, live API checks, and a public Vercel verification all pass before release.

## Risks and deliberate tradeoffs

- Public editing enables accountability but not authentication. Audit/undo reduces damage but cannot prove the human identity of an anonymous browser editor.
- LID-first claim is intentionally simple but means a mistaken first claim requires a database/admin correction process.
- Health target calculations are estimates and must be framed as non-medical guidance.
- Adding `profile_id` across existing tables requires careful migration/backfill and should never be deployed without a backup and row-count verification.
- The WhatsApp skill lives outside the dashboard repository; implementation must commit dashboard code separately and document any skill changes clearly.

## Build authorization status

**Shared understanding:** confirmed by Matheus on 2026-07-30.

**Implementation authorization:** not yet granted. Do not alter the database, tracker logic, dashboard code, or production deployment until Matheus explicitly authorizes the build.
