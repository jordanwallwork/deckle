var builder = DistributedApplication.CreateBuilder(args);

// Add PostgreSQL with pgAdmin and persistent data volume
var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent)
    .WithPgAdmin()
    .AddDatabase("deckledb");

var web = builder.AddNpmApp("web", "../Deckle.Web")
    .WithHttpEndpoint(port: 5173, env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

var api = builder.AddProject<Projects.Deckle_API>("api")
    .WithReference(postgres)
    .WithReference(web)
    .WithEnvironment("FrontendUrl", web.GetEndpoint("http"))
    .WaitFor(postgres);

web.WithReference(api)
    .WithEnvironment("PUBLIC_API_URL", api.GetEndpoint("http"));

builder.Build().Run();
