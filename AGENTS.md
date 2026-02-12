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

The AppHost will start the Aspire application and launch the dashboard in your browser.

Note: First run may require:

```bash
dotnet restore
dotnet build
```

### Building the Solution

Note: when the app is already running, you do not need to re-build for frontend only changes; these will hot-reload automatically.

```bash
dotnet build
```

### Running Tests

```bash
dotnet test
```

## Development Rules

### Adding New Projects

When creating a new .NET project:

1. **Add to Solution**: Always add the project to `src/Deckle.slnx`
   ```xml
   <Project Path="ProjectName/ProjectName.csproj" />
   ```
   Keep projects sorted alphabetically for consistency.

2. **Verify**: Ensure the solution builds after adding the project
   ```bash
   dotnet build
   ```

### Before Committing

1. **Build Successfully**: Ensure the entire solution builds without errors by running the following command from ./src
   ```bash
   dotnet build
   ```

2. **No Compiler Warnings**: The build must complete without any compiler warnings
   - Address all warnings before committing
   - Do not suppress warnings without good reason

3. **Tests Written + Passing**: Write unit tests to cover new/changed functionality. All tests must pass (when tests are present)
   ```bash
   dotnet test
   ```

4. **Frontend Type Check**: When making changes to the Svelte frontend (`src/Deckle.Web/src/`), verify there are no TypeScript or Svelte errors
   ```bash
   cd src/Deckle.Web
   npm run check
   ```
   - Fix all TypeScript errors before committing
   - Address type safety issues (no implicit `any`, proper type annotations)
   - Accessibility warnings (a11y) can be addressed but are not blocking

### Database Migrations

**CRITICAL: Always Use EF Core Tools for Migrations**

Never create migration files manually. Always use EF Core CLI tools to generate migrations:
```bash
dotnet ef migrations add <MigrationName> --project src/Deckle.Domain --startup-project src/Deckle.API
```

Manually created migration files are missing the required `*.Designer.cs` companion file that EF Core needs to track and apply migrations correctly. Without this file, migrations will not be recognized or applied.

When making changes to the database schema (entity models in `Deckle.Domain`):

**CRITICAL: Complete ALL Changes Before Generating Migration**

Before generating a migration, ensure you have completed ALL of the following steps:

1. **Update Entity Classes**: Add/modify all properties in the entity class (e.g., `Deckle.Domain/Entities/DataSource.cs`)
2. **Update DbContext Configuration**: Add/modify ALL corresponding configurations in `AppDbContext.OnModelCreating()`, including:
   - Column types (e.g., `.HasColumnType("jsonb")`)
   - Conversions (e.g., `.HasConversion(...)`)
   - Value comparers for collections (e.g., `.Metadata.SetValueComparer(...)`)
   - Constraints, indexes, relationships, etc.
3. **Build the Domain Project**: Ensure the project compiles successfully
   ```bash
   cd src/Deckle.Domain && dotnet build
   ```
4. **Verify Changes Are Complete**: Double-check that you haven't forgotten any property configurations

**Why This Matters**: If you generate a migration before completing DbContext configurations, EF Core won't detect the changes and will create an **empty migration**. If this happens, you must remove the empty migration and generate a new one after completing all configurations.

**Generating the Migration**:

1. **Generate Migration**: Use Entity Framework Core tools to create a migration
   ```bash
   dotnet ef migrations add <MigrationName> --project src/Deckle.Domain --startup-project src/Deckle.API
   ```

2. **If API is Running**: Do NOT use `--no-build` unless absolutely necessary. It's better to stop the API and run a full build to ensure EF Core detects all changes. If you must use `--no-build`:
   ```bash
   # First, build the Domain project manually
   cd src/Deckle.Domain && dotnet build

   # Then generate migration with --no-build
   cd ..
   dotnet ef migrations add <MigrationName> --project Deckle.Domain --startup-project Deckle.API --no-build
   ```

3. **Migration Naming**: Use descriptive PascalCase names (e.g., `AddProjectEntities`, `UpdateUserTable`)

4. **Review Migration**: ALWAYS review the generated migration file before committing
   - **Check if migration is empty** - If `Up()` and `Down()` methods are empty, you forgot to complete the DbContext configuration. Remove the migration and start over.
   - Verify the `Up()` method creates the correct schema changes
   - Ensure the `Down()` method properly reverses the changes
   - Check for any data loss or breaking changes

