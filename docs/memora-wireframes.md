# Memora - Wireframe & User Flow Documentation

Version 1.1 - Chat-First Study Workspace - May 2026

## Table of Contents

- [Overview](#overview)
- [Global Layout](#global-layout)
- [User Flows](#user-flows)
  - [UC-01 - Onboarding](#uc-01---onboarding)
  - [UC-02 - Start or Continue Study Thread](#uc-02---start-or-continue-study-thread)
  - [UC-03 - Review Extracted Knowledge in Thread](#uc-03---review-extracted-knowledge-in-thread)
  - [UC-04 - Start Review Session](#uc-04---start-review-session)
  - [UC-05 - Study Flashcards](#uc-05---study-flashcards)
  - [UC-06 - View Dashboard & Progress](#uc-06---view-dashboard--progress)
  - [UC-07 - Manage Settings](#uc-07---manage-settings)
- [Page Wireframes](#page-wireframes)
  - [P-01 - Landing / Login](#p-01---landing--login)
  - [P-02 - Onboarding](#p-02---onboarding)
  - [P-03 - Dashboard Chat Shell](#p-03---dashboard-chat-shell)
  - [P-04 - Study Thread History](#p-04---study-thread-history)
  - [P-05 - Study Thread Workspace](#p-05---study-thread-workspace)
  - [P-06 - Upload Inside Thread](#p-06---upload-inside-thread)
  - [P-07 - Review Session](#p-07---review-session)
  - [P-08 - Session Summary](#p-08---session-summary)
  - [P-09 - Flashcards](#p-09---flashcards)
  - [P-10 - Settings](#p-10---settings)
- [Component Library](#component-library)
- [Navigation Map](#navigation-map)
- [Edge Cases & Empty States](#edge-cases--empty-states)

## Overview

Memora is an AI study workspace where users upload personal learning material, let AI extract vocabulary and grammar, then continue studying inside a long-running study thread. The product should feel familiar to users of AI chat tools: start a new study, upload material, chat with the AI, return to prior study threads, and launch review or flashcards from the same workspace.

Primary product loop:

```text
Open dashboard -> Start or open study thread -> Upload material
-> AI extracts knowledge -> Chat / inspect extracted knowledge
-> Start timed review -> Study due flashcards -> Track progress
```

The dashboard is not analytics-first. It is the authenticated home and main AI study shell. Progress widgets are visible but secondary to new upload, thread continuation, and ready-to-review actions.

## Global Layout

Every authenticated page uses the same chat-shell frame.

```text
┌────────────────────────────────────────────────────────────────────┐
│ Sidebar                 │ Main workspace                  │ Panel  │
│                         │                                 │        │
│ [New Study]             │ Route-specific content           │ Stats  │
│                         │                                 │ Memory │
│ Search study history    │                                 │ Due    │
│                         │                                 │        │
│ Today                   │                                 │        │
│  - Kapitel 3            │                                 │        │
│  - A1 verbs             │                                 │        │
│                         │                                 │        │
│ Previous                │                                 │        │
│  - Netzwerk notes       │                                 │        │
│                         │                                 │        │
│ Flashcards (12 due)     │                                 │        │
│ Settings                │                                 │        │
│ User pill               │                                 │        │
└────────────────────────────────────────────────────────────────────┘
```

### Sidebar States

| Element | Default State | Active / Alert State |
| --- | --- | --- |
| New Study | Primary button at top | Disabled only while creating a thread |
| Thread row | Title, last activity, status dot | Highlighted when active |
| Processing thread | Spinner/status pill | "Extracting..." |
| Ready thread | Subtle blue dot | "Ready to review" |
| Flashcards | Due count hidden when 0 | Badge when due cards exist |
| User pill | Avatar initials + name | Opens account menu |

### Main Workspace States

| State | Route | Primary Content |
| --- | --- | --- |
| New user | `/dashboard` | New Study Composer with upload dropzone |
| New thread | `/threads/new` | Composer with upload, optional first message, privacy notice |
| Active thread | `/threads/[threadId]` | Chat transcript, extraction status, review CTA, composer |
| Review | `/review/[sessionId]` | Full-screen timed review |
| Flashcards | `/flashcards` | Due cards across threads |

### Right Panel

The right panel is optional on small screens and collapses behind a panel button.

| Panel Block | Purpose |
| --- | --- |
| Thread Memory Summary | Shows compact context from `thread_memories.summary` |
| Ready to Review CTA | Appears when the thread has enough `knowledge_items` |
| Progress Snapshot | Accuracy, sessions completed, recent score |
| Due Flashcards | Due count scoped to active thread, plus all-thread total |
| Recent Uploads | Latest `thread_uploads` with status |

## User Flows

### UC-01 - Onboarding

**Trigger:** First successful Google OAuth login.

```text
[P-01 Landing] -> Google OAuth -> [P-02 Onboarding]
-> native language selected -> default session duration selected
-> [P-03 Dashboard Chat Shell]
```

**User sees:**

- Short setup form: native language, target learning intent, default review duration.
- After save, user lands directly on the new study composer.

**Data written:**

- `users.native_language`
- `users.preferred_session_duration_min`

### UC-02 - Start or Continue Study Thread

**Trigger:** User wants to add learning material or continue prior study context.

```text
[P-03 Dashboard]
  -> click [New Study] or open recent thread
  -> [P-05 Study Thread Workspace]
  -> upload PDF/images or type a message
  -> extraction status appears in transcript
```

**New thread path:**

```text
[P-03 Dashboard]
  -> [P-06 Upload Inside Thread]
  -> create study_threads row
  -> create thread_uploads row
  -> create upload_jobs row
  -> stream assistant acknowledgement
```

**Continue path:**

```text
[P-04 Study Thread History]
  -> select thread
  -> load recent thread_messages
  -> load thread_memories.summary
  -> show thread workspace
```

### UC-03 - Review Extracted Knowledge in Thread

**Trigger:** Upload extraction completes.

```text
upload_jobs.status = done
-> knowledge_items created
-> thread_memories.summary refreshed
-> thread status becomes ready
-> assistant posts extraction summary
-> user can inspect extracted knowledge or start review
```

**User actions:**

- Open extracted vocabulary, grammar patterns, exercise types, and topic context.
- Edit or delete misclassified knowledge items.
- Ask the AI follow-up questions about the material.
- Start review once enough knowledge items exist.

### UC-04 - Start Review Session

**Trigger:** User clicks Ready to Review from active thread or dashboard.

```text
[P-05 Study Thread Workspace] or [P-03 Dashboard]
  -> click [Start Review]
  -> create review_sessions row
  -> generate first question batch from thread context
  -> [P-07 Review Session]
```

**Review context assembly:**

- Thread settings from `study_threads.settings`.
- Compact memory from `thread_memories.summary`.
- Relevant vocabulary and grammar from `knowledge_items`.
- Wrong-answer history from `session_questions`.
- No-repeat list scoped to the current `review_sessions.id`.

### UC-05 - Study Flashcards

**Trigger:** User has due cards across one or more study threads.

```text
[Sidebar Flashcards badge] or [Right Panel Due Cards]
  -> [P-09 Flashcards]
  -> choose all due cards or active thread only
  -> review card
  -> rate Again / Hard / Good / Easy
  -> SM-2 state updates
```

**Data written:**

- `flashcards.ef`
- `flashcards.interval_days`
- `flashcards.repetitions`
- `flashcards.due_date`
- `flashcard_reviews`

### UC-06 - View Dashboard & Progress

**Trigger:** User opens `/dashboard`.

Dashboard is the chat shell home. Progress appears as supporting context, not the primary screen.

```text
[P-03 Dashboard]
  -> show New Study Composer if no active thread selected
  -> show recent study threads
  -> show active processing jobs
  -> show due flashcards and recent sessions
```

### UC-07 - Manage Settings

**Trigger:** User opens Settings from sidebar or thread menu.

```text
[Sidebar Settings]
  -> [P-10 Settings]
  -> global defaults
  -> thread defaults
  -> privacy and deletion explanation
```

Settings affect future threads by default. Existing thread settings are edited from the thread workspace.

## Page Wireframes

### P-01 - Landing / Login

**Route:** `/` (unauthenticated)

```text
┌─────────────────────────────────────────────────────┐
│ Memora                                      Sign in │
├─────────────────────────────────────────────────────┤
│ Learn from your own material.                       │
│ Upload textbook pages, build a study thread,        │
│ and review with AI-generated practice.              │
│                                                     │
│ [Continue with Google]                              │
│                                                     │
│ Privacy note: uploaded files are temporary.         │
└─────────────────────────────────────────────────────┘
```

### P-02 - Onboarding

**Route:** `/onboarding`

```text
┌────────────────────────────────────────────┐
│ Set up your study workspace                │
├────────────────────────────────────────────┤
│ Native language                            │
│ [ Indonesian v ]                           │
│                                            │
│ Default review length                      │
│ [ 30 minutes v ]                           │
│                                            │
│ What are you studying first? optional      │
│ [ German A1 textbook material           ]  │
│                                            │
│ [Start studying]                           │
└────────────────────────────────────────────┘
```

### P-03 - Dashboard Chat Shell

**Route:** `/dashboard`

**New user / no thread selected:**

```text
┌────────────────────┬──────────────────────────────────────┬─────────────┐
│ [New Study]        │ What do you want to study?            │ Progress    │
│ Search history     │                                      │ No sessions │
│                    │ ┌──────────────────────────────────┐ │ yet         │
│ No study threads   │ │ Drop PDF/images here              │ │             │
│ yet                │ │ or click to upload                │ │ Flashcards  │
│                    │ └──────────────────────────────────┘ │ 0 due       │
│ Flashcards         │                                      │             │
│ Settings           │ Optional message                     │             │
│                    │ [I want to study Kapitel 3...]       │             │
│                    │                                      │             │
│                    │ Files are processed temporarily.     │             │
│                    │ Only learning data is saved.         │             │
│                    │                                      │             │
│                    │ [Start study thread]                 │             │
└────────────────────┴──────────────────────────────────────┴─────────────┘
```

**Returning user:**

```text
┌────────────────────┬──────────────────────────────────────┬─────────────┐
│ [New Study]        │ Continue studying                     │ Today       │
│ Search history     │                                      │ 12 cards    │
│                    │ Ready to review                       │ due         │
│ Today              │ [Kapitel 3 - Berufe] [Start Review]  │             │
│ - Kapitel 3        │                                      │ Accuracy    │
│ - Modal verbs      │ Processing                            │ 78%         │
│                    │ [A1 verbs] Extracting page 4 of 8     │             │
│ Previous           │                                      │ Recent      │
│ - Network notes    │ Recent study threads                  │ session     │
│                    │ [Thread row] [Thread row] [Thread row]│ 18/20       │
└────────────────────┴──────────────────────────────────────┴─────────────┘
```

### P-04 - Study Thread History

**Route:** `/dashboard` sidebar, expanded search state

```text
┌────────────────────────────┐
│ [New Study]                │
│ [Search study history...]  │
├────────────────────────────┤
│ Today                      │
│ ● Kapitel 3 - Berufe       │
│   Ready to review          │
│                            │
│ ◐ A1 verbs                 │
│   Extracting...            │
│                            │
│ Previous 7 days            │
│ ○ Netzwerk notes           │
│   42 items                 │
│                            │
│ Archived                   │
│ ○ Old worksheet            │
└────────────────────────────┘
```

Thread row metadata:

- Title from `study_threads.title`.
- Status from `study_threads.status`.
- Last activity from `study_threads.last_activity_at`.
- Counts from `knowledge_items`, `thread_uploads`, and due `flashcards`.

### P-05 - Study Thread Workspace

**Route:** `/threads/[threadId]`

```text
┌────────────────────┬──────────────────────────────────────┬─────────────┐
│ Thread history     │ Kapitel 3 - Berufe                   │ Thread mem  │
│                    │ German A1 · 38 items · Ready         │ summary     │
│ Active thread      ├──────────────────────────────────────┤             │
│ - Kapitel 3        │ Assistant                            │ Weak areas  │
│                    │ I extracted 24 vocabulary terms,     │ Articles    │
│                    │ 4 grammar patterns, and 3 exercises. │ Accusative  │
│                    │                                      │             │
│                    │ [View extracted knowledge]           │ Actions     │
│                    │ [Start Review] [Study Flashcards]    │ [Review]    │
│                    │                                      │ [Cards]     │
│                    │ User                                 │             │
│                    │ Explain the accusative examples.     │ Uploads     │
│                    │                                      │ pg33.jpg    │
│                    │ Assistant response streams here.      │ done        │
│                    │                                      │             │
│                    │ [Attach files] [Ask or study...]     │             │
└────────────────────┴──────────────────────────────────────┴─────────────┘
```

Thread workspace tabs:

| Tab | Purpose |
| --- | --- |
| Chat | Default transcript and composer |
| Knowledge | Extracted vocabulary, grammar, exercises, topics |
| Reviews | Review history and missed items |
| Settings | Thread-specific question types and difficulty |

### P-06 - Upload Inside Thread

**Route:** `/threads/new` or `/threads/[threadId]`

**Composer upload state:**

```text
┌──────────────────────────────────────────────┐
│ Add learning material                         │
├──────────────────────────────────────────────┤
│ Drop PDF/images here                          │
│ Supported: JPG, PNG, WEBP, PDF. Max 10 MB.    │
│                                              │
│ [Select files]                                │
│                                              │
│ Privacy: files are processed temporarily and  │
│ deleted after extraction. Only learning data  │
│ is saved.                                    │
└──────────────────────────────────────────────┘
```

**Processing state in transcript:**

```text
Assistant
Processing 3 uploads...

[1] kapitel3-page33.jpg     Done      14 items
[2] kapitel3-page34.jpg     Processing
[3] kapitel3-page35.jpg     Queued
```

**Complete state:**

```text
Assistant
Extraction complete.

24 vocabulary items
4 grammar patterns
3 exercise formats
1 topic context

[View extracted knowledge] [Start Review]
```

### P-07 - Review Session

**Route:** `/review/[sessionId]`

```text
┌──────────────────────────────────────────────────────────┐
│ Kapitel 3 - Berufe                            28:41 left │
├──────────────────────────────────────────────────────────┤
│ Question 7 of 20                                         │
│ Type: Fill in the blank                                  │
│                                                          │
│ Ich suche ___ Arbeit.                                    │
│                                                          │
│ [einen] [eine] [ein] [die]                               │
│                                                          │
│ [Submit]                                                 │
└──────────────────────────────────────────────────────────┘
```

**Feedback state:**

```text
┌──────────────────────────────────────────────────────────┐
│ Correct                                                  │
│ "Arbeit" is feminine, so the correct article is "eine".  │
│                                                          │
│ [+ Add to flashcards]                         [Next]     │
└──────────────────────────────────────────────────────────┘
```

Question type UI variants:

| Type | Input Method |
| --- | --- |
| Multiple Choice | Four option cards |
| Fill in Blank | Sentence with blank and four options |
| Translation L1 to target | Text input |
| Translation target to L1 | Text input |
| Sentence Construction | Draggable word chips |

### P-08 - Session Summary

**Route:** `/review/[sessionId]/summary`

```text
┌──────────────────────────────────────────────┐
│ Review complete                              │
├──────────────────────────────────────────────┤
│ Score: 245                                   │
│ Accuracy: 82%                                │
│ Time: 30 min                                 │
│                                              │
│ Missed items                                 │
│ - einen Arzt                                 │
│ - die Arbeit                                 │
│ - im Buero                                   │
│                                              │
│ [Review missed items] [Study flashcards]     │
│ [Back to thread]                             │
└──────────────────────────────────────────────┘
```

### P-09 - Flashcards

**Route:** `/flashcards`

```text
┌────────────────────┬──────────────────────────────────────┐
│ Due today          │ Flashcard                            │
│ All threads: 12    │                                      │
│ Active thread: 5   │ die Arbeit                           │
│                    │                                      │
│ Filter             │ [Flip]                               │
│ [All due]          │                                      │
│ [Active thread]    │                                      │
│ [Choose thread]    │                                      │
└────────────────────┴──────────────────────────────────────┘
```

**After flip:**

```text
┌──────────────────────────────────────────────┐
│ die Arbeit                                   │
│ Translation: pekerjaan                       │
│ Example: Ich suche Arbeit.                   │
│                                              │
│ [Again] [Hard] [Good] [Easy]                 │
└──────────────────────────────────────────────┘
```

### P-10 - Settings

**Route:** `/settings`

```text
┌──────────────────────────────────────────────┐
│ Settings                                     │
├──────────────────────────────────────────────┤
│ Global defaults                              │
│ Native language: [Indonesian v]              │
│ Default review duration: [30 min v]          │
│ Daily reminders: [toggle]                    │
│                                              │
│ New thread defaults                          │
│ Difficulty: [Relaxed v]                      │
│ Auto-update memory summary: [toggle on]      │
│ Question types:                              │
│ [x] Multiple choice                          │
│ [x] Fill in blank                            │
│ [x] Translation L1 to target                 │
│ [x] Translation target to L1                 │
│ [ ] Sentence construction                    │
│                                              │
│ Privacy                                      │
│ Uploaded files are temporary and deleted     │
│ after extraction or cleanup TTL.             │
└──────────────────────────────────────────────┘
```

## Component Library

### New Study Composer

| Element | Behavior |
| --- | --- |
| Upload dropzone | Accepts PDF/images, shows validation errors inline |
| Optional message input | Lets user describe what they want to study |
| Privacy notice | Always visible before first upload |
| Start button | Creates `study_threads`, then `thread_uploads` and `upload_jobs` if files exist |

### Study Thread Row/Card

| Field | Source |
| --- | --- |
| Title | `study_threads.title` |
| Status dot | `study_threads.status` |
| Last activity | `study_threads.last_activity_at` |
| Item count | Count of `knowledge_items` |
| Due cards | Count of due `flashcards` scoped to thread |

### Thread Memory Summary

Displays compact context from `thread_memories.summary`.

States:

- Empty: "Memory starts after your first upload or conversation."
- Updating: "Updating study memory..."
- Ready: summary text plus key terms.
- Error: "Memory update failed. Retry."

### Extraction Status

Displays state from `thread_uploads` and `upload_jobs`.

| State | UI |
| --- | --- |
| Queued | Neutral row with queued label |
| Processing | Spinner and current step |
| Done | Item counts and ready actions |
| Failed | Error message with retry action |

### Ready to Review CTA

Appears when the active thread has enough usable `knowledge_items`.

Rules:

- Show disabled state if fewer than 5 knowledge items exist.
- Show primary CTA if 5 or more items exist.
- Include due flashcards CTA if due cards exist.

### Stat Card

Compact metric block for secondary dashboard and right-panel stats.

```text
┌────────────────────┐
│ Accuracy            │
│ 82%                 │
│ +6% from last review│
└────────────────────┘
```

### Feedback Card

Post-answer review feedback.

| State | Content |
| --- | --- |
| Correct | Success color, explanation, Next |
| Incorrect | Error color, correct answer, explanation, bookmark |
| Timeout | Warning color, correct answer, Next |

### Toast Notification

Used for upload completion, retry, save settings, and errors.

### Confirmation Modal

Used for destructive actions:

- Delete study thread.
- Delete extracted item.
- Clear thread messages.
- Archive thread.

## Navigation Map

```text
/ (landing)
  -> /onboarding
  -> /dashboard

/dashboard
  -> /threads/new
  -> /threads/[threadId]
  -> /flashcards
  -> /settings

/threads/new
  -> creates study_threads row
  -> /threads/[threadId]

/threads/[threadId]
  -> upload inside composer
  -> /review/[sessionId]
  -> /flashcards?threadId=[threadId]
  -> /settings?threadId=[threadId]

/review/[sessionId]
  -> /review/[sessionId]/summary
  -> /threads/[threadId]

/flashcards
  -> /threads/[threadId]
```

## Edge Cases & Empty States

| Page / Area | Scenario | UI Response |
| --- | --- | --- |
| Dashboard | New user | New Study Composer centered in main workspace |
| Dashboard | No study threads | Empty history with "Start your first study" |
| Dashboard | Processing upload | Thread row shows spinner; main area shows extraction progress |
| Thread Workspace | No uploads yet | Composer and upload dropzone remain primary |
| Thread Workspace | Upload extraction failed | Assistant message shows error, retry button, and safe deletion status |
| Thread Workspace | No knowledge items after extraction | "No usable learning items found" with suggestion to upload clearer pages |
| Thread Workspace | Ready to review | Ready to Review CTA appears in transcript and right panel |
| Review Session | Fewer than 5 knowledge items | Disabled start state with explanation |
| Review Session | Generation timeout | Retry question generation, keep session state |
| Flashcards | No due cards | "No cards due today" plus continue thread CTA |
| Flashcards | No cards exist | Explain that cards are created from extracted vocabulary |
| Settings | Save failure | Toast with retry action; form state preserved |
| Any page | API/server error | Toast: "Something went wrong. Please try again." |

## Data Contract References

Wireframes assume these schema terms:

- `study_threads`
- `thread_messages`
- `thread_uploads`
- `thread_memories`
- `knowledge_items`
- `upload_jobs`
- `review_sessions`
- `session_questions`
- `flashcards`
- `flashcard_reviews`
