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

1. **Build Successfully**: Ensure the entire solution builds without errors
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

## Notes

- This is an Aspire-based application
- The API uses Scalar for OpenAPI documentation
- Follow standard .NET coding conventions
