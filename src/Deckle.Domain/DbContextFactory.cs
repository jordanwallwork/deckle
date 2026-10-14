using Deckle.Domain.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using System;
using System.Collections.Generic;
using System.Text;

namespace Deckle.Domain;

/// <summary>
/// Used by the EF Core CLI. Adding migrations doesn't connect to the database, so the fallback has no
/// credentials; set ConnectionStrings__deckledb to run commands that do, such as `dotnet ef database update`.
/// </summary>
public class MyDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    private const string FallbackConnectionString = "Host=localhost;Database=deckledb";

    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__deckledb")
            ?? FallbackConnectionString;

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}