# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY ["Deckle.MCP/Deckle.MCP.csproj", "Deckle.MCP/"]
COPY ["Deckle.Domain/Deckle.Domain.csproj", "Deckle.Domain/"]
COPY ["Deckle.ServiceDefaults/Deckle.ServiceDefaults.csproj", "Deckle.ServiceDefaults/"]
COPY ["Deckle.Utils/Deckle.Utils.csproj", "Deckle.Utils/"]

RUN dotnet restore "Deckle.MCP/Deckle.MCP.csproj"

COPY . .

WORKDIR "/src/Deckle.MCP"
RUN dotnet build "Deckle.MCP.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "Deckle.MCP.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app
COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Deckle.MCP.dll"]
