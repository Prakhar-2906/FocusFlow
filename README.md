# FocusFlow

A student-focused semester command center built with semantic HTML, responsive CSS, and dependency-free JavaScript.

## Run locally

Open `index.html` in a modern browser. To serve the folder locally, run `npx serve .` (Node.js/npm required; `npx` may download `serve` to the npm cache). FocusFlow has no project dependencies or build step.

## Features

- Dashboard overview for open tasks due today, overdue work, and deadlines in the next seven days.
- Add, edit, complete, and delete tasks with title, subject, due date, priority, and estimated duration.
- Filter by completion status, deadline, subject, or priority; search by title or subject and sort by priority, due date, or subject.
- Optional three-lane priority board. Drag a task to change its priority, or use its priority selector as a keyboard-accessible alternative.
- Overall assignment completion and due-today progress bars with live counts, percentages, and accessible progress attributes, plus a weekly completion chart.
- Rescue My Day schedules open tasks using deadline, priority, and duration, includes five-minute reset gaps, and flags tasks that do not fit. This is a deterministic scheduling suggestion, not AI.
- Week and Month views in the Workload Radar show open-task deadline pressure using the same light (0–60 min), moderate (61–150 min), and heavy (over 150 min) thresholds, with selected-day assignment details.
- Immersive focus timer with optional task context, start, pause, resume, reset, completion animation, session summary, and persisted session logs.
- Deadline check-in distinguishes overdue work, deadlines within 48 hours, and today’s workload that exceeds the available Rescue My Day window.
- Next Best Move recommends an open task from current deadlines, available study time, priority, and duration, explains why it ranked first, and starts a linked Focus Mode session. Its deterministic order is deadline urgency, time fit, priority, then shorter duration; it is not AI.
- Editable daily study goal, completed-session progress, recent seven-day activity, and focus minutes summarized by subject.
- Dark charcoal and amber, and light blue and aqua themes with a saved preference and theme-specific custom cursor colors. Responsive navigation and layout, visible focus, and reduced-motion support.
- Backup & Restore downloads a versioned JSON file with tasks, completed focus sessions, the daily study goal, and the current theme.

## Keyboard shortcuts

- `N` — add a task.
- `/` — focus task search.
- `?` — show the shortcut guide.

Shortcuts are ignored while typing in text, number, date, or select fields. The `?` button in the top bar also opens the guide.

## State management

A client-side state object in app.js is the source of truth for tasks, completion dates, focus sessions, the chosen timer length, focus-task selection, and task filters. Rendering derives dashboard totals, the deadline overview, Next Best Move, Rescue My Day, the pressure map, and progress views from this state. Next Best Move is recalculated from the open task array and the current available-minutes control; its selector and shared Rescue My Day ranking live in `next-best-move.js`; no separate recommendation state is persisted. Task and session state remains under the existing localStorage key `focusflow:v1`, so upgrading the interface does not reset saved tasks. A new browser starts with an empty plan; no demo tasks are seeded. The theme preference is stored separately under `focusflow:theme`, and the daily study goal under `focusflow:study-goal:v1`, so changing either preference does not modify task or session data. Data stays in the current browser on the current device and does not require an account or server.

## Project files

- index.html — accessible dashboard, task form, board, and dialogs.
- styles.css — visual system, theme variants, responsive layout, and reduced-motion treatment.
- app.js — task behavior, scheduling, derived workload views, shortcuts, persistence, focus timer, and backup controls.
- progress.js — overall and due-today assignment progress calculations, derived from the complete task list.
- progress.test.js — progress totals, empty state, completion changes, and deadline changes.
- backup-restore.js — versioned backup validation and rollback-safe writes to FocusFlow's existing storage keys.
- backup-restore.test.js — backup format, round-trip, validation, and rollback checks.


## Study planning and history

The dashboard calls out overdue work and assignments due within 48 hours. It labels today’s assignments at risk only when their combined estimated duration exceeds the available minutes set in Rescue My Day; the warning links directly to that planner. The daily study goal is stored separately under `focusflow:study-goal:v1`. Focus history is derived from the existing `focusflow:v1` session records, counted once per completed timer session, summarized by subject and over the most recent seven calendar days. Paused or reset sessions are not logged as completed study time. New completed sessions also retain the selected task’s subject when available.

## Recommendation checks

Run `node --test next-best-move.test.js next-best-move.integration.test.js progress.test.js` to check deadline and fit ordering, priority tie-breaking, completed-task exclusion, empty lists, progress recalculation, and the Focus Mode task handoff.

## Backup and restore

Open **Backup & Restore** from the top bar and choose **Download backup** to save a versioned `focusflow-backup-*.json` file. To restore, select a backup file and review the confirmation; restore replaces the task/session record and any goal or theme preferences included in that file. Missing optional preferences are left unchanged. Invalid or unsupported files are rejected before stored data is touched. FocusFlow backs up only its own `focusflow:v1`, `focusflow:study-goal:v1`, and `focusflow:theme` data; unrelated browser storage is not included. Keep backup files somewhere safe.

Run `node --test backup-restore.test.js` to check backup round trips, invalid and unsupported inputs, empty data, optional preferences, and storage rollback.

## Back up and restore

Open **Backup and Restore** from the top bar and choose **Download backup** to save a dated `focusflow-backup-YYYY-MM-DD.json` file. It includes assignments, saved planner state, completed focus sessions, your daily study goal, and theme. Keep the file somewhere safe.

To restore, choose a FocusFlow JSON backup. FocusFlow validates its version, task and session fields, and supported settings before enabling **Restore backup**. Review the task/session summary and confirm the replacement prompt. A restore replaces the included saved FocusFlow data; preferences absent from an older backup remain as they are. Invalid files and failed saves leave the existing stored data intact.

## Workload radar: Week and Month

Use the **View** dropdown in the existing Workload Radar to choose **Week** or **Month**. Week keeps the next seven days view. Month shows a Sunday-through-Saturday aligned calendar; use the arrows to move between months and **Today** to return to the current month. Select any date to see its assignments, completion state, priority, and estimate. Use **Edit** beside a task to open the existing task editor.

Workload is based on estimated minutes for unfinished assignments due that day: **Light** is 0–60 minutes, **Moderate** is 61–150 minutes, and **Heavy** is over 150 minutes. Completed assignments remain listed in selected-day details but do not add pressure minutes. A dot marks dates with deadlines, including completed assignments.
