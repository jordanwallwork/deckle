# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

# Copy solution and project files
COPY ["Deckle.API/Deckle.API.csproj", "Deckle.API/"]
COPY ["Deckle.Domain/Deckle.Domain.csproj", "Deckle.Domain/"]
COPY ["Deckle.Email/Deckle.Email.csproj", "Deckle.Email/"]
COPY ["Deckle.ServiceDefaults/Deckle.ServiceDefaults.csproj", "Deckle.ServiceDefaults/"]

# Restore dependencies
RUN dotnet restore "Deckle.API/Deckle.API.csproj"

# Copy all source files
COPY . .

# Build the application
WORKDIR "/src/Deckle.API"
RUN dotnet build "Deckle.API.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "Deckle.API.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

# Copy published application
COPY --from=publish /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Run as the image's built-in non-root user (port 8080 needs no privileges)
USER $APP_UID

# Start the application
ENTRYPOINT ["dotnet", "Deckle.API.dll"]
