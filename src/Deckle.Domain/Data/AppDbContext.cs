using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.Domain.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.HasIndex(u => u.GoogleId)
                .IsUnique();

            entity.HasIndex(u => u.Email);

            entity.Property(u => u.GoogleId)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(u => u.Name)
                .HasMaxLength(255);

            entity.Property(u => u.GivenName)
                .HasMaxLength(255);

            entity.Property(u => u.FamilyName)
                .HasMaxLength(255);

            entity.Property(u => u.PictureUrl)
                .HasMaxLength(500);

            entity.Property(u => u.Locale)
                .HasMaxLength(10);

            entity.Property(u => u.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(u => u.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
    }
}
