using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Deckle.Domain.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<UserProject> UserProjects { get; set; }
    public DbSet<DataSource> DataSources { get; set; }
    public DbSet<GoogleCredential> GoogleCredentials { get; set; }
    public DbSet<Component> Components { get; set; }
    public DbSet<Card> Cards { get; set; }
    public DbSet<Dice> Dices { get; set; }

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

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Name)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(p => p.Description)
                .HasMaxLength(1000);

            entity.Property(p => p.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(p => p.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasMany(p => p.Users)
                .WithMany(p => p.Projects)
                .UsingEntity<UserProject>();
        });

        modelBuilder.Entity<UserProject>(entity =>
        {
            entity.HasKey(up => new { up.UserId, up.ProjectId });

            entity.Property(up => up.Role)
                .IsRequired()
                .HasConversion<string>();

            entity.Property(up => up.JoinedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<DataSource>(entity =>
        {
            entity.HasKey(ds => ds.Id);

            entity.Property(ds => ds.Name)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(ds => ds.Type)
                .IsRequired()
                .HasConversion<string>();

            entity.Property(ds => ds.ConnectionString)
                .IsRequired()
                .HasMaxLength(1000);

            entity.Property(ds => ds.GoogleSheetsId)
                .HasMaxLength(255);

            entity.Property(ds => ds.GoogleSheetsUrl)
                .HasMaxLength(500);

            entity.Property(ds => ds.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(ds => ds.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(ds => ds.Project)
                .WithMany(p => p.DataSources)
                .HasForeignKey(ds => ds.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GoogleCredential>(entity =>
        {
            entity.HasKey(gc => gc.Id);

            entity.HasIndex(gc => gc.UserId);

            entity.Property(gc => gc.AccessToken)
                .IsRequired()
                .HasMaxLength(2048);

            entity.Property(gc => gc.RefreshToken)
                .IsRequired()
                .HasMaxLength(512);

            entity.Property(gc => gc.TokenType)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(gc => gc.Scope)
                .IsRequired()
                .HasMaxLength(1000);

            entity.Property(gc => gc.ExpiresAt)
                .IsRequired();

            entity.Property(gc => gc.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(gc => gc.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(gc => gc.User)
                .WithMany(u => u.GoogleCredentials)
                .HasForeignKey(gc => gc.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Component>(entity =>
        {
            entity.HasKey(c => c.Id);

            entity.Property(c => c.Name)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(c => c.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(c => c.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(c => c.Project)
                .WithMany(p => p.Components)
                .HasForeignKey(c => c.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasDiscriminator<string>("ComponentType")
                .HasValue<Card>("Card")
                .HasValue<Dice>("Dice");
        });

        modelBuilder.Entity<Card>(entity =>
        {
            entity.Property(c => c.Size)
                .IsRequired()
                .HasConversion<string>();

            entity.Property(c => c.FrontDesign)
                .HasColumnType("text");

            entity.Property(c => c.BackDesign)
                .HasColumnType("text");
        });

        modelBuilder.Entity<Dice>(entity =>
        {
            entity.Property(d => d.Type)
                .IsRequired()
                .HasConversion<string>();

            entity.Property(d => d.Style)
                .IsRequired()
                .HasConversion<string>();

            entity.Property(d => d.BaseColor)
                .IsRequired()
                .HasConversion<string>();
        });
    }
}
