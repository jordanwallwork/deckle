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
- `Deckle.ServiceDefaults`: Shared service configuration and defaults

## Notes

- This is an Aspire-based application
- The API uses Scalar for OpenAPI documentation
- Follow standard .NET coding conventions
