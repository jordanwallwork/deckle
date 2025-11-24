# Google OIDC Authentication Setup

This document describes the Google OIDC authentication implementation for Deckle.

## Architecture

The authentication system consists of:

1. **Deckle.Domain** - Contains the `User` entity and `AppDbContext` for database operations
2. **Deckle.API** - ASP.NET Core Minimal API providing authentication endpoints alongside other API endpoints
3. **PostgreSQL Database** - Stores user information
4. **pgAdmin** - Database management tool (optional)

## Database Schema

The `User` entity captures the following information from Google authentication:

- `Id` (Guid) - Primary key
- `GoogleId` (string) - Google's unique identifier for the user
- `Email` (string) - User's email address
- `Name` (string) - Full name
- `GivenName` (string) - First name
- `FamilyName` (string) - Last name
- `PictureUrl` (string) - Profile picture URL
- `Locale` (string) - User's locale preference
- `CreatedAt` (DateTime) - When the user first registered
- `UpdatedAt` (DateTime) - Last time user information was updated
- `LastLoginAt` (DateTime) - Last successful login

## Configuration

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen
6. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://localhost:PORT/signin-google` (replace PORT with your auth service port from Aspire)

### 2. Configure User Secrets

Set your Google OAuth credentials using the .NET user secrets manager:

```bash
cd src/Deckle.API
dotnet user-secrets set "Authentication:Google:ClientId" "YOUR_CLIENT_ID"
dotnet user-secrets set "Authentication:Google:ClientSecret" "YOUR_CLIENT_SECRET"
```

The user secrets are already initialized for the Deckle.API project.

## API Endpoints

The Deckle.API service provides the following authentication endpoints:

### `GET /auth/login`
Initiates the Google OAuth flow. Redirects the user to Google's login page.

**Example:**
```
GET https://localhost:PORT/auth/login
```

### `POST /auth/logout`
Logs out the current user by clearing their authentication cookie.

**Authorization:** Required

**Example:**
```
POST https://localhost:PORT/auth/logout
```

### `GET /auth/me`
Returns information about the currently authenticated user.

**Authorization:** Required

**Response:**
```json
{
  "id": "guid",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://..."
}
```

## Authentication Flow

1. User clicks "Login with Google" button in the frontend
2. Frontend redirects to `/auth/login`
3. User is redirected to Google's OAuth consent screen
4. After successful authentication, Google redirects back to the app
5. The `OnCreatingTicket` event handler:
   - Retrieves user information from Google
   - Checks if the user exists in the database (by GoogleId)
   - Creates a new user record or updates existing user information
   - Adds the user's database ID to the claims
6. An authentication cookie is set
7. User is redirected to the application

## Database Migrations

The initial migration has been created. When you run the Deckle.API service, it will automatically apply migrations on startup.

To create additional migrations:

```bash
cd src/Deckle.Domain
dotnet ef migrations add MigrationName --startup-project ../Deckle.API/Deckle.API.csproj
```

## Running the Application

Start the Aspire AppHost:

```bash
cd src/Deckle.AppHost
dotnet run
```

This will start:
- PostgreSQL database
- pgAdmin (accessible via the Aspire dashboard)
- Deckle.API service (includes authentication endpoints)
- Deckle.Web frontend

Access the Aspire dashboard to see all service URLs.

## CORS Configuration

The API service is configured to accept requests from:
- `http://localhost:5173`
- `https://localhost:5173`
- The frontend URL configured via the `FrontendUrl` environment variable

If your frontend runs on a different port, update the CORS configuration in `Deckle.API/Program.cs`.

## Security Features

- Cookies are HTTP-only to prevent XSS attacks
- Secure cookie policy (HTTPS only)
- SameSite=Lax to protect against CSRF
- 30-day cookie expiration with sliding expiration
- Credentials stored in user secrets (not in source control)
