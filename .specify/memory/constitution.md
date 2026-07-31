<!--
Sync Impact Report
Version change: (template) → 1.0.0
Modified principles: n/a (initial ratification)
Added sections:
  - I. Code Quality
  - II. Testing Standards
  - III. User Experience Consistency
  - IV. Performance Requirements
  - Quality Gates
  - Development Workflow
  - Governance
Removed sections: none (template placeholders replaced)
Templates requiring updates:
  - .specify/templates/plan-template.md ⚠ pending manual review for alignment
  - .specify/templates/spec-template.md ⚠ pending manual review for alignment
  - .specify/templates/tasks-template.md ⚠ pending manual review for alignment
  - .specify/templates/checklist-template.md ⚠ pending manual review for alignment
Follow-up TODOs: none
-->

# wow-character-tracker Constitution

## Core Principles

### I. Code Quality
Code MUST be clear, self-documenting through naming, and free of speculative
abstraction. Every function or module MUST have a single, clear
responsibility; do not build for hypothetical future requirements (YAGNI).
Comments are reserved for non-obvious rationale (a workaround, a hidden
constraint, a subtle invariant) — not for restating what the code does. All
non-trivial changes MUST pass through review (see Development Workflow)
before merging. Once linting and type-checking tooling is established for a
given part of the stack, it MUST run clean before merge; do not silence or
bypass checks to make code merge faster.

**Rationale**: A character tracker persists user data over a long lifetime;
unclear or overly clever code compounds maintenance cost and risks silent
data-handling bugs.

### II. Testing Standards
New features and bug fixes MUST include automated tests that cover the core
behavior before the work is considered complete. Bug fixes MUST include a
regression test that fails before the fix and passes after. The full test
suite MUST pass before any merge to `main`. Prefer real integration tests
over heavy mocking for critical data flows — character data persistence,
import/export, and any external API calls — since mocked tests can pass
while the real integration is broken.

**Rationale**: Character data is user-owned and often hard to reconstruct;
untested persistence and sync logic is the highest-risk area for silent data
loss.

### III. User Experience Consistency
UI components MUST follow one consistent visual language (spacing, color,
typography, iconography) across every view — a pattern introduced in one
screen MUST be applied everywhere that pattern applies, not just where it
was first needed. User-facing terminology (stats, gear slots, classes,
professions, etc.) MUST match official World of Warcraft terminology so the
tool stays legible to players. Every view MUST handle loading and error
states explicitly and visibly; silent failures or blank screens on error are
not acceptable. UX changes SHOULD be manually verified by running the app
before being marked complete.

**Rationale**: Inconsistent UI and unclear error states erode trust in a
tool whose entire job is to be a reliable source of truth for a player's
characters.

### IV. Performance Requirements
Local interactions (navigation, filtering, sorting a character list) MUST
feel instant — target under 100ms perceived latency. Network-bound
operations (fetching character or realm data) MUST show a clear loading
indicator and complete within 1 second under normal conditions, or
communicate progress if they cannot. Calls to external APIs (e.g., the
Blizzard API) MUST be cached and rate-limited appropriately; do not issue
redundant calls for data that has not changed. Do not optimize
prematurely — profile before restructuring code for performance, and
justify the change with the measurement.

**Rationale**: Character trackers are checked frequently and often against
rate-limited third-party APIs; sluggishness or API throttling directly
breaks the tool's usefulness.

## Quality Gates

Once CI is established, it MUST run linting, type-checking (where
applicable), and the full automated test suite on every pull request; a red
pipeline blocks merge. Performance-sensitive changes (data fetching,
rendering large character lists) SHOULD note the expected before/after
impact in the PR description. UX-affecting changes SHOULD be manually
exercised in the running app, per Principle III, before being marked
complete.

## Development Workflow

All non-trivial changes MUST be reviewed before merging to `main`; for
solo development, this means a deliberate, separate re-read of the diff
rather than merging immediately after writing it. Commits SHOULD be scoped
to one logical change with a message explaining *why*, not just what
changed. Any change to stored character data's schema or format MUST
include a migration path so existing users' data is not silently lost or
corrupted.

## Governance

This constitution supersedes ad hoc practice. All feature plans and pull
requests MUST verify compliance with these principles; any deviation MUST
be explicitly justified in the relevant spec or plan rather than made
silently. Amendments are made by editing this document, incrementing the
version per semantic versioning (MAJOR: backward-incompatible principle
removal/redefinition; MINOR: new principle or materially expanded guidance;
PATCH: clarifications and wording fixes), and recording the change in a
Sync Impact Report comment at the top of this file.

**Version**: 1.0.0 | **Ratified**: 2026-07-30 | **Last Amended**: 2026-07-30
