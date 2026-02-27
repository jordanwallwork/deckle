# Agent Development Guide

This document provides instructions for AI agents working on the Deckle project.

## Running the Project

### Prerequisites
- .NET 10 SDK or later
- Visual Studio 2022 or Visual Studio Code with C# Dev Kit

### Running the Application

From the solution root directory:

```bash
aspire run
```

First run may require `dotnet restore && dotnet build`.

### Building the Solution

```bash
dotnet build
```

Note: frontend changes hot-reload automatically when the app is running — no rebuild needed.

### Running Tests

```bash
dotnet test
```

## Development Rules

### Adding New Projects

When creating a new .NET project:

1. Add to `src/Deckle.slnx` (keep projects sorted alphabetically):
   ```xml
   <Project Path="ProjectName/ProjectName.csproj" />
   ```
2. Verify the solution builds: `dotnet build`

### Before Committing

1. **Build**: Run `dotnet build` from `./src` — must complete with no errors or warnings
2. **Tests**: Write unit tests for new/changed functionality; run `dotnet test`
3. **Frontend type check** (if touching `src/Deckle.Web/src/`):
   ```bash
   cd src/Deckle.Web && npm run check
   ```
   Fix all TypeScript errors. Accessibility (a11y) warnings are non-blocking.

### Database Migrations

**CRITICAL: Never create migration files manually.** Always use EF Core CLI tools — manually created files are missing the required `*.Designer.cs` companion file.

**Complete ALL changes before generating a migration** — EF Core only detects what is fully configured in DbContext. An empty migration means you missed a step.

Before generating:
1. **Update entity classes** in `Deckle.Domain/Entities/`
2. **Update `AppDbContext.OnModelCreating()`** — column types, conversions, value comparers, constraints, indexes, relationships
3. **Build**: `cd src/Deckle.Domain && dotnet build`
4. **Double-check** nothing is missing from DbContext configuration

Generate:
```bash
dotnet ef migrations add <MigrationName> --project src/Deckle.Domain --startup-project src/Deckle.API
```

Use descriptive PascalCase names (e.g., `AddProjectEntities`, `UpdateUserTable`).

**Review the migration** before committing:
- If `Up()` and `Down()` are empty, DbContext config is incomplete — remove and start over:
  ```bash
  dotnet ef migrations remove --project src/Deckle.Domain --startup-project src/Deckle.API --force
  ```
- Verify `Up()` creates correct schema changes and `Down()` reverses them
- Check for data loss or breaking changes

Apply manually if needed:
```bash
dotnet ef database update --project src/Deckle.Domain --startup-project src/Deckle.API
```

### Commit Guidelines

1. **Logical units**: Commit a single feature, fix, or cohesive set of related changes
2. **Clean state**: Each commit should leave the app running with no broken functionality
3. **Commit messages**: Present tense, describe what changed and why ("Add feature" not "Added feature")

## Project Structure

- `Deckle.AppHost`: Aspire AppHost orchestrating the application
- `Deckle.API`: Minimal API project with Scalar documentation
- `Deckle.Web`: Svelte 5 + SvelteKit web application
- `Deckle.ServiceDefaults`: Shared service configuration and defaults
- `Deckle.Domain`: Domain entities and database context

## API Development Guidelines

### DTOs (Data Transfer Objects)

**CRITICAL**: API endpoints must NEVER expose Domain entities directly. Always use DTOs for requests and responses.

#### Where to Place DTOs

`Deckle.API/DTOs/`, grouped by feature area:

```
DTOs/
├── ProjectDtos.cs
├── ComponentDtos.cs
├── DataSourceDtos.cs
├── UserDtos.cs
└── GoogleSheetsDtos.cs
```

Namespace: `Deckle.API.DTOs`

#### Naming Conventions

- Response DTOs: `ProjectDto`, `ComponentDto`
- Request DTOs: `CreateProjectRequest`, `UpdateCardRequest`
- Use `record` types for conciseness

#### Mapping

Prefer direct mapping in LINQ queries for reads:
```csharp
.Select(p => new ProjectDto { Id = p.Id, Name = p.Name, ... })
```

For complex scenarios, map after query or use a static `FromEntity()` factory method.

Prefer string representation of enums in DTOs.

#### Checklist Before Committing API Changes

