# Diet Tracker PWA Conversion Plan

> For Hermes: this plan exists so the work can be resumed mid-stream if the session ends. Current product decisions from the design interview are embedded below.

Goal: Convert the existing diet-tracker-dashboard into a 3-screen PWA with a chat-first input flow, nutrition analytics screen, and profile/settings screen, while keeping the app single-user in v1 and moving AI interpretation to a VPS-hosted normalization service.

Architecture: Keep meals/workouts as the nutrition source of truth, add a new chat ingestion layer for raw user inputs and parse results, and introduce a server-side AI normalization boundary that is parse-only. Refactor the existing single-page dashboard into a mobile-first tabbed PWA shell with Chat, Analytics, and Profile screens.

Tech stack: Next.js 14 App Router, React, TypeScript, Tailwind, Turso/libSQL, VPS-hosted OpenAI-compatible model endpoint (mimo-v2.5), PWA manifest/service worker, optional image upload support.

Resolved decisions:
- v1 stays single-user; no auth/accounts yet.
- Chat ingestion uses AI normalize -> deterministic validation/write flow.
- v1 inputs: text and photo.
- Save both raw chat history and final structured nutrition records.
- AI endpoint is parse-only; DB writes happen in deterministic app code.
- Confidence policy is hybrid: high=auto-save, medium=draft/confirm, low=ask follow-up.
- Analytics screen stays nutrition-only.
- Profile owns goals + parser behavior + PWA/device info.

Open product questions still to resolve:
- Photo parsing timing is now decided: analyze photos only after the user presses send, not on upload.
- Chat supports both meals and workouts in v1.
- Whether drafts/clarifications live in the same thread UI as final saved events.
- Whether offline mode should queue outgoing chat messages or only cache analytics/read views.
- Whether the app should support multiple conversation threads or exactly one rolling thread.
- Attachment retention is now decided: keep original images as durable chat history, and auto-delete them after a retention period such as 6 months.

Files already present in repo:
- `app/page.tsx` — current monolithic dashboard UI
- `app/layout.tsx` — root metadata/layout
- `app/api/data/route.ts` — analytics data endpoint
- `app/api/meals/[id]/route.ts` — meal update/delete endpoint
- `app/api/workouts/[id]/route.ts` — workout detail endpoint (and likely needs PUT/DELETE parity if not complete elsewhere)
- `package.json` — Next.js 14 app with no PWA tooling yet

Recommended rollout strategy:
1. Additive migration only.
2. Keep existing analytics endpoints working during the refactor.
3. Build chat ingestion as new API/tables rather than mutating meals/workouts into chat records.
4. Introduce PWA shell and tabs before replacing the old dashboard internals.
5. Land text flow first, then photo flow.

---

## Phase 1: Define the new data boundaries

### Task 1: Preserve existing nutrition tables as analytics source of truth
Objective: Keep meals/workouts/goals as the canonical nutrition model.

Files:
- Modify: `docs/plans/2026-06-25-pwa-chat-analytics-profile-plan.md`
- Inspect later during implementation: existing Turso schema

Implementation notes:
- Do not overload `meals` or `workouts` to act as chat history.
- Continue using `goals` for calorie/protein/carb/fat targets.
- Analytics screen should still read from aggregated nutrition tables.

Verification:
- Existing `/api/data` contract remains usable after chat system is introduced.

### Task 2: Add chat ingestion tables
Objective: Create a raw input/audit layer separate from nutrition records.

Files:
- Create: `migrations/002_add_chat_ingestion.sql`
- Create later if needed: `references/schema-chat.md`

Recommended schema:
- `chat_threads`
  - `id`
  - `title`
  - `created_at`
  - `updated_at`
- `chat_messages`
  - `id`
  - `thread_id`
  - `role` (`user`, `assistant`, `system`)
  - `message_type` (`text`, `image`, `draft`, `clarification`, `result`)
  - `text`
  - `status` (`received`, `parsed`, `saved`, `needs_confirmation`, `failed`)
  - `confidence`
  - `created_at`
- `message_attachments`
  - `id`
  - `message_id`
  - `kind` (`image`)
  - `storage_url`
  - `mime_type`
  - `width`
  - `height`
  - `created_at`
- `parse_runs`
  - `id`
  - `message_id`
  - `model`
  - `provider`
  - `raw_response_json`
  - `normalized_action`
  - `confidence`
  - `ambiguities_json`
  - `created_at`
- `message_record_links`
  - `id`
  - `message_id`
  - `record_type` (`meal`, `workout`)
  - `record_id`
  - `link_type` (`created`, `updated`, `deleted`)
  - `created_at`

Verification:
- A single user message can be traced to both its AI parse and created nutrition record(s).

### Task 3: Define the normalized action contract
Objective: Freeze the contract between the AI parser and deterministic write layer.

Files:
- Create: `lib/food-ai/contract.ts`
- Create: `docs/contracts/chat-normalization.md`

