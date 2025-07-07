# Documentation Cleanup & Consolidation Checklist

> **Purpose:** This checklist guides the systematic cleanup and consolidation of all documentation in the `docs` directory, ensuring the `docs/checklists` files remain the master of truth for requirements, status, and planning.

---

## 1. Establish the Master of Truth
- [ ] Review all files in `docs/checklists/` and ensure each phase/feature is up to date and complete.
- [ ] Add a clear statement at the top of each checklist:  
      *“This file is the canonical source for requirements, status, and planning for this phase.”*
- [ ] Cross-reference related technical docs from each checklist item where implementation details exist.

---

## 2. Audit and Update the Documentation Index
- [ ] Open `docs/DOCUMENTATION_INDEX.md`.
- [ ] Remove dead or obsolete links.
- [ ] Add any missing checklist files and ensure all docs in `docs/` are referenced.
- [ ] Add a prominent note at the top:  
      *“For the latest requirements and status, see docs/checklists/ (master of truth).”*
- [ ] Ensure every doc in `docs/` is referenced here or in a checklist.

---

## 3. Standardize All Non-Checklist Docs
For every `.md` file in `docs/` (except those in `docs/checklists/`):

- [ ] Add a standard note at the top:  
      *“For the latest requirements, status, and phase planning, see docs/checklists/ (master of truth).”*
- [ ] Remove all project status, phase planning, or milestone tracking content (should be in checklists).
- [ ] Reference the relevant checklist(s) for requirements, status, and progress.
- [ ] Cross-link checklist items to relevant technical docs for implementation details.
- [ ] Update technical content to match the latest checklist requirements.
- [ ] Mark any outdated or superseded content as such, or remove it.

---

## 4. Technical and Architectural Docs
For files like `FRONTEND_*.md`, `CONTENT_*.md`, `MCP_INTEGRATION_GUIDE.md`, etc.:

- [ ] Remove any redundant planning, status, or requirements content.
- [ ] Reference the relevant checklist(s) for implementation status and requirements.
- [ ] Ensure all technical details are current and consistent with the checklists.

---

## 5. Test and Tooling Docs
For files like `ENHANCED_TEST_RUNNER.md`, `JEST_*.md`:

- [ ] Remove any test coverage or phase status reporting (should be in checklists).
- [ ] Reference the checklist(s) for test coverage targets and requirements.
- [ ] Ensure all test runner features and usage are up to date and accurate.

---

## 6. Milestone and Completion Summaries
For files like `PLUGIN_IMPLEMENTATION_COMPLETE.md`, `PHASE_1_COMPLETION_SUMMARY.md`:

- [ ] Ensure these are referenced from the relevant checklist.
- [ ] Remove any redundant status or planning content.
- [ ] Add a note at the top referencing the checklists.

---

## 7. Setup and Environment Docs
For files like `GETTING_STARTED.md`, `DEPLOYMENT_GUIDE.md`, `MONGODB_TEST_SETUP.md`:

- [ ] Ensure all setup instructions are current and reference the checklists for requirements.
- [ ] Remove any status or planning content.
- [ ] Add a note at the top referencing the checklists.

---

## 8. Decision Log
- [ ] Review all decisions in `DECISION_LOG.md` for currency.
- [ ] Mark outdated or superseded decisions as such.
- [ ] For each decision, add a reference to the motivating checklist item.
- [ ] Remove any status or planning content.

---

## 9. Orphaned or Obsolete Docs
- [ ] Identify any docs not referenced in the index or a checklist.
- [ ] Remove or merge them as appropriate.

---

## 10. Final Review
- [ ] Do a final pass through all docs in `docs/` to ensure:
    - No redundant planning/status content outside checklists.
    - All docs reference the checklists as the master of truth.
    - All technical content is up to date and cross-linked.
    - The documentation index is complete and accurate.

---

**Tip:**
For each file, consider using a checklist like:
- [ ] Standard note added
- [ ] Redundant content removed
- [ ] References to checklists added
- [ ] Technical content updated
- [ ] Cross-links established

---

*Last updated: June 30, 2025*
