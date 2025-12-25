# API Development Guidelines

This document contains guidelines and best practices for developing the Deckle API.

## DTOs (Data Transfer Objects)

**CRITICAL RULE**: API endpoints must NEVER expose Domain entities directly. Always use DTOs for API requests and responses.

### Why DTOs are Required

1. **Separation of Concerns**: Domain entities are for database modeling, not API contracts
2. **API Stability**: Changes to domain models won't break API consumers
3. **Security**: Prevents over-posting attacks and accidental exposure of sensitive data
4. **Flexibility**: API can expose different data structures than the database schema
5. **Serialization Control**: Domain entities may have circular references or navigation properties that cause serialization issues

### Where to Place DTOs

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

### DTO Naming Conventions

- **Response DTOs**: Use descriptive names ending with `Dto` (e.g., `ProjectDto`, `ComponentDto`)
- **Request DTOs**: Use descriptive names ending with `Request` (e.g., `CreateProjectRequest`, `UpdateCardRequest`)
- **Simple DTOs**: For simple request/response objects, you can use records for conciseness

### Good Example (ProjectService)

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

### Bad Example (ComponentService)

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

### Mapping Strategies

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

### Enum Handling in DTOs

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

### Checklist Before Committing API Changes

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
