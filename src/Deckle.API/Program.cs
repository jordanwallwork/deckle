using Deckle.API.Extensions;
using Deckle.Domain.Data;

var builder = WebApplication.CreateBuilder(args);

// Aspire service defaults
builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<AppDbContext>("deckledb");

// Authentication and authorization
builder.Services.AddDeckleAuthentication(builder.Configuration, builder.Environment);
builder.Services.AddDeckleAuthorization();

// CORS
builder.Services.AddDeckleCors(builder.Configuration, builder.Environment);

// API services (OpenAPI, problem details, JSON options)
builder.Services.AddDeckleApiServices();

// Rate limiting
builder.Services.AddDeckleRateLimiting();

// Infrastructure (HttpClient, email, R2 storage, background services)
builder.Services.AddDeckleInfrastructure(builder.Configuration);

// Application services
builder.Services.AddDeckleApplicationServices();

// Exception tracking
builder.Services.AddExceptionlessIfConfigured(builder.Configuration);

var app = builder.Build();

// Configure middleware pipeline
await app.ConfigurePipelineAsync();

// Map all endpoints
app.MapDeckleEndpoints();

await app.RunAsync();
