

# Modularizing `src/routes` in the AI Server

This document provides a comprehensive modularization plan for the `src/routes` directory, ensuring maintainability, scalability, and clarity. All previously monolithic and legacy route files that have been modularized are now omitted from the step-by-step instructions below.

---

## 1. **Audit and Categorize Existing Route Files**

- Review all files in `src/routes` and subdirectories.
- Identify files that:
  - Mix route definitions with business logic.
  - Contain validation logic or middleware inline.
  - Are legacy, monolithic, or not following the modular structure.
- Document the status of each file in `docs/ROUTES_MODULARIZATION_PLAN.md`.

---

## 2. **Modularization Plans for Remaining/Flagged Files**

The following files are still flagged for modularization or further review:

- `orchestrator.ts`
- `performance.ts`

For these files, follow the modularization steps below:

### 2.1 Refactor Route Files
  - Move all handler/business logic out of the route file into a dedicated controller (e.g., `controllers/orchestratorController.ts`).
  - **Step-by-step audit and migration for `orchestrator.ts`:**
    1. **Identify All Handler and Business Logic:**
       - Review `orchestrator.ts` for any inline handler functions, business logic, or utility code.
       - List each function, middleware, or logic block that is not a pure route definition.
    2. **Classify Logic by Concern:**
       - For each handler or logic block, determine its primary concern (e.g., orchestration, validation, data transformation).
       - Group related logic for modular extraction.
    3. **Create Dedicated Controller(s) and Modularize by Endpoint/Concern:**
       - For each logical concern or resource (e.g., models, servers, RAG analytics), create a dedicated controller file:
         - `controllers/modelsController.ts` (model add/remove/upload/version endpoints)
         - `controllers/serversController.ts` (server add/remove/update endpoints)
         - `controllers/ragController.ts` (analytics, model performance, best models, usage stats)
       - Move all related handler logic into these controller files as named, exported functions.
       - Ensure each function is pure and testable, with clear input/output signatures.
       - If any logic is shared between controllers, extract it into a `utils/` or `services/` directory and import as needed.
       - Update the main `controllers/orchestratorController.ts` to only re-export or aggregate from these modular controllers (optional, for backward compatibility).
       - Update all route files to import from the new modular controllers.
       - Example structure:
         ```
         controllers/
           modelsController.ts
           serversController.ts
           ragController.ts
           index.ts (optional barrel)
         ```
    3a. **Migration Steps:**
       1. Identify and group all endpoints in `orchestratorController.ts` by concern (models, servers, RAG).
       2. Create new controller files for each group.
       3. Move the relevant functions (with JSDoc) to their new files.
       4. Refactor imports in `orchestrator.ts` and any other route files to use the new controllers.
       5. If needed, create a `controllers/index.ts` barrel file to re-export all controllers for easier imports.
       6. Run and update all tests to ensure correct wiring and coverage.
       7. Update documentation and directory trees to reflect the new structure.
    4. **Extract Utility/Helper Functions:**
       - If there are utility functions used by multiple handlers, move them to a shared `utils/` or `services/` directory.
       - Import these utilities into the controller as needed.
    5. **Refactor Route File:**
       - In `orchestrator.ts`, replace all inline handler logic with imports from the controller.
       - The route file should only define route signatures, attach validation/middleware, and connect to controller functions.
    6. **Add/Update JSDoc Comments:**
       - Add or update JSDoc comments for each controller function and route definition.
       - Include request/response examples and edge cases.
    7. **Update/Write Unit Tests:**
       - Write or update unit tests for each controller function in the appropriate `__tests__/` directory.
       - Ensure at least 80% coverage for all new/modified logic.
    8. **Integration Testing:**
       - Update or create integration tests for the orchestrator routes, ensuring correct wiring and middleware usage.
    9. **Documentation:**
       - Update the `README.md` in the route group directory to reflect the new controller structure and endpoint usage.
       - Document any changes in `docs/DECISION_LOG.md` if architectural or endpoint behavior changes.
    10. **Deprecate/Remove Legacy Logic:**
        - Remove any obsolete or duplicate logic from the route file after migration.
        - Mark the old file for deprecation if all features are migrated.
    11. **Review and Refactor Imports:**
        - Ensure all imports in `app.ts` and barrel files reference the new controller structure.
    12. **Continuous Review:**
        - Schedule periodic audits to ensure no business logic creeps back into route files.
  - The route file should only define route signatures and attach controller functions.
  - Ensure all route files import only the relevant controller(s) and middleware.
  - Add JSDoc comments for each endpoint, including request/response examples.

