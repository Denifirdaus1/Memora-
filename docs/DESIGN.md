# Memora - Design System v1.1

Chat-first AI study workspace - May 2026

## 1. Product Feel

Memora should feel like a focused AI study desk: calm, intelligent, clear, and lightweight. The interface borrows the familiarity of modern chat tools, but it must not feel like a generic chatbot. It is a learning workspace where upload, extraction, review, flashcards, and progress all live around one core object: the study thread.

The design should communicate:

- **Trust**: uploaded files are temporary, learning data is structured and private.
- **Momentum**: the first screen makes it obvious how to start studying.
- **Clarity**: AI extraction status, review readiness, and due cards are always understandable.
- **Focus**: chat and learning actions take priority over analytics decoration.

Avoid marketing-page energy inside the authenticated app. The product surface should feel utilitarian and polished, not like a landing page.

## 2. Visual Direction

The visual style stays inspired by Busuu's clean educational friendliness, but adapted into a denser AI workspace.

| Trait | Direction |
| --- | --- |
| Personality | Calm, helpful, precise, modern |
| Density | Medium-density app UI, not spacious landing layout |
| Shape | 8px radius for most controls, 12px only for major composer surfaces |
| Color usage | White and soft blue-gray base, navy text, blue primary action, sky blue system states |
| Icon style | Line icons, consistent stroke, used for actions and navigation |
| Motion | Subtle streaming/progress motion only; no decorative animation |

## 3. Color Palette

### Core Colors

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-bg` | `#FFFFFF` | Main app background |
| `--color-bg-subtle` | `#F6F8FB` | Sidebar, app bands, inactive panels |
| `--color-surface` | `#FFFFFF` | Message blocks, cards, panels |
| `--color-surface-raised` | `#F9FBFD` | Composer, right panel blocks |
| `--color-border` | `#DDE4ED` | Dividers, input borders |
| `--color-border-strong` | `#B8C4D2` | Active outlines, selected rows |

### Text Colors

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-text` | `#1E2D40` | Headings, primary labels |
| `--color-text-body` | `#334155` | Body text |
| `--color-text-muted` | `#64748B` | Metadata, timestamps, hints |
| `--color-text-disabled` | `#94A3B8` | Disabled controls |

### Action & Status Colors

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-primary` | `#116EEE` | New Study, Start Review, primary submit |
| `--color-primary-hover` | `#0D59C8` | Primary hover |
| `--color-primary-text` | `#FFFFFF` | Text on primary buttons |
| `--color-accent-blue` | `#116EEE` | Active nav, links, selected thread |
| `--color-accent-sky` | `#00A8E8` | Processing states, upload progress |
| `--color-warning` | `#F59E0B` | Limited knowledge, retry-needed states |
| `--color-danger` | `#E5484D` | Failed extraction, destructive actions |
| `--color-success` | `#116EEE` | Extraction done, ready states, correct answers |

Do not use purple-blue gradients, glowing dark-mode effects, or decorative color blobs. Color should explain state and hierarchy.

## 4. Typography

Use a modern sans-serif stack that is readable in dense app surfaces.

