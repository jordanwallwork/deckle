using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.AddNpgsqlDbContext<AppDbContext>("deckledb");

// Add authentication services
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.Name = "Deckle.Auth";
    options.Cookie.HttpOnly = true;
    if (builder.Environment.IsDevelopment())
    {
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.Cookie.SameSite = SameSiteMode.Lax;
    }
    else
    {
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.None;
    }
    options.Cookie.Domain = null; // Don't set domain to allow cross-port cookies on localhost
    options.ExpireTimeSpan = TimeSpan.FromDays(30);
    options.SlidingExpiration = true;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = 401;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = 403;
        return Task.CompletedTask;
    };
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"] ?? throw new InvalidOperationException("Google ClientId not configured");
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] ?? throw new InvalidOperationException("Google ClientSecret not configured");

    options.Scope.Add("profile");
    options.Scope.Add("email");

    options.SaveTokens = true;

    options.Events.OnCreatingTicket = async context =>
    {
        var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();

        var googleId = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = context.Principal?.FindFirst(ClaimTypes.Email)?.Value;
        var name = context.Principal?.FindFirst(ClaimTypes.Name)?.Value;
        var givenName = context.Principal?.FindFirst(ClaimTypes.GivenName)?.Value;
        var familyName = context.Principal?.FindFirst(ClaimTypes.Surname)?.Value;
        var picture = context.Principal?.FindFirst("picture")?.Value;
        var locale = context.Principal?.FindFirst("locale")?.Value;

        if (string.IsNullOrEmpty(googleId) || string.IsNullOrEmpty(email))
        {
            throw new InvalidOperationException("Failed to retrieve user information from Google");
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                GoogleId = googleId,
                Email = email,
                Name = name,
                GivenName = givenName,
                FamilyName = familyName,
                PictureUrl = picture,
                Locale = locale,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };

            dbContext.Users.Add(user);
        }
        else
        {
            user.Email = email;
            user.Name = name;
            user.GivenName = givenName;
            user.FamilyName = familyName;
            user.PictureUrl = picture;
            user.Locale = locale;
            user.UpdatedAt = DateTime.UtcNow;
            user.LastLoginAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync();

        var identity = context.Principal?.Identity as ClaimsIdentity;
        identity?.AddClaim(new Claim("user_id", user.Id.ToString()));
    };
});

builder.Services.AddAuthorization();

var frontendUrl = builder.Configuration["FrontendUrl"] ?? "http://localhost:5173";

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin))
                    return false;

                var uri = new Uri(origin);

                // Allow localhost on any port during development
                if (builder.Environment.IsDevelopment() && uri.Host == "localhost")
                    return true;

                // Allow the configured frontend URL
                return origin == frontendUrl ||
                       origin == "http://localhost:5173" ||
                       origin == "https://localhost:5173";
            })
            .AllowCredentials()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Apply database migrations
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapDefaultEndpoints();

// Authentication endpoints
app.MapGet("/auth/login", () =>
{
    var frontendUrl = app.Configuration["FrontendUrl"] ?? "http://localhost:5173";
    return Results.Challenge(
        new AuthenticationProperties { RedirectUri = $"{frontendUrl}/projects" },
        new[] { GoogleDefaults.AuthenticationScheme }
    );
})
.AllowAnonymous()
.WithName("Login")
.WithTags("Authentication");

app.MapPost("/auth/logout", async (HttpContext context) =>
{
    await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok(new { message = "Logged out successfully" });
})
.RequireAuthorization()
.WithName("Logout")
.WithTags("Authentication");

app.MapGet("/auth/me", (ClaimsPrincipal user) =>
{
    if (!user.Identity?.IsAuthenticated ?? true)
    {
        return Results.Unauthorized();
    }

    var userId = user.FindFirst("user_id")?.Value;
    var email = user.FindFirst(ClaimTypes.Email)?.Value;
    var name = user.FindFirst(ClaimTypes.Name)?.Value;
    var picture = user.FindFirst("picture")?.Value;

    return Results.Ok(new
    {
        id = userId,
        email,
        name,
        picture
    });
})
.RequireAuthorization()
.WithName("GetCurrentUser")
.WithTags("Authentication");

// Project endpoints
app.MapGet("/projects", async (ClaimsPrincipal user, AppDbContext dbContext) =>
{
    if (!user.Identity?.IsAuthenticated ?? true)
    {
        return Results.Unauthorized();
    }

    var userIdString = user.FindFirst("user_id")?.Value;
    if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
    {
        return Results.Unauthorized();
    }

    var projects = await dbContext.UserProjects
        .Where(up => up.UserId == userId)
        .Include(up => up.Project)
        .Select(up => new
        {
            id = up.Project.Id,
            name = up.Project.Name,
            description = up.Project.Description,
            createdAt = up.Project.CreatedAt,
            updatedAt = up.Project.UpdatedAt,
            role = up.Role.ToString()
        })
        .ToListAsync();

    return Results.Ok(projects);
})
.RequireAuthorization()
.WithName("GetProjects")
.WithTags("Projects");

app.MapPost("/projects", async (ClaimsPrincipal user, AppDbContext dbContext, CreateProjectRequest request) =>
{
    if (!user.Identity?.IsAuthenticated ?? true)
    {
        return Results.Unauthorized();
    }

    var userIdString = user.FindFirst("user_id")?.Value;
    if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
    {
        return Results.Unauthorized();
    }

    var project = new Project
    {
        Id = Guid.NewGuid(),
        Name = request.Name,
        Description = request.Description,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    dbContext.Projects.Add(project);

    var userProject = new UserProject
    {
        UserId = userId,
        ProjectId = project.Id,
        Role = ProjectRole.Owner,
        JoinedAt = DateTime.UtcNow
    };

    dbContext.UserProjects.Add(userProject);

    await dbContext.SaveChangesAsync();

    return Results.Created($"/projects/{project.Id}", new
    {
        id = project.Id,
        name = project.Name,
        description = project.Description,
        createdAt = project.CreatedAt,
        updatedAt = project.UpdatedAt,
        role = userProject.Role.ToString()
    });
})
.RequireAuthorization()
.WithName("CreateProject")
.WithTags("Projects");

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast")
.WithTags("Weather");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

record CreateProjectRequest(string Name, string? Description);
