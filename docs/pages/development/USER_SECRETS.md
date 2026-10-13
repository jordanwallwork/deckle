---
title: Local User Secrets
layout: libdoc_page.liquid
permalink: development/user-secrets/index.html
eleventyNavigation:
    key: User Secrets
    parent: Development
date: 2026-01-16
---

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
 - LocalFileStorage (optional alternative to CloudflareR2):
   - Directory

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

**Note:** File uploads need either the R2 credentials or local file storage (see below). You can obtain R2 credentials from your Cloudflare dashboard under R2 → Manage R2 API Tokens.

## Local file storage (alternative to R2)

To store uploaded files on your own filesystem instead of in R2, set a storage directory:

```bash
cd src/Deckle.API
dotnet user-secrets set "LocalFileStorage:Directory" "C:\deckle-storage"
```

When `LocalFileStorage:Directory` is set, the API uses local storage and ignores the `CloudflareR2` settings. A relative path is resolved against the `Deckle.API` project directory. Files are saved under `<directory>/projects/{projectId}/files/{fileId}/`.

Uploads and downloads go through the API's `/storage` endpoint, which is mapped only when local storage is enabled. Like R2 presigned URLs, its URLs carry a signed token that expires after 15 minutes. You can change this with `LocalFileStorage:UrlExpirationMinutes`.

To switch back to R2, remove the setting:

```bash
dotnet user-secrets remove "LocalFileStorage:Directory"
```