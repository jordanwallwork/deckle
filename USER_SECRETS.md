# User Secrets

In order to run the project properly, configure the following user secrets:

## Deckle.Api

 - Authentication:
   - Google:
     - ClientId
	 - ClientSecret
 - Email
  - SmtpHost
  - SmtpPort
  - UseSsl
  - Username
  - Password
  - FromAddress
  - FromName
 - CloudflareR2:
   - AccountId
   - BucketName
   - AccessKeyId
   - SecretAccessKey

## Setting User Secrets

Configure user secrets using the .NET user secrets manager:

```bash
cd src/Deckle.API

# Google Authentication
dotnet user-secrets set "Authentication:Google:ClientId" "YOUR_CLIENT_ID"
dotnet user-secrets set "Authentication:Google:ClientSecret" "YOUR_CLIENT_SECRET"

# Email Configuration
dotnet user-secrets set "Email:SmtpHost" "smtp.example.com"
dotnet user-secrets set "Email:SmtpPort" "587"
dotnet user-secrets set "Email:UseSsl" "true"
dotnet user-secrets set "Email:Username" "your-email@example.com"
dotnet user-secrets set "Email:Password" "your-password"
dotnet user-secrets set "Email:FromAddress" "noreply@example.com"
dotnet user-secrets set "Email:FromName" "Deckle"

# Cloudflare R2 Storage
dotnet user-secrets set "CloudflareR2:AccountId" "YOUR_ACCOUNT_ID"
dotnet user-secrets set "CloudflareR2:BucketName" "deckle-images-dev"
dotnet user-secrets set "CloudflareR2:AccessKeyId" "YOUR_ACCESS_KEY_ID"
dotnet user-secrets set "CloudflareR2:SecretAccessKey" "YOUR_SECRET_ACCESS_KEY"
```

**Note:** The R2 credentials are required for file upload functionality. You can obtain these from your Cloudflare dashboard under R2 → Manage R2 API Tokens.