```css
font-family: Inter, "NistaFonts", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

| Role | Size | Weight | Line Height | Usage |
| --- | --- | --- | --- | --- |
| App title | 24px | 700 | 32px | Thread title, page title |
| Section heading | 18px | 700 | 26px | Panel headings |
| Card heading | 15px | 700 | 22px | Thread rows, stat cards |
| Body | 14px | 400 | 22px | Chat text, descriptions |
| UI label | 13px | 600 | 18px | Buttons, tabs, form labels |
| Metadata | 12px | 500 | 16px | Timestamps, counts, status |

Rules:

- Do not use hero-scale type inside the app shell.
- Keep letter spacing at `0`.
- Long thread titles must truncate after one or two lines depending on container.
- Message text should be optimized for reading, not visual drama.

## 5. App Shell Layout

### Desktop

```text
┌───────────────┬───────────────────────────────┬────────────────┐
│ Sidebar       │ Main workspace                │ Right panel    │
│ 280px         │ minmax(560px, 1fr)            │ 300px          │
└───────────────┴───────────────────────────────┴────────────────┘
```

| Region | Behavior |
| --- | --- |
| Sidebar | Fixed width, full height, thread history scrolls independently |
| Main workspace | Chat transcript, composer, upload states, review CTAs |
| Right panel | Thread memory, progress, due cards, recent uploads |

### Tablet

- Sidebar collapses to icon rail or drawer.
- Right panel collapses behind a panel button.
- Main workspace remains the primary column.

### Mobile

- Bottom navigation replaces persistent sidebar.
- Study thread history opens as a full-screen drawer.
- Composer sticks to bottom.
- Right panel content becomes an in-thread "Study context" sheet.

## 6. Core Components

### Sidebar

Purpose: create or resume study threads.

Required elements:

- New Study button at top.
- Search input for study history.
- Thread groups: Today, Previous 7 days, Older, Archived.
- Flashcards nav with due badge.
- Settings nav.
- User pill at bottom.

Thread rows use:

- 8px radius.
- Active state: pale blue background `#EAF2FF` and left border `#116EEE`.
- Processing state: small spinner and `Extracting...` label.
- Ready state: blue dot and `Ready to review`.
- Archived state: muted text.

### New Study Composer

Purpose: first action for new users and the main entry point for new study.

```text
┌──────────────────────────────────────────────┐
│ What do you want to study?                   │
│ [Drop PDF/images here]                       │
│ [Optional message input]                     │
│ Files are temporary. Only learning data is   │
│ saved.                                       │
│ [Start study thread]                         │
└──────────────────────────────────────────────┘
```

Design rules:

- Composer is the dominant object on empty dashboard.
- Use 12px radius, strong border, and subtle raised surface.
- Dropzone should have a clear icon, accepted file types, and max size.
- Privacy notice is always visible before upload.
- Primary button uses blue.

### Chat Messages

| Message Type | Visual |
| --- | --- |
| User | Right-aligned or full-width block with light blue tint |
| Assistant | Left/full-width block, white surface, no avatar unless useful |
| Tool/status | Compact system block with icon and progress state |
| Error | Light red surface, retry action visible |

Message blocks should not look like nested cards inside cards. Use spacing and subtle dividers instead of heavy boxes.

### Upload / Extraction Status

States:

| State | Visual |
| --- | --- |
| Queued | Neutral row, gray status pill |
| Processing | Blue progress bar or spinner |
| Done | Blue status, item counts, Start Review CTA |
| Failed | Red status, concise error, Retry |

Extraction complete summary should show:

- vocabulary count
- grammar pattern count
- exercise type count
- detected topic/language
- actions: View extracted knowledge, Start Review

### Thread Memory Summary

Right panel component for `thread_memories.summary`.

Design:

- Compact heading: "Study memory".
- 2-4 sentence summary max.
- Key terms as small tags.
- Show updating state when memory refresh is running.

Never make memory summary the main content. It supports chat context.

### Ready to Review CTA

Appears when enough knowledge items exist.

States:

| State | UI |
| --- | --- |
| Disabled | "Add more material to start review" |
| Ready | Blue Start Review button |
| Strong recommendation | Highlight if thread has due missed items |

Place CTA in:

- assistant extraction summary
- right panel
- dashboard ready-to-review list

### Progress Widgets

Progress is secondary and compact.

Allowed widgets:

- due flashcards
- last review score
- accuracy
- current streak
- missed items count
- recent session

Do not create oversized analytics cards. Use small stat blocks and short labels.

### Review Session UI

Review mode should feel focused and separate from chat shell.

Rules:

- Hide sidebar by default.
- Show thread title and timer at top.
- Stable question card width.
- Large enough answer controls for repeated use.
- Feedback card appears after answer, then Next.

