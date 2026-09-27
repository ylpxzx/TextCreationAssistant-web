# Web source architecture

The frontend is organized by responsibility instead of page size.

```text
src/
  app/                    Application shell and top-level navigation state
  features/               Business capabilities grouped by domain
    auth/                 Login and registration
    projects/             Project library and creation flow
    settings/             Model connection settings
    workspace/            Writing workspace
      components/         Workspace-only UI components
      hooks/              Editor, autosave and AI interaction logic
  services/               Core API and streaming boundaries
    client/               Shared HTTP, error and SSE transport
    modules/              Domain clients for auth, projects, chapters, resources, models and AI
  shared/                 Reusable UI and utilities without business ownership
  storage/                Browser persistence such as IndexedDB
  styles/                 Global tokens and application-level styles
  types/                  Shared domain models
```

## Dependency rules

- `app` may compose feature modules, but contains no feature implementation.
- A feature owns its private components, hooks and configuration.
- Cross-feature data access goes through `services`.
- Browser persistence is isolated in `storage`.
- `shared` cannot import from `features`.
- Domain models live in `types`; component-only types stay beside their component.
- New files should be placed in the narrowest feature that owns them. Promote code to `shared` only after it is genuinely reused.
