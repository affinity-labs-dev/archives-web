# Analytics Spec Builder — Master Prompt

Use this prompt with Claude Code (or any AI coding assistant) to generate standalone analytics spec documents for each user flow in a React Native / Expo app with PostHog analytics.

---

## What This Produces

For each user flow in the app, you get a standalone HTML file containing:

1. **A horizontal flow diagram** (Mermaid, pre-rendered as inline SVG for PDF compatibility)
2. **An events table** mapping every diagram node to its PostHog events
3. **A product questions section** — straightforward questions this flow answers

These specs serve as the source of truth for what we track, what we don't, and what we need to build.

---

## Prompt

```
You are building standalone analytics spec documents for a React Native / Expo mobile app that uses PostHog for analytics.

### YOUR TASK

For each user flow I give you, produce a standalone HTML file with:
1. A Mermaid flow diagram (pre-rendered as inline SVG)
2. An events table
3. A product questions section

### STEP 1: UNDERSTAND THE FLOW

Before building anything:
- Read the relevant screen files in the codebase (app/*.tsx, components/ui/*.tsx)
- Read the analytics file (lib/analytics.ts) to know which events exist
- Identify every button, action, and screen transition in the flow
- Identify every analytics.track*() call — these are "in codebase" events
- Identify every button/action that has NO analytics call — these are "needs implementation" events

### STEP 2: BUILD THE DIAGRAM

Create a Mermaid `graph LR` (left-to-right) flow diagram following these rules:

**Nodes:**
- Each node represents a screen, action, or decision the user encounters
- Node labels should be plain English, no code, no jargon
- NO numbers or data in the diagram (no user counts, no percentages, no volume)
- If a flow branches (e.g., "Photo + Message" vs "Message Only"), show them as separate box nodes
- If items within a node are tools (e.g., brush, undo, redo inside a mask screen), keep them IN the node label, not as separate nodes

**Colors:**
- White (#fff, stroke #ccc) = regular steps
- Amber (#E67C37, stroke #c0652e) = checkpoints — milestones where we check "did the user reach this point?"
- Grey (#9ca3af, stroke #6b7280) = separate/alternate paths not fully specced yet
- NO green, NO red in diagrams. Checkpoints are amber. Success is amber. There are no "drop-off" or "failure" nodes.

**What qualifies as a checkpoint:**
- The start of the flow (e.g., "Brief Opened")
- Key milestones (e.g., "Mask Screen", "Summary", "Replace Completed")
- "Generation Requested" and "Image Generated" when the flow leads to generation
- "Back to Chat" when it's the endpoint

**Arrows:**
- Arrow labels should be short actions like "replace tapped", "next", "submit", "edit", "auto-nav 800ms"
- NO percentage labels on arrows
- NO drop-off labels

**Endings:**
- If the flow leads to a new image generation, end at "Back to Chat" — the chat interaction is covered in the onboarding spec
- If the flow is self-contained (e.g., action bar buttons), end at the last action
- Do NOT repeat the chat → Photo + Message / Message Only → Generation Requested → Image Generated pattern in every spec. That belongs in the onboarding spec only.

**Loops:**
- If users can go back (e.g., "edit" goes back to start), show the loop arrow
- If a sub-flow returns to the parent (e.g., catalogue sheet → select product → back to describe screen), show it if it adds clarity, skip it if the diagram gets cluttered

**Rendering:**
- Render the Mermaid diagram to SVG using: `npx --yes @mermaid-js/mermaid-cli -i file.mmd -o file.svg -b transparent`
- Inline the SVG directly into the HTML (no external files, no Mermaid JS CDN)
- Namespace SVG IDs to avoid conflicts: replace `id="my-svg"` with a unique ID

### STEP 3: BUILD THE EVENTS TABLE

Create a table with columns: # | Node | PostHog Events | QA

**Rules:**
- One row per diagram node
- Each node lists ALL PostHog events that fire at that point (not just one umbrella event)
- Multiple events per node are listed on separate lines within the same cell
- Event properties are shown in grey below the event name

**Color coding (text color, not background):**
- Black (normal) = event exists in the codebase (analytics.ts has a track*() method for it), regardless of whether PostHog shows data. Old builds may not have pushed yet.
- Red (class="untracked", color #dc2626) = event does NOT exist in the codebase. Needs to be built.
- If an event exists in the codebase but the analytics.track() call is not wired (e.g., ATT permission — the code runs but no analytics call), it's RED with a note: "Code exists in [file:line] — needs analytics.track() wiring"

**Do NOT:**
- Write "Need to track" or "BROKEN" — just use the color
- Include volume/user count data from PostHog
- Include "$identify" or other PostHog system events

**QA column:**
- Short description of what failure looks like at this node
- One line, plain English
- Examples: "Blank screen", "Permission denied", "Canvas unresponsive", "Fable not responding"

### STEP 4: BUILD THE QUESTIONS SECTION

Create a numbered list of product questions this flow answers.

**Rules:**
- Every question should be answerable by the events in the table
- Start with "How many users..." for consistency
- Each question asks ONE thing and gets ONE answer
- NO "vs" comparisons (not "How many users do X vs Y?" — split into two questions)
- NO correlation questions (not "Do users who do X also do Y?")
- NO percentage questions (not "What percentage..." — use "How many users...")
- Every question must lead to a product decision. If knowing the answer doesn't change what you build, remove the question.
- Cross-check against the actual app logic. Don't write questions about things that can't happen (e.g., "hit paywall on first generation" when free users get 3 generations)

### STEP 5: ASSEMBLE THE HTML

Use this CSS structure (inline in the HTML, no external files):
- Font: -apple-system, system-ui, sans-serif
- Background: #fafafa
- Max width: 1100px, centered
- Font sizes: h1=32px, h2=22px, table=15px, mono=14px, body=16px
- .mono = SF Mono, Menlo, monospace
- .untracked = color #dc2626, font-weight 600
- .vol = font-size 12px, color #888 (for event properties)
- .svg-chart = width 100%, overflow-x auto
- Amber checkpoint in legend: background #E67C37

**Legend at the top:**
Normal = in codebase
Red = not in codebase, needs implementation
Amber = checkpoint

**Structure:**
1. Title: "[App Name] [Flow Name] Spec"
2. Subtitle: ticket number, PostHog project ID
3. Legend
4. "User Journey" heading + SVG diagram
5. "Events" heading + table
6. Horizontal rule
7. "Questions This Flow Answers" heading + numbered list
8. Footer

### STEP 6: PDF (ONLY WHEN ASKED)

Generate PDF only when the user explicitly asks. Use Chrome headless:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --print-to-pdf="output.pdf" --no-margins "file:///path/to/spec.html"
```

