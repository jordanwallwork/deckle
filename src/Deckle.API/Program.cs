using Deckle.API.DTOs;
using Deckle.API.Endpoints;
using Deckle.API.Services;
using Deckle.Domain.Data;
using Deckle.Email;
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
        options.Cookie.Domain = null; // Don't set domain to allow cross-port cookies on localhost
    }
    else
    {
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.None;

        // In production, set cookie domain to allow sharing between API and Web subdomains
        // Railway domains use pattern: {service}.up.railway.app
        // To share cookies, we need a shared parent domain
        // If using custom domain (api.yourdomain.com and app.yourdomain.com), set to .yourdomain.com
        var cookieDomain = builder.Configuration["CookieDomain"];
        if (!string.IsNullOrWhiteSpace(cookieDomain))
        {
            options.Cookie.Domain = cookieDomain;
            builder.Configuration.GetSection("Logging").GetChildren().FirstOrDefault()?.GetSection("LogLevel").GetChildren().FirstOrDefault();
            Console.WriteLine($"Cookie domain set to: {cookieDomain}");
        }
        else
        {
            options.Cookie.Domain = null;
            Console.WriteLine("WARNING: CookieDomain not configured. Cookies will not be shared between API and Web domains on Railway.");
        }
    }

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

            // Add username claim if user has one set
            if (!string.IsNullOrEmpty(user.Username) && !identity.HasClaim(c => c.Type == "username"))
            {
                identity.AddClaim(new Claim("username", user.Username));
            }
        }
    };
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var frontendUrl = builder.Configuration["FrontendUrl"];

        policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin))
                    return false;

                var uri = new Uri(origin);

                // Allow localhost on any port during development
                if (builder.Environment.IsDevelopment() && uri.Host == "localhost")
                    return true;

                // In production, FrontendUrl must be configured
                if (string.IsNullOrWhiteSpace(frontendUrl))
                {
                    if (!builder.Environment.IsDevelopment())
                    {
                        Console.WriteLine("WARNING: FrontendUrl not configured in production. CORS will block all requests.");
                        return false;
                    }
                    // Development fallback
                    return origin == "http://localhost:5173" || origin == "https://localhost:5173";
                }

                // Allow the configured frontend URL (with and without trailing slash)
                var normalizedFrontendUrl = frontendUrl.TrimEnd('/');
                var normalizedOrigin = origin.TrimEnd('/');

                return normalizedOrigin == normalizedFrontendUrl ||
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

// Register email services
builder.Services.AddEmailServices(builder.Configuration);

// Configure Cloudflare R2
builder.Services.Configure<CloudflareR2Options>(
    builder.Configuration.GetSection("CloudflareR2"));
builder.Services.AddSingleton<CloudflareR2Service>();

// Register background services
builder.Services.AddHostedService<FileCleanupService>();

// Register application services
builder.Services.AddScoped<ProjectAuthorizationService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<ProjectService>();
builder.Services.AddScoped<GoogleSheetsService>();
builder.Services.AddScoped<DataSourceService>();
builder.Services.AddScoped<ComponentService>();
builder.Services.AddScoped<FileService>();
builder.Services.AddScoped<FileDirectoryService>();

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
app.MapVersionEndpoints();
app.MapAuthEndpoints();
app.MapProjectEndpoints();
app.MapDataSourceEndpoints();
app.MapComponentEndpoints();
app.MapFileEndpoints();
app.MapFileDirectoryEndpoints();

app.Run();