5. **If Migration is Empty**: Remove it and fix the issue
   ```bash
   dotnet ef migrations remove --project src/Deckle.Domain --startup-project src/Deckle.API --force
   ```
   Then complete steps 1-3 above before generating a new migration.

6. **Apply Migration**: The migration will be applied automatically on application startup, or manually with:
   ```bash
   dotnet ef database update --project src/Deckle.Domain --startup-project src/Deckle.API
   ```

### Commit Guidelines

1. **Logical Units of Work**: Commit after completing a logical unit of work
   - A single feature or fix
   - A cohesive set of related changes
   - Changes that make sense together

2. **Clean Working State**: Each commit should leave the project in a working state
   - The application should run
   - No broken functionality
   - No incomplete features that break existing code

3. **Meaningful Commit Messages**: Write clear, descriptive commit messages
   - Describe what changed and why
   - Use present tense ("Add feature" not "Added feature")

## Project Structure

- `Deckle.AppHost`: Aspire AppHost project that orchestrates the application
- `Deckle.API`: Minimal API project with Scalar documentation
- `Deckle.Web`: Svelte 5 + SvelteKit web application
- `Deckle.ServiceDefaults`: Shared service configuration and defaults
- `Deckle.Domain`: Domain entities and database context

## API Development Guidelines

### DTOs (Data Transfer Objects)

**CRITICAL RULE**: API endpoints must NEVER expose Domain entities directly. Always use DTOs for API requests and responses.

#### Why DTOs are Required

1. **Separation of Concerns**: Domain entities are for database modeling, not API contracts
2. **API Stability**: Changes to domain models won't break API consumers
3. **Security**: Prevents over-posting attacks and accidental exposure of sensitive data
4. **Flexibility**: API can expose different data structures than the database schema
5. **Serialization Control**: Domain entities may have circular references or navigation properties that cause serialization issues

#### Where to Place DTOs

DTOs are organized in dedicated files within the `DTOs` folder, grouped by feature/domain area:

```
Deckle.API/
└── DTOs/
    ├── ProjectDtos.cs         # Project-related DTOs
    ├── ComponentDtos.cs       # Component, Card, and Dice DTOs
    ├── DataSourceDtos.cs      # Data source DTOs
    ├── UserDtos.cs            # User and authentication DTOs
    └── GoogleSheetsDtos.cs    # Google Sheets integration DTOs
```

Services and endpoints should import DTOs using the `Deckle.API.DTOs` namespace:

```csharp
// In Services/ProjectService.cs
using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class ProjectService
{
    public async Task<ProjectDto> GetProjectByIdAsync(Guid id)
    {
        // Implementation using ProjectDto from DTOs folder
    }
}
```

Example DTO file structure:

```csharp
// In DTOs/ProjectDtos.cs
namespace Deckle.API.DTOs;

public record ProjectDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required DateTime CreatedAt { get; init; }
}

public record CreateProjectRequest(string Name, string? Description);
```

#### DTO Naming Conventions

- **Response DTOs**: Use descriptive names ending with `Dto` (e.g., `ProjectDto`, `ComponentDto`)
- **Request DTOs**: Use descriptive names ending with `Request` (e.g., `CreateProjectRequest`, `UpdateCardRequest`)
- **Simple DTOs**: For simple request/response objects, you can use records for conciseness

#### Good Example (ProjectService)

```csharp
// In Services/ProjectService.cs
using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class ProjectService
{
    // ✅ GOOD: Returns DTO (defined in DTOs folder), not Domain entity
    public async Task<ProjectDto> GetProjectByIdAsync(Guid userId, Guid projectId)
    {
        var project = await _dbContext.UserProjects
            .Where(up => up.UserId == userId && up.ProjectId == projectId)
            .Include(up => up.Project)
            .Select(up => new ProjectDto  // Map to DTO in query
            {
                Id = up.Project.Id,
                Name = up.Project.Name,
                Description = up.Project.Description,
                CreatedAt = up.Project.CreatedAt,
                UpdatedAt = up.Project.UpdatedAt,
                Role = up.Role.ToString()
            })
            .FirstOrDefaultAsync();

        return project;
    }
}
```

