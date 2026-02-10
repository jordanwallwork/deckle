using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.Text.Json;

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
    public DbSet<GoogleSheetsDataSource> GoogleSheetsDataSources { get; set; }
    public DbSet<SampleDataSource> SampleDataSources { get; set; }
    public DbSet<SpreadsheetDataSource> SpreadsheetDataSources { get; set; }
    public DbSet<Component> Components { get; set; }
    public DbSet<Card> Cards { get; set; }
    public DbSet<Dice> Dices { get; set; }
    public DbSet<PlayerMat> PlayerMats { get; set; }
    public DbSet<Entities.File> Files { get; set; }
    public DbSet<FileDirectory> FileDirectories { get; set; }

    [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Maintainability", "CA1506:AvoidExcessiveClassCoupling", Justification = "EF Core DbContext configuration inherently couples to all entity types")]
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            entity.HasIndex(u => u.GoogleId)
                .IsUnique()
                .HasFilter("\"GoogleId\" IS NOT NULL");

            entity.HasIndex(u => u.Email);

            entity.HasIndex(u => u.Username)
                .IsUnique()
                .HasFilter("\"Username\" IS NOT NULL");

            entity.Property(u => u.GoogleId)
                .HasMaxLength(255);

            entity.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(u => u.Username)
                .HasMaxLength(100);

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

            entity.Property(u => u.StorageQuotaMb)
                .IsRequired()
                .HasDefaultValue(50);

            entity.Property(u => u.StorageUsedBytes)
                .IsRequired()
                .HasDefaultValue(0);

            entity.Property(u => u.Role)
                .IsRequired()
                .HasConversion<string>()
                .HasDefaultValue(UserRole.User);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.Property(p => p.Name)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(p => p.Code)
                .IsRequired()
                .HasMaxLength(100);

            entity.ToTable(t => t.HasCheckConstraint(
                "CK_Projects_Code_Format",
                "\"Code\" ~ '^[a-zA-Z0-9-]+$'"));

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

            entity.Property(ds => ds.Headers)
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null)
                )
                .Metadata.SetValueComparer(
                    new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>?>(
                        (c1, c2) => (c1 == null && c2 == null) || (c1 != null && c2 != null && c1.SequenceEqual(c2)),
                        c => c == null ? 0 : c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode(StringComparison.Ordinal))),
                        c => c == null ? null : c.ToList()
                    )
                );

            entity.Property(ds => ds.RowCount);

            entity.Property(ds => ds.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(ds => ds.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // ProjectId is now nullable - SampleDataSources may not be associated with a project
            entity.HasOne(ds => ds.Project)
                .WithMany(p => p.DataSources)
                .HasForeignKey(ds => ds.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // TPH discriminator using Type property
            entity.HasDiscriminator(ds => ds.Type)
                .HasValue<GoogleSheetsDataSource>(DataSourceType.GoogleSheets)
                .HasValue<SampleDataSource>(DataSourceType.Sample)
                .HasValue<SpreadsheetDataSource>(DataSourceType.Spreadsheet);
        });

        modelBuilder.Entity<GoogleSheetsDataSource>(entity =>
        {
            entity.Property(ds => ds.GoogleSheetsId)
                .HasMaxLength(255);

            entity.Property(ds => ds.GoogleSheetsUrl)
                .HasMaxLength(500)
                .HasConversion(
                    v => v != null ? v.ToString() : null,
                    v => v != null ? new Uri(v) : null);

            entity.Property(ds => ds.SheetGid);

            entity.Property(ds => ds.CsvExportUrl)
                .HasMaxLength(1000)
                .HasConversion(
                    v => v != null ? v.ToString() : null,
                    v => v != null ? new Uri(v) : null);
        });

        modelBuilder.Entity<SampleDataSource>(entity =>
        {
            entity.HasOne(ds => ds.SourceDataSource)
                .WithMany()
                .HasForeignKey(ds => ds.SourceDataSourceId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SpreadsheetDataSource>(entity =>
        {
            entity.Property(ds => ds.JsonData)
                .HasColumnName("JsonData")
                .HasColumnType("jsonb");
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

            // ProjectId is nullable - shared sample components may not be associated with a project
            entity.HasOne(c => c.Project)
                .WithMany(p => p.Components)
                .HasForeignKey(c => c.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasDiscriminator<string>("ComponentType")
                .HasValue<Card>("Card")
                .HasValue<Dice>("Dice")
                .HasValue<PlayerMat>("PlayerMat");
        });

        modelBuilder.Entity<Card>(entity =>
        {
            entity.Property(c => c.Horizontal)
                .HasColumnName("Horizontal");

            entity.Property(c => c.Size)
                .IsRequired()
                .HasConversion<string>();

            entity.Property(c => c.FrontDesign)
                .HasColumnType("text");

            entity.Property(c => c.BackDesign)
                .HasColumnType("text");

            entity.Property(c => c.Shape)
                .IsRequired()
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<ComponentShape>(v, (JsonSerializerOptions?)null)!
                );

            entity.HasOne(c => c.DataSource)
                .WithMany()
                .HasForeignKey("DataSourceId")
                .OnDelete(DeleteBehavior.SetNull);
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

        modelBuilder.Entity<PlayerMat>(entity =>
        {
            entity.Property(pm => pm.Horizontal)
                .HasColumnName("Horizontal");

            entity.Property(pm => pm.PresetSize)
                .HasConversion<string>();

            entity.Property(pm => pm.CustomWidthMm)
                .HasColumnType("decimal(10,2)");

            entity.Property(pm => pm.CustomHeightMm)
                .HasColumnType("decimal(10,2)");

            entity.Property(pm => pm.FrontDesign)
                .HasColumnType("text");

            entity.Property(pm => pm.BackDesign)
                .HasColumnType("text");

            entity.Property(pm => pm.Shape)
                .IsRequired()
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<ComponentShape>(v, (JsonSerializerOptions?)null)!
                );

            entity.HasOne(pm => pm.DataSource)
                .WithMany()
                .HasForeignKey("DataSourceId")
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Entities.File>(entity =>
        {
            entity.HasKey(f => f.Id);

            entity.Property(f => f.FileName)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(f => f.Path)
                .IsRequired()
                .HasMaxLength(1000);

            entity.Property(f => f.ContentType)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(f => f.FileSizeBytes)
                .IsRequired();

            entity.Property(f => f.StorageKey)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(f => f.Status)
                .IsRequired()
                .HasConversion<string>();

            entity.Property(f => f.UploadedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Project cascade delete (cleanup R2 files in service layer)
            entity.HasOne(f => f.Project)
                .WithMany(p => p.Files)
                .HasForeignKey(f => f.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // User restrict (keep files if user deleted)
            entity.HasOne(f => f.UploadedBy)
                .WithMany(u => u.UploadedFiles)
                .HasForeignKey(f => f.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure Tags as JSONB
            entity.Property(f => f.Tags)
                .HasColumnType("jsonb")
                .HasDefaultValueSql("'[]'::jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
                )
                .Metadata.SetValueComparer(
                    new ValueComparer<List<string>>(
                        (c1, c2) => (c1 == null && c2 == null) || (c1 != null && c2 != null && c1.SequenceEqual(c2)),
                        c => c == null ? 0 : c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode(StringComparison.Ordinal))),
                        c => c == null ? new List<string>() : c.ToList()
                    )
                );

            // Directory relationship (optional)
            entity.HasOne(f => f.Directory)
                .WithMany(d => d.Files)
                .HasForeignKey(f => f.DirectoryId)
                .OnDelete(DeleteBehavior.SetNull);

            // Indexes for performance
            entity.HasIndex(f => f.ProjectId);
            entity.HasIndex(f => f.UploadedByUserId);
            entity.HasIndex(f => f.DirectoryId);
            entity.HasIndex(f => new { f.Status, f.UploadedAt }); // For cleanup job

            // Unique index for Path within project (only for confirmed files)
            entity.HasIndex(f => new { f.ProjectId, f.Path })
                .IsUnique()
                .HasFilter("\"Status\" = 'Confirmed'");

            entity.HasIndex(f => f.Tags)
                .HasMethod("gin")
                .HasAnnotation("Npgsql:IndexOperators", new[] { "jsonb_path_ops" }); // For tag queries with better performance
        });

        modelBuilder.Entity<FileDirectory>(entity =>
        {
            entity.HasKey(d => d.Id);

            entity.Property(d => d.Name)
                .IsRequired()
                .HasMaxLength(255);

            entity.Property(d => d.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(d => d.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Project relationship (cascade delete)
            entity.HasOne(d => d.Project)
                .WithMany(p => p.FileDirectories)
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            // Self-referencing parent directory relationship
            entity.HasOne(d => d.ParentDirectory)
                .WithMany(d => d.ChildDirectories)
                .HasForeignKey(d => d.ParentDirectoryId)
                .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            entity.HasIndex(d => d.ProjectId);
            entity.HasIndex(d => d.ParentDirectoryId);
            entity.HasIndex(d => new { d.ProjectId, d.ParentDirectoryId, d.Name })
                .IsUnique(); // Unique directory name within same parent
        });
    }
}
