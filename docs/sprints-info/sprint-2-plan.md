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

### Medium Priority

- Gallery filtering by severity & defect category (5–8 hours)

- Visual consistency for severity indicators (color system) (3–5 hours)

- Mobile usability improvements (big buttons, reduced typing) (4–6 hours)

- Demo dataset (tests, photos, defects) (3–5 hours)

### Low Priority

- Basic export (ZIP or mock PDF) for audit bundle (optional) (4–6 hours)

- Minor UI polish & layout cleanup (3–5 hours)

##  Team Roles and Responsibilities

### Dominykas

Action: Defect Annotation 
Deadline: End of Week 17
Success: Defects can be created, linked to photos, and stored with severity. Photos
### Ziad

Action: Mobile-first UX improvements + demo readiness.
Deadline: End of Week 17
Success: QC personnel can complete a full test flow comfortably on a phone.

### Sherifa

Action: Audit logging & audit search filters & audit log testing.
Deadline: End of Week 17
Success: Supervisor can review a finalized test without editing anything, every state change and defect action is logged and visible in audit view.

### Anastasios

Action: Review functionality, Github workflow implementation
Deadline: End of Week 17
Success: Workers are able to review tests, and the project has a working implemented workflow.