```csharp
// In DTOs/ProjectDtos.cs
namespace Deckle.API.DTOs;

// ✅ GOOD: DTO defined separately in DTOs folder
public record ProjectDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required DateTime CreatedAt { get; init; }
    public required DateTime UpdatedAt { get; init; }
    public required string Role { get; init; }
}
```

#### Bad Example (ComponentService)

```csharp
public class ComponentService
{
    // ❌ BAD: Returns Domain entity directly
    public async Task<Component> GetComponentByIdAsync(Guid userId, Guid componentId)
    {
        return await _context.Components
            .Where(c => c.Id == componentId)
            .FirstOrDefaultAsync();
    }

    // ❌ BAD: Returns Domain entity directly
    public async Task<Card> CreateCardAsync(Guid userId, Guid projectId, string name, CardSize size)
    {
        var card = new Card { /* ... */ };
        _context.Cards.Add(card);
        await _context.SaveChangesAsync();
        return card; // Should map to DTO instead
    }
}
```

**Fix:** Create DTOs in the DTOs folder and map to them:

```csharp
// In Services/ComponentService.cs
using Deckle.API.DTOs;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.API.Services;

public class ComponentService
{
    // ✅ GOOD: Returns DTO from DTOs folder
    public async Task<ComponentDto> GetComponentByIdAsync(Guid userId, Guid componentId)
    {
        return await _context.Components
            .Where(c => c.Id == componentId)
            .Select(c => new ComponentDto
            {
                Id = c.Id,
                ProjectId = c.ProjectId,
                Name = c.Name,
                Type = c.GetType().Name, // "Card" or "Dice"
                CreatedAt = c.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    // ✅ GOOD: Returns DTO from DTOs folder
    public async Task<CardDto> CreateCardAsync(Guid userId, Guid projectId, string name, CardSize size)
    {
        var card = new Card { /* ... */ };
        _context.Cards.Add(card);
        await _context.SaveChangesAsync();

        // Map to DTO before returning
        return new CardDto
        {
            Id = card.Id,
            ProjectId = card.ProjectId,
            Name = card.Name,
            Size = card.Size.ToString(),
            CreatedAt = card.CreatedAt
        };
    }
}
```

```csharp
// In DTOs/ComponentDtos.cs
namespace Deckle.API.DTOs;

public record ComponentDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required string Type { get; init; }
    public required DateTime CreatedAt { get; init; }
}

public record CardDto
{
    public required Guid Id { get; init; }
    public required Guid ProjectId { get; init; }
    public required string Name { get; init; }
    public required string Size { get; init; }
    public required DateTime CreatedAt { get; init; }
}
```

#### Mapping Strategies

1. **Direct Mapping in LINQ Queries** (Preferred for read operations):
   ```csharp
   var dto = await _context.Projects
       .Where(p => p.Id == id)
       .Select(p => new ProjectDto { Id = p.Id, Name = p.Name })
       .FirstOrDefaultAsync();
   ```

2. **Manual Mapping After Query** (For complex scenarios):
   ```csharp
   var entity = await _context.Projects.FindAsync(id);
   var dto = MapToDto(entity);
   ```

3. **Constructor/Factory Methods**:
   ```csharp
   public record ProjectDto
   {
       public static ProjectDto FromEntity(Project project) =>
           new ProjectDto
           {
               Id = project.Id,
               Name = project.Name,
               // ...
           };
   }
   ```

#### Enum Handling in DTOs

Domain entities may use enums (e.g., `CardSize`, `DiceType`). In DTOs, you have two options:

1. **String Representation** (Recommended for API flexibility):
   ```csharp
   public record CardDto
   {
       public required string Size { get; init; } // "Small", "Medium", "Large"
   }
   ```

2. **Keep Enum Type** (If you want strong typing in API):
   ```csharp
   public record CardDto
   {
       public required CardSize Size { get; init; }
   }
   ```

For maximum API flexibility and to avoid coupling to internal enum changes, prefer string representation.

#### Checklist Before Committing API Changes

When working on API endpoints, verify:

- [ ] No Domain entities are used as return types in endpoint handlers
- [ ] No Domain entities are used as return types in service methods
- [ ] Request DTOs are defined for POST/PUT operations
- [ ] Response DTOs are defined for all return types
- [ ] DTOs are defined in the appropriate file in the `DTOs` folder
- [ ] Services and endpoints import `Deckle.API.DTOs` namespace
- [ ] Navigation properties from Domain entities are not exposed (flattened in DTOs)
- [ ] Enums are handled appropriately (string or enum)
- [ ] The API builds without warnings