- [ ] No Domain entities used as return types in endpoint handlers or service methods
- [ ] Request DTOs defined for POST/PUT operations
- [ ] Response DTOs defined for all return types
- [ ] DTOs in the appropriate `DTOs/` file with `Deckle.API.DTOs` namespace
- [ ] Navigation properties flattened (not exposed directly)
- [ ] API builds without warnings

## Component Architecture

### Component Interfaces

- **`IComponent`** — Base interface (Id, ProjectId, Name, timestamps)
- **`IEditableComponent`** — Front/back designs (Card, PlayerMat)
- **`IDataSourceComponent`** — Data source linking (Card, PlayerMat)

### Working with Components

**DO:** Use polymorphic methods against interfaces:
```csharp
public async Task<ComponentDto> SaveDesignAsync(Guid componentId, string part, string design)
{
    var component = await _context.Components.FindAsync(componentId);
    if (component is IEditableComponent editable) {
        editable.SetDesign(part, design);
    }
}
```

**DON'T:** Create separate methods per component type:
```csharp
// ❌ Avoid
public async Task<CardDto> SaveCardDesignAsync(...)
public async Task<PlayerMatDto> SavePlayerMatDesignAsync(...)
```

**Frontend:** Use capability-based type guards from `componentTypes.ts`:
```typescript
if (isEditableComponent(component)) { /* show edit UI */ }
if (hasDataSource(component)) { /* show data source linking */ }
```

### Adding New Component Types

1. **Choose interfaces** — `IEditableComponent`, `IDataSourceComponent`, or just `IComponent`
2. **Backend** — Works automatically with generic service methods
3. **DTOs** — Add new DTO and update `ToComponentDto()` switch
4. **API** — Add create/update endpoints (type-specific); design/datasource endpoints work automatically
5. **Frontend** — Add to type guards in `componentTypes.ts`; create type-specific form/display components
6. **Migrations** — Follow standard migration process

Components are automatically supported for design saving (`IEditableComponent`), data source linking (`IDataSourceComponent`), and export (`IEditableComponent`).

## Svelte Development Guide

Full reference: https://svelte.dev/llms-small.txt

### Component Philosophy

- **Single Responsibility:** One thing per component. Decompose if exceeding 150 lines.
- **Open/Closed:** Use Svelte Snippets and Props for extension — not `if/else` chains inside components.
- **Logic Extraction:** Business logic and complex state go in `.svelte.ts` modules (Runes), not `<script>` blocks.
- **Decomposition Trigger:** A third "mode" or "variant" prop means refactor into a base + sub-components.
- **Prefer Snippets over Conditionals, Actions over wrapper components.**

### Hot Reload

**DO NOT** run `npm run build` or `dotnet build` for frontend-only changes — files in `src/Deckle.Web/src/` hot-reload automatically.

### Svelte 5 Key Points

- Use Runes: `$state`, `$derived`, `$effect`, `$props`, `$bindable()`
- Events: `onclick={...}` not `on:click={...}`
- Load functions: `+page.js` (universal) or `+page.server.js` (server-only)
- Forms: `+page.server.js` actions with `use:enhance`

## Frontend Architecture Patterns

### Structure

```
src/Deckle.Web/src/lib/
├── api/          # client.ts, projects.ts, components.ts, dataSources.ts, auth.ts, index.ts
├── types/        # user.ts, project.ts, component.ts, dataSource.ts, index.ts
├── constants/    # components.ts (sizes, types, colors), index.ts
└── components/   # reusable components (Card, Dialog, Sidebar, TopBar)
```

Page-specific components go in `src/routes/[route]/_components/` (underscore prefix prevents routing).

### API Client Usage

Import from `$lib/api`. Pass SvelteKit's `fetch` in server-side load functions:
```typescript
import { projectsApi, ApiError } from '$lib/api';
const projects = await projectsApi.list(fetch); // server-side
await projectsApi.create({ name, description }); // client-side
```

Catch `ApiError` for typed error handling (`err.status`, `err.message`). In load functions, re-throw as SvelteKit `error()`.

### Adding New API Endpoints

1. Add types to `$lib/types/`
2. Add function to the appropriate `$lib/api/` module
3. Use in components or load functions

## Notes

- Aspire-based application
- API uses Scalar for OpenAPI documentation
- Follow standard .NET coding conventions
