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
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.ExpireTimeSpan = TimeSpan.FromDays(30);
    options.SlidingExpiration = true;
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
        policy.WithOrigins(frontendUrl, "http://localhost:5173", "https://localhost:5173")
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

app.UseHttpsRedirection();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapDefaultEndpoints();

// Authentication endpoints
app.MapGet("/auth/login", () =>
{
    var frontendUrl = app.Configuration["FrontendUrl"] ?? "http://localhost:5173";
    return Results.Challenge(
        new AuthenticationProperties { RedirectUri = frontendUrl },
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
