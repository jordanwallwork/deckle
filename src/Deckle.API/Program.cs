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

        // Check if this is a Google Sheets auth flow
        context.Properties.Items.TryGetValue("loginType", out var loginType);
        var isGoogleSheetsAuth = loginType == "google-sheets";

        // Extract user info from Google
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

        // Create or update user
        var userInfo = new GoogleUserInfo(googleId, email, name, givenName, familyName, picture, locale);
        var user = await userService.CreateOrUpdateUserAsync(userInfo);

        // Add user_id claim
        var identity = context.Principal?.Identity as ClaimsIdentity;
        identity?.AddClaim(new Claim("user_id", user.Id.ToString()));

        // If this is a Google Sheets auth flow, save the tokens
        if (isGoogleSheetsAuth)
        {
            // Extract tokens
            var accessToken = context.AccessToken;
            var refreshToken = context.RefreshToken;
            var tokenType = context.TokenType ?? "Bearer";
            var expiresAt = context.ExpiresIn.HasValue
                ? DateTime.UtcNow.AddSeconds(context.ExpiresIn.Value.TotalSeconds)
                : DateTime.UtcNow.AddHours(1);

            // Get the scope from the properties
            context.Properties.Items.TryGetValue("scope", out var scope);
            scope ??= "";

            if (!string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(refreshToken))
            {
                await userService.SaveOrUpdateGoogleCredentialAsync(
                    user.Id,
                    accessToken,
                    refreshToken,
                    tokenType,
                    expiresAt,
                    scope
                );
            }

            // Preserve the returnUrl for the callback
            if (context.Properties.Items.TryGetValue("returnUrl", out var returnUrl) && !string.IsNullOrEmpty(returnUrl))
            {
                context.Properties.Items["returnUrl"] = returnUrl;
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
app.MapGoogleSheetsAuthEndpoints();
app.MapComponentEndpoints();

app.Run();