### FILE ORGANIZATION

Each spec goes in its own folder under `docs/analytics/specs/`:
```
docs/analytics/specs/
├── [flow-name]/     [flow-name]-spec.html + .pdf
├── [flow-name]/     [flow-name]-spec.html + .pdf
└── ...
```
Name folders and files after the flow, not the screen. Use lowercase, hyphens, no spaces.

### ITERATION PROTOCOL

1. Build the HTML and open it in Chrome for the user to review
2. Do NOT generate PDF until the user says it looks right
3. Collect ALL feedback before making changes (don't regenerate after every comment)
4. When the user asks "tell me what I'm asking you to do" — restate their request in your own words before proceeding
5. Ask questions one at a time, not all at once
6. Read the codebase before assuming anything about how the app works
```

---

## How to Discover Flows

Do NOT hardcode a list of flows. Instead, discover them from the codebase:

1. **Read the app router/navigation structure** — look at `app/` directory, `_layout.tsx`, tab navigators, stack navigators. Each top-level route or tab is a potential flow.

2. **Identify entry points** — where does the user start? (app open, tab tap, button press). Each entry point is the beginning of a flow.

3. **Trace the user journey** — from each entry point, follow the navigation: what screens do they visit, what actions can they take, where do they end up?

4. **Group by purpose** — each flow should represent one user goal (e.g., "onboard and generate first image", "replace part of a design", "browse past designs"). If a screen serves multiple goals, it appears in multiple specs.

5. **Check the analytics file** — look at all `track*()` methods in the analytics service. Group them by flow to see which flows have coverage and which have gaps.

6. **Ask the user** — after discovering the flows, list them and confirm before building. The user may want to split, merge, or skip certain flows.

**One spec per flow. One folder per spec. Start with the most important flow (usually onboarding) and iterate before moving to the rest.**

---

## Key Rules Summary

| Rule | Why |
|---|---|
| No numbers in diagrams | Diagrams show the flow, not the data. Data lives in PostHog. |
| No "vs" in questions | Each question asks one thing, gets one answer. |
| No correlation questions | "Do users who do X also do Y?" is not actionable. |
| Black = in codebase | If analytics.ts has the method, it's black. Even if PostHog shows 0 (old build). |
| Red = not in codebase | Needs a new track() call to be written. |
| Amber = checkpoint | Key milestones in the flow. |
| No drop-off nodes | Drop-off is basic math. The diagram shows the journey, not the failures. |
| End at "Back to Chat" | If the flow leads to generation, end at Back to Chat. The generation flow is in onboarding spec. |
| Diagram matches UI order | Buttons should appear in the diagram in the same order they render on screen. |
| One node per screen | Tools within a screen (brush, undo, redo) are part of the screen node, not separate nodes. |
| Ask before building | Always confirm understanding before writing code. Restate in your own words. |
| HTML first, PDF later | Only generate PDF when explicitly asked. |