## Component Architecture

### Component Interfaces

Deckle uses interface-based component design:

- **`IComponent`** - Base interface for all components (Id, ProjectId, Name, timestamps)
- **`IEditableComponent`** - Components with front/back designs (Card, PlayerMat)
- **`IDataSourceComponent`** - Components that can link to data sources (Card, PlayerMat)

### Working with Components

**DO:** Use polymorphic methods that work with interfaces:
```csharp
public async Task<ComponentDto> SaveDesignAsync(Guid componentId, string part, string design)
{
    var component = await _context.Components.FindAsync(componentId);
    if (component is IEditableComponent editable) {
        editable.SetDesign(part, design);
    }
}
```

**DON'T:** Create separate methods for each component type:
```csharp
// ❌ Avoid this pattern
public async Task<CardDto> SaveCardDesignAsync(...)
public async Task<PlayerMatDto> SavePlayerMatDesignAsync(...)
```

**Frontend:** Use capability-based type guards:
```typescript
if (isEditableComponent(component)) {
    // Show edit UI
}
if (hasDataSource(component)) {
    // Show data source linking
}
```

### Adding New Component Types

When adding a new component type:

1. **Choose interfaces** - Implement `IEditableComponent`, `IDataSourceComponent`, or just `IComponent`
2. **Backend** - Component automatically works with generic service methods
3. **DTOs** - Add new DTO and update `ToComponentDto()` switch
4. **API** - Add create/update endpoints (type-specific), but design/datasource endpoints work automatically
5. **Frontend** - Add to type guards in `componentTypes.ts`, create type-specific form/display components
6. **Migrations** - Follow standard migration process

Components are **automatically supported** for:
- Design saving (if `IEditableComponent`)
- Data source linking (if `IDataSourceComponent`)
- Export (if `IEditableComponent`)

## Svelte Development Guide

When working with Svelte components in this project, follow the guidelines from https://svelte.dev/llms-small.txt:

### Component Philosophy
- **Single Responsibility:** A component should do one thing (render a list, handle a form, or display a layout). If a component exceeds 150 lines, it must be decomposed.
- **Open/Closed Principle:** Components must be "Open for extension, Closed for modification." Use Svelte Snippets and Props for extension rather than adding `if/else` logic inside the component for every new use case.
- **Logic Extraction:** Business logic and complex state transitions must reside in `.svelte.ts` modules (using Runes) rather than the `<script>` block of a component.

### Patterns for Extension
- **Prefer Snippets over Conditionals:** Instead of adding a `type` prop that triggers 5 different `{#if}` blocks, allow the consumer to pass in a `snippet` to define the internal UI.
- **Headless Logic:** For complex UI (tabs, modals, combos), build a "headless" state rune first, then apply it to the UI.
- **Action over Bloat:** Use Svelte Actions for DOM-specific behavior (e.g., click outside, tooltips) instead of wrapping everything in a new component.

### Refactoring Protocol
- **Analyze Before Coding:** Before adding a new feature to an existing component, evaluate if the component is becoming a "God Object."
- **Decomposition Trigger:** If you find yourself adding a third "mode" or "variant" to a component via props, you must refactor the component into a Base component and specialized sub-components.

### Hot Reload

**IMPORTANT**: SvelteKit has automatic hot reload for frontend changes.

- **DO NOT** run `npm run build` or `dotnet build` for frontend-only changes (Svelte components, TypeScript, CSS)
- Changes to files in `src/Deckle.Web/src/` are automatically hot-reloaded in the browser
- Only build when making backend changes (.NET code) or when preparing for deployment

### Core Svelte 5 Concepts

**Runes** are language keywords (prefixed with `$`) that manage reactivity.

- `$state` creates reactive variables: `let count = $state(0);`
- `$derived` computes reactive values: `let doubled = $derived(count * 2);`
- `$effect` executes when reactive state changes: `$effect(() => console.log(size));`
- `$props` accesses component inputs: `let { adjective = 'happy' } = $props();`
- `$bindable()` enables two-way data flow on specific props

### SvelteKit Project Setup