Question type controls:

- Multiple choice: 4 option cards.
- Fill in blank: sentence + 4 options.
- Translation: text input + submit.
- Sentence construction: word chips + drop zone.

### Flashcards UI

Flashcard review should feel lightweight and repetitive-friendly.

Rules:

- Show due count and current thread filter.
- Card has stable dimensions.
- Flip action is obvious.
- Rating buttons are fixed order: Again, Hard, Good, Easy.

## 7. Interaction States

### Buttons

| Button | Default | Hover | Disabled |
| --- | --- | --- | --- |
| Primary | Blue bg, white text | Darker blue | Gray bg, muted text |
| Secondary | White bg, border | Subtle blue tint | Gray border |
| Destructive | Red text/border | Red tint | Muted |
| Icon | 36x36, transparent | Subtle surface | Muted |

### Inputs

- 40px minimum height.
- Border `#DDE4ED`.
- Focus ring uses blue `#116EEE`.
- Error ring uses danger `#E5484D`.
- File dropzone has drag-over state with blue border and pale blue fill.

### Status Pills

| Status | Color |
| --- | --- |
| Empty | Gray |
| Processing | Sky blue |
| Ready | Blue |
| Needs review | Amber |
| Failed | Red |
| Archived | Muted gray |

## 8. Empty & Error States

### New User

Primary content: New Study Composer.

No long explanation. The UI itself should make the first action obvious.

### No Uploads in Thread

Show composer and dropzone. Optional prompt: "Add material to build this study thread."

### Processing Upload

Show status in transcript and sidebar row. The user should be able to leave and return.

### Extraction Failed

Show:

- short reason
- retry button
- clear note that temporary file cleanup still applies

### No Knowledge Items Found

Show:

- "No usable learning items found"
- suggestion to upload clearer pages
- option to ask AI what went wrong if metadata exists

### No Flashcards Due

Show:

- "No cards due today"
- continue thread CTA
- optional review missed items CTA if available

## 9. Responsive Rules

### Desktop

- Three-column shell is default.
- Sidebar and right panel scroll independently.
- Composer max width should keep text readable.

### Tablet

- Sidebar becomes drawer.
- Right panel becomes collapsible side sheet.
- Thread actions remain visible above composer.

### Mobile

- Bottom navigation: Home, New Study, Flashcards, Settings.
- Thread history opens from top-left button.
- Composer is sticky bottom.
- Upload dropzone becomes compact file picker.
- Review session remains full screen.

## 10. UX Writing Rules

Use short, direct product language.

Preferred terms:

- Study thread
- New Study
- Start Review
- Study memory
- Extracted knowledge
- Due flashcards
- Ready to review

Avoid:

- Folder
- Database jargon in UI
- Long feature explanations
- "AI magic" language

Examples:

| Context | Copy |
| --- | --- |
| Privacy note | "Files are processed temporarily. Only learning data is saved." |
| Empty dashboard | "Upload material to start your first study thread." |
| Processing | "Extracting learning items..." |
| Complete | "Your material is ready to review." |
| Failed | "Extraction failed. Try again with a clearer file." |

## 11. Quick Reference

| Area | Primary UI |
| --- | --- |
| Authenticated home | Dashboard chat shell |
| New study | New Study Composer |
| History | Sidebar study thread rows |
| Active study | Thread workspace |
| Upload | Composer/dropzone inside thread |
| AI memory | Right panel summary |
| Review readiness | Ready to Review CTA |
| Progress | Compact widgets |
| Flashcards | Due-card review flow |

## 12. Design Constraints

- Do not use folder-first UI language in MVP.
- Do not make dashboard analytics the first visual priority.
- Do not place cards inside cards.
- Do not use decorative blobs, gradient orbs, or generic AI neon styling.
- Keep app controls stable in size to avoid layout shift.
- Use icons for repeated actions where recognizable.
- Use text labels for primary learning actions.