Recommended contract shape:
```ts
export type NormalizedAction =
  | {
      action: 'log_meal';
      confidence: number;
      description: string;
      amount?: number | null;
      unit?: string | null;
      calories?: number | null;
      protein?: number | null;
      carbs?: number | null;
      fat?: number | null;
      meal_items?: Array<{
        name: string;
        amount?: number | null;
        unit?: string | null;
        calories?: number | null;
        protein?: number | null;
        carbs?: number | null;
        fat?: number | null;
      }>;
      ambiguities?: string[];
    }
  | {
      action: 'log_workout';
      confidence: number;
      modality: string;
      duration_min?: number | null;
      calories?: number | null;
      ambiguities?: string[];
    }
  | {
      action: 'clarify';
      confidence: number;
      question: string;
      ambiguities: string[];
    }
  | {
      action: 'noop';
      confidence: number;
      reason: string;
    };
```

Rules:
- AI may classify and normalize.
- AI may not write to DB.
- Server validates every field.
- Unknown/invalid action => fail closed.

Verification:
- Parser output can be tested without database side effects.

---

## Phase 2: Build the AI ingestion backend

### Task 4: Add env-backed AI provider configuration
Objective: Introduce explicit env vars for the VPS-hosted multimodal model.

Files:
- Create/modify local runtime env: `.env`
- Create later if absent: `.env.example`
- Create: `lib/food-ai/config.ts`

Recommended env vars:
- `FOOD_AI_BASE_URL`
- `FOOD_AI_API_KEY`
- `FOOD_AI_MODEL`
- optionally `FOOD_AI_TIMEOUT_MS`

Verification:
- Config loader fails with a clear error when AI env vars are missing.

### Task 5: Implement parse-only AI client
Objective: Call the OpenAI-compatible endpoint with text and image inputs.

Files:
- Create: `lib/food-ai/client.ts`
- Create: `lib/food-ai/prompts.ts`
- Create: `lib/food-ai/normalize.ts`

Implementation notes:
- Use OpenAI-compatible chat/responses semantics.
- Send text-only requests for text messages.
- Send multimodal payloads when an image attachment exists.
- Keep prompts strict and output JSON-only.
- The prompt should optimize for schema extraction, not conversational polish.

Verification:
- Unit tests with mocked provider responses pass for text and image payloads.

### Task 6: Add deterministic validation and persistence layer
Objective: Convert normalized actions into DB writes safely.

Files:
- Create: `lib/chat-ingestion/validate.ts`
- Create: `lib/chat-ingestion/persist.ts`
- Create: `lib/chat-ingestion/confidence-policy.ts`

Implementation notes:
- Validate required fields by action type.
- Enforce confidence thresholds.
- Medium confidence should create a draft/confirmation path instead of auto-write.
- Low confidence should emit a clarification assistant message instead of mutating nutrition tables.
- Link created/updated records back to `chat_messages`.

Verification:
- Replaying the same parse run should not create uncontrolled duplicates.

### Task 7: Add chat ingestion API routes
Objective: Expose clean server endpoints for chat send, image upload, parse, and message history.

Files:
- Create: `app/api/chat/thread/route.ts`
- Create: `app/api/chat/messages/route.ts`
- Create: `app/api/chat/messages/[id]/confirm/route.ts`
- Create: `app/api/chat/messages/[id]/retry/route.ts`
- Create: `app/api/chat/upload/route.ts`

Recommended API behavior:
- `POST /api/chat/messages`
  - save raw message
  - call parser
  - validate and maybe persist
  - return updated message/result bundle
- `POST /api/chat/upload`
  - store image and return attachment metadata
- `POST /api/chat/messages/[id]/confirm`
  - confirm a draft parse and persist
- `POST /api/chat/messages/[id]/retry`
  - re-run parse for failed/edited inputs

Verification:
- API returns enough data for the client to render the latest thread without a second roundtrip.

---

## Phase 3: Refactor the frontend into a 3-screen mobile app

### Task 8: Introduce an app shell with bottom navigation
Objective: Replace the single-page dashboard structure with a 3-tab mobile shell.

Files:
- Create: `app/(tabs)/layout.tsx` or keep simple in `app/page.tsx` during the first step
- Create: `components/navigation/bottom-tabs.tsx`
- Create: `components/layout/app-shell.tsx`
- Modify: `app/page.tsx`

Recommended tabs:
- Chat
- Analytics
- Profile

Implementation notes:
- Mobile-first layout.
- Safe-area padding for installed PWA feel.
- Keep analytics tab as default initial fallback if chat is not ready, but long-term default should be Chat.

Verification:
- The app has exactly 3 primary screens and no old dashboard-only framing leaks through.

### Task 9: Build the WhatsApp-like chat screen
Objective: Make chat the primary input surface.

Files:
- Create: `components/chat/chat-screen.tsx`
- Create: `components/chat/message-list.tsx`
- Create: `components/chat/message-bubble.tsx`
- Create: `components/chat/chat-composer.tsx`
- Create: `components/chat/image-attachment-preview.tsx`
- Create: `components/chat/draft-action-card.tsx`

