var builder = DistributedApplication.CreateBuilder(args);

// Add a Docker Compose environment
var compose = builder.AddDockerComposeEnvironment("compose");

// Add PostgreSQL with pgAdmin and persistent data volume
var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent)
    .PublishAsDockerComposeService((resource, service) =>
    {
        service.Name = "db-server";
    });

// Configure pgAdmin with health check
postgres.WithPgAdmin(configureContainer: container => container
    .WithHttpHealthCheck("/browser/"))
    .WithLifetime(ContainerLifetime.Persistent);

var database = postgres.AddDatabase("deckledb");

var web = builder.AddNpmApp("web", "../Deckle.Web")
    .WithHttpEndpoint(port: 5173, env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile()
    .PublishAsDockerComposeService((resource, service) =>
    {
        service.Name = "web";
    });

var api = builder.AddProject<Projects.Deckle_API>("api")
    .WithReference(database)
    .WithReference(web)
    .WithEnvironment("FrontendUrl", web.GetEndpoint("http"))
    .WaitFor(database)
    .PublishAsDockerComposeService((resource, service) =>
    {
        service.Name = "api";
    });

web.WithReference(api)
    .WithEnvironment("PUBLIC_API_URL", api.GetEndpoint("http"));

builder.Build().Run();
