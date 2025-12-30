using Deckle.API.DTOs;
using Deckle.API.Endpoints;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using System.Security.Claims;
using System.Text.Json.Serialization;

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

    options.AccessType = "offline";
    options.SaveTokens = true;

    options.Events.OnCreatingTicket = async context =>
    {
        var userService = context.HttpContext.RequestServices.GetRequiredService<UserService>();

        // Extract user info from Google's userinfo endpoint response
        // The user info is in context.User (JsonElement), not context.Principal
        var googleId = context.User.GetProperty("sub").GetString();
        var email = context.User.GetProperty("email").GetString();

        // Optional fields - use TryGetProperty to avoid exceptions
        string? name = null;
        if (context.User.TryGetProperty("name", out var nameElement))
        {
            name = nameElement.GetString();
        }

        string? givenName = null;
        if (context.User.TryGetProperty("given_name", out var givenNameElement))
        {
            givenName = givenNameElement.GetString();
        }

        string? familyName = null;
        if (context.User.TryGetProperty("family_name", out var familyNameElement))
        {
            familyName = familyNameElement.GetString();
        }

        string? picture = null;
        if (context.User.TryGetProperty("picture", out var pictureElement))
        {
            picture = pictureElement.GetString();
        }

        string? locale = null;
        if (context.User.TryGetProperty("locale", out var localeElement))
        {
            locale = localeElement.GetString();
        }

        if (string.IsNullOrEmpty(googleId) || string.IsNullOrEmpty(email))
        {
            throw new InvalidOperationException("Failed to retrieve user information from Google");
        }

        // Create or update user
        var userInfo = new GoogleUserInfo(googleId, email, name, givenName, familyName, picture, locale);
        var user = await userService.CreateOrUpdateUserAsync(userInfo);

        // Add custom claims to the identity
        var identity = context.Principal?.Identity as ClaimsIdentity;
        if (identity != null)
        {
            // Add user_id claim
            identity.AddClaim(new Claim("user_id", user.Id.ToString()));

            // Add email claim if not present
            if (!string.IsNullOrEmpty(email) && !identity.HasClaim(c => c.Type == ClaimTypes.Email))
            {
                identity.AddClaim(new Claim(ClaimTypes.Email, email));
            }

            // Add name claim if not present
            if (!string.IsNullOrEmpty(name) && !identity.HasClaim(c => c.Type == ClaimTypes.Name))
            {
                identity.AddClaim(new Claim(ClaimTypes.Name, name));
            }

            // Add picture claim if not present
            if (!string.IsNullOrEmpty(picture) && !identity.HasClaim(c => c.Type == "picture"))
            {
                identity.AddClaim(new Claim("picture", picture));
            }
        }
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

builder.Services.AddOpenApi();

// Configure JSON options to accept string enum values
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Register HttpClient for GoogleSheetsService
builder.Services.AddHttpClient();

// Register application services
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ProjectService>();
builder.Services.AddScoped<GoogleSheetsService>();
builder.Services.AddScoped<DataSourceService>();
builder.Services.AddScoped<ComponentService>();

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

// Map endpoint groups
app.MapAuthEndpoints();
app.MapProjectEndpoints();
app.MapDataSourceEndpoints();
app.MapComponentEndpoints();

app.Run();