Required UX:
- WhatsApp-like message stack
- input composer pinned at bottom
- text send
- image attach and preview
- assistant/result bubbles for saved items, clarifications, and drafts
- quick correction affordance on saved nutrition entries

Important design constraint:
- Chat screen is for inputs, not deep analytics.
- Corrections should feel chat-native but can open lightweight editors.

Verification:
- User can log a meal by typing text.
- User can upload a photo and get a parsed result.
- Medium-confidence parses surface as draft cards, not silent writes.

### Task 10: Extract the current dashboard into the Analytics screen
Objective: Reuse as much existing dashboard value as possible under a tab.

Files:
- Create: `components/analytics/analytics-screen.tsx`
- Create: `components/analytics/summary-cards.tsx`
- Create: `components/analytics/history-charts.tsx`
- Create: `components/analytics/daily-timeline.tsx`
- Refactor from: `app/page.tsx`

Implementation notes:
- Keep nutrition-only focus.
- Continue using `/api/data` initially.
- Preserve edit/delete flows for meals and workouts if they remain useful, but they should live as analytics detail actions, not the main data-entry path.

Verification:
- Existing net calories/macros/history still render correctly in the Analytics tab.

### Task 11: Build the Profile screen
Objective: Surface goals, parser behavior, and PWA/device info.

Files:
- Create: `components/profile/profile-screen.tsx`
- Create: `components/profile/goals-form.tsx`
- Create: `components/profile/parser-settings.tsx`
- Create: `components/profile/pwa-status-card.tsx`
- Create: `app/api/goals/route.ts`
- Create optionally: `app/api/preferences/route.ts`

v1 scope:
- edit calories/protein/carbs/fat goals
- parser behavior preference (conservative vs aggressive, or threshold settings)
- install/offline/version info

Verification:
- Goals can be changed without touching raw SQL or legacy admin paths.

---

## Phase 4: Add PWA capabilities

### Task 12: Add manifest and install metadata
Objective: Make the app installable.

Files:
- Create: `app/manifest.ts`
- Modify: `app/layout.tsx`
- Create assets: `public/icons/*`

Implementation notes:
- Set app name, short name, theme color, display mode, start URL.
- Include Apple/mobile metadata.
- Choose a dark mobile theme that matches the chat UI.

Verification:
- Browser shows install prompt eligibility once other criteria are met.

### Task 13: Add service worker/offline caching
Objective: Support basic offline UX appropriate for a chat + analytics mobile app.

Files:
- Add dependency: `next-pwa` or equivalent manual service worker setup
- Modify: `next.config.js` or create it if absent
- Create: `public/sw.js` if doing manual setup

Recommendation:
- Cache shell + static assets + last analytics fetch + recent chat thread read data.
- Do not attempt full offline AI parsing in v1.
- If offline send is supported later, queue outgoing messages locally but mark them pending.

Verification:
- Installed app opens with cached shell offline.
- Last-view analytics and thread history are readable offline.

---

## Phase 5: Testing and migration safety

### Task 14: Add test coverage around the ingestion contract
Objective: Make AI parsing safe to evolve.

Files:
- Create: `tests/food-ai/normalize.test.ts`
- Create: `tests/chat-ingestion/validate.test.ts`
- Create: `tests/chat-ingestion/persist.test.ts`

High-value test cases:
- simple meal text
- multi-item meal text
- workout text
- ambiguous message needing clarification
- image + caption
- malformed model JSON
- duplicate retry

Verification:
- Parser regressions fail tests before they hit production.

### Task 15: Add migration + smoke test checklist
Objective: Make the refactor resumable and deployable.

Files:
- Create: `docs/runbooks/pwa-rollout.md`
- Create: `docs/runbooks/chat-ingestion-smoke-test.md`

Checklist should cover:
- env vars present
- migration applied
- chat text ingestion works
- photo ingestion works
- analytics unchanged
- profile updates goals
- installability works on mobile

Verification:
- Another session can resume from docs alone.

---

## Suggested implementation order

1. Create `.env` and config loader for AI provider.
2. Add chat ingestion schema migration.
3. Implement parse contract + mocked AI client.
4. Implement deterministic validation/persist layer.
5. Add chat API routes.
6. Refactor current page into 3-screen shell.
7. Build chat text flow.
8. Rehome current dashboard into Analytics.
9. Build Profile.
10. Add photo flow.
11. Add PWA manifest/install metadata.
12. Add offline caching.
13. Add tests and rollout docs.

## Non-goals for v1

- multi-user auth/accounts
- voice input
- AI direct DB writes
- AI-ops-heavy analytics screen
- full offline message parsing
- turning the profile screen into a generic admin panel

## Key risks

- Scope bloat if auth/offline/voice enter v1.
- Image ingestion complexity if storage is not chosen early.
- Duplicates if retries are not idempotent.
- Chat UX confusion if drafts, clarifications, and saved results are not visually distinct.
- PWA install issues if manifest/service worker metadata is added too late.

## Recommendation for immediate next step

Finish the remaining design interview questions before implementation, then start with the schema + parse contract + env-backed AI client, because those decisions constrain the rest of the app most strongly.
