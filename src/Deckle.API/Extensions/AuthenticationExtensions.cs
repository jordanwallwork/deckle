using System.Security.Claims;
using Deckle.API.DTOs;
using Deckle.API.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.OAuth;

namespace Deckle.API.Extensions;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddDeckleAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        services.AddAuthentication(options =>
        {
            options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
        })
        .AddCookie(options => ConfigureCookieOptions(options, configuration, environment))
        .AddGoogle(options => ConfigureGoogleOptions(options, configuration));

        return services;
    }

    public static IServiceCollection AddDeckleAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy =>
                policy.RequireRole("Administrator"));
        });

        return services;
    }

    private static void ConfigureCookieOptions(
        CookieAuthenticationOptions options,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        options.Cookie.Name = "Deckle.Auth";
        options.Cookie.HttpOnly = true;

        if (environment.IsDevelopment())
        {
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.Domain = null;
        }
        else
        {
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.None;
            ConfigureProductionCookieDomain(options, configuration);
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
    }

    private static void ConfigureProductionCookieDomain(
        CookieAuthenticationOptions options,
        IConfiguration configuration)
    {
        var cookieDomain = configuration["CookieDomain"];

        if (!string.IsNullOrWhiteSpace(cookieDomain))
        {
            options.Cookie.Domain = cookieDomain;
            Console.WriteLine($"Cookie domain set to: {cookieDomain}");
        }
        else
        {
            options.Cookie.Domain = null;
            Console.WriteLine("WARNING: CookieDomain not configured. Cookies will not be shared between API and Web domains on Railway.");
        }
    }

    private static void ConfigureGoogleOptions(GoogleOptions options, IConfiguration configuration)
    {
        options.ClientId = configuration["Authentication:Google:ClientId"]
            ?? throw new InvalidOperationException("Google ClientId not configured");
        options.ClientSecret = configuration["Authentication:Google:ClientSecret"]
            ?? throw new InvalidOperationException("Google ClientSecret not configured");

        options.Scope.Add("profile");
        options.Scope.Add("email");

        options.AccessType = "offline";
        options.SaveTokens = true;

        options.Events.OnCreatingTicket = HandleGoogleTicketCreation;
    }

    private static async Task HandleGoogleTicketCreation(OAuthCreatingTicketContext context)
    {
        var userService = context.HttpContext.RequestServices.GetRequiredService<IUserService>();

        var googleId = context.User.GetProperty("sub").GetString();
        var email = context.User.GetProperty("email").GetString();

        var name = GetOptionalProperty(context.User, "name");
        var givenName = GetOptionalProperty(context.User, "given_name");
        var familyName = GetOptionalProperty(context.User, "family_name");
        var picture = GetOptionalProperty(context.User, "picture");
        var locale = GetOptionalProperty(context.User, "locale");

        if (string.IsNullOrEmpty(googleId) || string.IsNullOrEmpty(email))
        {
            throw new InvalidOperationException("Failed to retrieve user information from Google");
        }

        var userInfo = new GoogleUserInfo(googleId, email, name, givenName, familyName, picture, locale);
        var user = await userService.CreateOrUpdateUserAsync(userInfo);

        AddUserClaimsToIdentity(context.Principal?.Identity as ClaimsIdentity, user, email, name, picture);
    }

    private static string? GetOptionalProperty(System.Text.Json.JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value) ? value.GetString() : null;
    }

    private static void AddUserClaimsToIdentity(
        ClaimsIdentity? identity,
        Deckle.Domain.Entities.User user,
        string email,
        string? name,
        string? picture)
    {
        if (identity == null) return;

        identity.AddClaim(new Claim("user_id", user.Id.ToString()));

        if (!string.IsNullOrEmpty(email) && !identity.HasClaim(c => c.Type == ClaimTypes.Email))
        {
            identity.AddClaim(new Claim(ClaimTypes.Email, email));
        }

        if (!string.IsNullOrEmpty(name) && !identity.HasClaim(c => c.Type == ClaimTypes.Name))
        {
            identity.AddClaim(new Claim(ClaimTypes.Name, name));
        }

        if (!string.IsNullOrEmpty(picture) && !identity.HasClaim(c => c.Type == "picture"))
        {
            identity.AddClaim(new Claim("picture", picture));
        }

        if (!string.IsNullOrEmpty(user.Username) && !identity.HasClaim(c => c.Type == "username"))
        {
            identity.AddClaim(new Claim("username", user.Username));
        }

        identity.AddClaim(new Claim(ClaimTypes.Role, user.Role.ToString()));
    }
}
