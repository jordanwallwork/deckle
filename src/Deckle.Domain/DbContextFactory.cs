using Deckle.Domain.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using System;
using System.Collections.Generic;
using System.Text;

namespace Deckle.Domain;

public class MyDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=52261;Database=deckledb;Username=postgres;Password=eajr97K_Cgk8CMDkRj(vcc");

        return new AppDbContext(optionsBuilder.Options);
    }
}