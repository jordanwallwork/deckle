var builder = DistributedApplication.CreateBuilder(args);

// Add PostgreSQL with pgAdmin
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .AddDatabase("deckledb");

var web = builder.AddNpmApp("web", "../Deckle.Web")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

var api = builder.AddProject<Projects.Deckle_API>("api")
    .WithReference(postgres)
    .WithReference(web)
    .WithEnvironment("FrontendUrl", web.GetEndpoint("http"))
    .WaitFor(postgres);

web.WithReference(api);

builder.Build().Run();