### 2.2 Move and Use Validation Middleware
  - Move all validation arrays and logic (e.g., `validateUniverseRequest`, `validateCharacterRequest`) to a shared middleware file (e.g., `src/middleware/validation.ts`).
  - Import and use these middleware functions in the route files.
  - Ensure validation is reusable and tested independently.

### 2.3 Remove Legacy/Obsolete Endpoints
  - If an endpoint is fully replaced by the new implementation, remove it from the legacy file.
  - Mark the legacy file for deprecation once all features are migrated.
  - Document removed endpoints and their replacements in `docs/DECISION_LOG.md`.

### 2.4 Update Barrel Files
  - Ensure each route group directory (e.g., `src/routes/generation/`) has an `index.ts` that re-exports all routers in the group.
  - In the main `app.ts`, import routers from these barrel files for clean, organized mounting.

### 2.5 Test and Document
  - Update or create unit and integration tests for each modularized controller and route file.
  - Achieve and maintain at least 80% test coverage for all route logic and controllers.
  - Add or update `README.md` in each route group directory, documenting available endpoints, usage examples, and validation rules.
  - Update API documentation (Swagger/OpenAPI) to reflect all changes.

---

## 3. **General Modularization Guidelines**

- Split endpoints by resource or concern (e.g., generation, performance, orchestration).
- Extract business logic and handler functions into dedicated controllers/services.
- Keep route files declarative and focused only on route definitions and middleware attachment.
- Use barrel files (`index.ts`) for aggregating and re-exporting modules within a directory.
- Avoid deep nesting of files and directories to prevent path complexity.

---

## 4. **Standardize Route File Structure**

Each route file should:

- Import Express and create a `Router` instance.
- Import only the relevant controller(s) and middleware.
- Define endpoints with clear HTTP methods and paths.
- Attach validation and other middleware as needed.
- Export the router as default.
- Add JSDoc comments for each endpoint, including:
  - Description
  - Request parameters/body
  - Response format
  - Example requests/responses

---

## 5. **Implement Barrel Files for Route Groups**

- In each subdirectory (e.g., `generation/`, `compat/`, `orchestration/`), add an `index.ts` that re-exports all routers in the group.
- In the main `app.ts`, import routers from these barrel files for clean, organized mounting.
- Document the structure and usage of barrel files in the main README.

---

## 6. **Update Tests and Documentation**

- Update or create unit and integration tests for each modularized route and controller.
- Achieve and maintain at least 80% test coverage for all route logic and controllers.
- Update the main README and add a `README.md` to each route group directory, documenting available endpoints, usage examples, and validation rules.
- Update API documentation (Swagger/OpenAPI) to reflect all changes, including request/response examples.

---

## 7. **Refactor Imports in `app.ts`**

- Update all imports in `src/app.ts` to use the new modular structure and barrel files.
- Ensure route mounting order and paths remain correct.
- Remove any obsolete or legacy imports.

---

## 8. **Deprecate and Remove Legacy or Redundant Files**

- Remove any obsolete route files or logic that has been moved to controllers or middleware.
- Ensure no duplicate logic remains.
- Document all removals and deprecations in `docs/DECISION_LOG.md`.

---

## 9. **Continuous Review and Enforcement**

- Add linting or architectural rules to enforce modular route structure.
- Periodically review for new monolithic files or cross-cutting concerns.
- Schedule regular audits of the `src/routes` directory and update this plan as needed.

---

By following these steps, the `src/routes` directory will be modular, maintainable, and ready for future growth. All changes should be tracked in documentation and reflected in the project structure.
