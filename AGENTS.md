# Agent Development Guide

This document provides instructions for AI agents working on the Deckle project.

## Running the Project

### Prerequisites
- .NET 9.0 SDK or later
- Visual Studio 2022 or Visual Studio Code with C# Dev Kit

### Running the Application

From the solution root directory:

```bash
dotnet restore
dotnet build
dotnet run --project Deckle.AppHost
```

The AppHost will start the Aspire application and launch the dashboard in your browser.

### Building the Solution

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

3. **Tests Pass**: All tests must pass (when tests are present)
   ```bash
   dotnet test
   ```

### Database Migrations

When making changes to the database schema (entity models in `Deckle.Domain`):

1. **Generate Migration**: Use Entity Framework Core tools to create a migration
   ```bash
   dotnet ef migrations add <MigrationName> --project src/Deckle.Domain --startup-project src/Deckle.API
   ```

2. **If API is Running**: Use the `--no-build` flag to avoid file locking issues
   ```bash
   dotnet ef migrations add <MigrationName> --project src/Deckle.Domain --startup-project src/Deckle.API --no-build
   ```

3. **Migration Naming**: Use descriptive PascalCase names (e.g., `AddProjectEntities`, `UpdateUserTable`)

4. **Review Migration**: Always review the generated migration file before committing
   - Verify the `Up()` method creates the correct schema changes
   - Ensure the `Down()` method properly reverses the changes
   - Check for any data loss or breaking changes

5. **Apply Migration**: The migration will be applied automatically on application startup, or manually with:
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

## Svelte Development Guide

When working with Svelte components in this project, follow the guidelines from https://svelte.dev/llms-small.txt:

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
