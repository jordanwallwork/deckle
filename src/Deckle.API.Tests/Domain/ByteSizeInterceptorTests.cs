using System.Text;
using Deckle.Domain.Data;
using Deckle.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Deckle.API.Tests.EntityTests;

/// <summary>
/// Tests for ByteSizeInterceptor, ISizeAware, and TrackByteSizeAttribute.
/// Uses a minimal in-memory DbContext with concrete test entities.
/// </summary>
public class ByteSizeInterceptorTests
{
    #region Test entities

    private sealed class SimpleEntity : ISizeAware
    {
        public int Id { get; set; }

        [TrackByteSize]
        public string? TrackedString { get; set; }

        public string? UntrackedString { get; set; }

        public long TotalByteSize { get; set; }
    }

    private sealed class CollectionEntity : ISizeAware
    {
        public int Id { get; set; }

        [TrackByteSize]
        public List<string>? TrackedList { get; set; }

        public long TotalByteSize { get; set; }
    }

    private sealed class MultiPropertyEntity : ISizeAware
    {
        public int Id { get; set; }

        [TrackByteSize]
        public string? First { get; set; }

        [TrackByteSize]
        public string? Second { get; set; }

        public string? Ignored { get; set; }

        public long TotalByteSize { get; set; }
    }

    // Base declares [TrackByteSize]; derived overrides without the attribute.
    private abstract class BaseEntity : ISizeAware
    {
        public int Id { get; set; }

        [TrackByteSize]
        public virtual string? Design { get; set; }

        public long TotalByteSize { get; set; }
    }

    private sealed class DerivedEntity : BaseEntity
    {
        // Override does NOT re-declare [TrackByteSize] — interceptor must walk the chain.
        public override string? Design { get; set; }
    }

    #endregion

    #region Test DbContext

    private sealed class TestDbContext(DbContextOptions<TestDbContext> options) : DbContext(options)
    {
        public DbSet<SimpleEntity> SimpleEntities => Set<SimpleEntity>();
        public DbSet<CollectionEntity> CollectionEntities => Set<CollectionEntity>();
        public DbSet<MultiPropertyEntity> MultiPropertyEntities => Set<MultiPropertyEntity>();
        public DbSet<DerivedEntity> DerivedEntities => Set<DerivedEntity>();
    }

    private static TestDbContext BuildContext() =>
        new(new DbContextOptionsBuilder<TestDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(new ByteSizeInterceptor())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);

    #endregion

    #region Single string property

    [Fact]
    public async Task SavingChanges_TrackedStringProperty_SetsCorrectByteCount()
    {
        await using var ctx = BuildContext();

        var entity = new SimpleEntity { TrackedString = "hello" };
        ctx.SimpleEntities.Add(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(Encoding.UTF8.GetByteCount("hello"), entity.TotalByteSize);
    }

    [Fact]
    public async Task SavingChanges_NullTrackedString_CountsZero()
    {
        await using var ctx = BuildContext();

        var entity = new SimpleEntity { TrackedString = null };
        ctx.SimpleEntities.Add(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(0, entity.TotalByteSize);
    }

    [Fact]
    public async Task SavingChanges_MultiByte_Utf8Characters_CountedCorrectly()
    {
        await using var ctx = BuildContext();

        const string text = "こんにちは"; // 5 chars, 15 UTF-8 bytes
        var entity = new SimpleEntity { TrackedString = text };
        ctx.SimpleEntities.Add(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(Encoding.UTF8.GetByteCount(text), entity.TotalByteSize);
    }

    [Fact]
    public async Task SavingChanges_UntrackedProperty_NotIncluded()
    {
        await using var ctx = BuildContext();

        var entity = new SimpleEntity
        {
            TrackedString = "hi",
            UntrackedString = "this should not be counted"
        };
        ctx.SimpleEntities.Add(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(Encoding.UTF8.GetByteCount("hi"), entity.TotalByteSize);
    }

    #endregion

    #region Multiple tracked properties

    [Fact]
    public async Task SavingChanges_MultipleTrackedProperties_SumsAll()
    {
        await using var ctx = BuildContext();

        var entity = new MultiPropertyEntity
        {
            First = "abc",
            Second = "defgh",
            Ignored = "should not count"
        };
        ctx.MultiPropertyEntities.Add(entity);
        await ctx.SaveChangesAsync();

        var expected = Encoding.UTF8.GetByteCount("abc") + Encoding.UTF8.GetByteCount("defgh");
        Assert.Equal(expected, entity.TotalByteSize);
    }

    #endregion

    #region Collection properties

    [Fact]
    public async Task SavingChanges_StringCollection_SumsItemBytes()
    {
        await using var ctx = BuildContext();

        var entity = new CollectionEntity { TrackedList = ["alpha", "beta", "gamma"] };
        ctx.CollectionEntities.Add(entity);
        await ctx.SaveChangesAsync();

        var expected = Encoding.UTF8.GetByteCount("alpha")
                     + Encoding.UTF8.GetByteCount("beta")
                     + Encoding.UTF8.GetByteCount("gamma");
        Assert.Equal(expected, entity.TotalByteSize);
    }

    [Fact]
    public async Task SavingChanges_EmptyCollection_CountsZero()
    {
        await using var ctx = BuildContext();

        var entity = new CollectionEntity { TrackedList = [] };
        ctx.CollectionEntities.Add(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(0, entity.TotalByteSize);
    }

    [Fact]
    public async Task SavingChanges_NullCollection_CountsZero()
    {
        await using var ctx = BuildContext();

        var entity = new CollectionEntity { TrackedList = null };
        ctx.CollectionEntities.Add(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(0, entity.TotalByteSize);
    }

    #endregion

    #region Inheritance — attribute on base, override on derived

    [Fact]
    public async Task SavingChanges_AttributeOnBaseProperty_CountedWhenOverridden()
    {
        await using var ctx = BuildContext();

        const string design = "some design json";
        var entity = new DerivedEntity { Design = design };
        ctx.DerivedEntities.Add(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(Encoding.UTF8.GetByteCount(design), entity.TotalByteSize);
    }

    #endregion

    #region EntityState filtering

    [Fact]
    public async Task SavingChanges_AddedEntity_ByteSizeSet()
    {
        await using var ctx = BuildContext();

        var entity = new SimpleEntity { TrackedString = "data" };
        ctx.SimpleEntities.Add(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(Encoding.UTF8.GetByteCount("data"), entity.TotalByteSize);
    }

    [Fact]
    public async Task SavingChanges_ModifiedEntity_ByteSizeUpdated()
    {
        await using var ctx = BuildContext();

        var entity = new SimpleEntity { TrackedString = "initial" };
        ctx.SimpleEntities.Add(entity);
        await ctx.SaveChangesAsync();

        entity.TrackedString = "updated value";
        await ctx.SaveChangesAsync();

        Assert.Equal(Encoding.UTF8.GetByteCount("updated value"), entity.TotalByteSize);
    }

    [Fact]
    public async Task SavingChanges_DeletedEntity_ByteSizeNotRecalculated()
    {
        await using var ctx = BuildContext();

        var entity = new SimpleEntity { TrackedString = "to be deleted" };
        ctx.SimpleEntities.Add(entity);
        await ctx.SaveChangesAsync();

        var sizeBeforeDelete = entity.TotalByteSize;

        // Force content change in memory but mark as deleted — interceptor must skip it.
        entity.TrackedString = "CHANGED";
        ctx.SimpleEntities.Remove(entity);
        await ctx.SaveChangesAsync();

        Assert.Equal(sizeBeforeDelete, entity.TotalByteSize);
    }

    #endregion
}
