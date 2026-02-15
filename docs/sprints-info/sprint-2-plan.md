#   Sprint 2 Plan

#   Sprint Goal

MVP Hardening & Visual Audit Trail Completion:
    Connect existing features into a coherent end-to-end QC workflow, introduce audit-grade read views, improve search & filtering, and finalize UX for production-floor usage. Prepare the system for a confident live demo and evaluation.

##  Timeline

-   **Week 1:** Workflow alignment, defect annotation functionality (update, delete, add to defect), website polling, audit logging, API extensions
-   **Week 2:** Audit views, gallery search & filters, UX improvements (mobile-first)
-   **Week 3:** Hardening, bug fixing, demo dataset, documentation & Sprint 2 demo

##  Feature Breakdown and Priorities

### High Priority

- Test lifecycle & status transitions (open → in progress → pending → finalized) (6–10 hours)

- Read-only finalized tests enforcement (4–6 hours)

- Audit log (user action + timestamp tracking) (6–10 hours)

- Audit test detail view (read-only) (8–12 hours)

- Search & filtering for tests (status, date, product, defect type) (8–12 hours)

- Tests page UX/UI refinement and flow consistency (8–12 hours)

- Align Test Details fields with Update modal labels/fields (4–6 hours)

- Mobile-first accessibility improvements (40+ users: readability, button sizing, spacing) (4–6 hours)

### Medium Priority

- Gallery filtering by severity & defect category (5–8 hours)

- Visual consistency for severity indicators (color system) (3–5 hours)

- Mobile usability improvements (big buttons, reduced typing) (4–6 hours)

- Demo dataset (tests, photos, defects) (3–5 hours)

- Improve empty/no-results states across Tests pages (2–4 hours)

- UI consistency pass (spacing, typography, component alignment) (3–5 hours)
### Low Priority

- Basic export (ZIP or mock PDF) for audit bundle (optional) (4–6 hours)

- Minor UI polish & layout cleanup (3–5 hours)

- Login screen polish (1–2 hours)
##  Team Roles and Responsibilities

### Dominykas

Action: Defect Annotation 
Deadline: End of Week 17
Success: Defects can be created, linked to photos, and stored with severity. Photos
### Ziad

Action: Tests page refinement (main focus) – UX/UI polish + flow consistency (mobile-first)
Deadline: End of Week 17
Success: Tests page is POC-ready on mobile and desktop, with clean UI, consistent labels, and a smooth flow (list → details → update/delete → photos). Gallery left as-is unless extra time.

### Sherifa

Action: Audit logging & audit search filters & audit log testing.
Deadline: End of Week 17
Success: Audit logs are automatically recorded at both the HTTP layer (middleware) and business layer (via AOP-style decorators), searchable, filterable, tested, and demo-ready with no breaking issues.

### Anastasios

Action: Review functionality, Github workflow implementation
Deadline: End of Week 17
Success: Workers are able to review tests, and the project has a working implemented workflow.