var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.Deckle_API>("api");

builder.Build().Run();