Use `npx sv create` (not deprecated `npm create svelte`). Project structure:
- `src/routes/` – pages and endpoints (filesystem router)
- `src/lib/` – shared code (`$lib` alias)
- `static/` – public assets

### Event Handling

Use `onclick={...}` instead of `on:click={...}` in Svelte 5.

### Loading Data

- `+page.js` exports `load({ fetch, params })` for universal data fetching
- `+page.server.js` exports `load()` for private data
- Use SvelteKit's `fetch` in load functions for proper SSR support

### Forms

- `+page.server.js` exports `actions: { default, namedAction }`
- Use `<form method="POST">` with `use:enhance` for progressive enhancement

For complete reference, see https://svelte.dev/llms-small.txt

## Frontend Architecture Patterns

### API Client Layer

The frontend uses a centralized API client located in `src/Deckle.Web/src/lib/api/`.

**Structure:**
- `client.ts` - Core API client with fetch wrapper
- `projects.ts` - Project-related API calls
- `components.ts` - Component-related API calls
- `dataSources.ts` - Data source API calls
- `auth.ts` - Authentication API calls
- `index.ts` - Re-exports all modules

**Usage in server-side load functions:**
```typescript
import { projectsApi } from '$lib/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const projects = await projectsApi.list(fetch);
    return { projects };
  } catch (error) {
    console.error('Failed to load projects:', error);
    return { projects: [] };
  }
};
```

**Usage in client-side components:**
```typescript
import { projectsApi, ApiError } from '$lib/api';

async function createProject() {
  try {
    await projectsApi.create({ name: projectName, description });
    // Handle success
  } catch (error) {
    if (error instanceof ApiError) {
      // Handle API error with error.status and error.message
    }
  }
}
```

**Important:** Always pass SvelteKit's enhanced `fetch` function to API calls in server-side load functions.

### Shared Types

TypeScript type definitions are centralized in `src/Deckle.Web/src/lib/types/`.

**Structure:**
- `user.ts` - User types
- `project.ts` - Project and DTO types
- `component.ts` - Component types (Card, Dice, GameComponent)
- `dataSource.ts` - Data source types
- `index.ts` - Re-exports all types

**Usage:**
```typescript
import type { Project, CreateProjectDto } from '$lib/types';
```

### Shared Constants

Configuration constants are centralized in `src/Deckle.Web/src/lib/constants/`.

**Structure:**
- `components.ts` - Card sizes, dice types, styles, and colors
- `index.ts` - Re-exports all constants

**Usage:**
```typescript
import { CARD_SIZES, DICE_COLORS } from '$lib/constants';
```

### Component Organization

**Reusable Components:** `src/Deckle.Web/src/lib/components/`
- General-purpose components used across the application
- Examples: Card, Dialog, Sidebar, TopBar

**Page-Specific Components:** `src/Deckle.Web/src/routes/[route]/_components/`
- Components specific to a particular page or feature
- Use underscore prefix `_components/` to prevent SvelteKit from treating them as routes
- Examples: ComponentCard, DiceConfigForm, CardConfigForm

### Error Handling

**API Errors:**
```typescript
import { ApiError } from '$lib/api';

try {
  await someApiCall();
} catch (err) {
  if (err instanceof ApiError) {
    // Handle API error: err.status, err.message, err.response
  } else {
    // Handle other errors
  }
}
```

**SvelteKit Load Errors:**
```typescript
import { error } from '@sveltejs/kit';
import { ApiError } from '$lib/api';

export const load = async ({ fetch }) => {
  try {
    return await apiCall(fetch);
  } catch (err) {
    if (err instanceof ApiError) {
      throw error(err.status, err.message);
    }
    throw error(500, 'Internal server error');
  }
};
```

### Adding New API Endpoints

1. Add types to appropriate file in `src/Deckle.Web/src/lib/types/`
2. Add API function to appropriate module in `src/Deckle.Web/src/lib/api/`
3. Use the API function in components or load functions

Example:
```typescript
// In lib/api/projects.ts
export const projectsApi = {
  update: (id: string, data: UpdateProjectDto, fetchFn?: typeof fetch) =>
    api.put<Project>(`/projects/${id}`, data, undefined, fetchFn),
};
```

## Notes

- This is an Aspire-based application
- The API uses Scalar for OpenAPI documentation
- Follow standard .NET coding conventions
