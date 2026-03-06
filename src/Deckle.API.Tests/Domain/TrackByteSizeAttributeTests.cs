using Deckle.Domain.Entities;

namespace Deckle.API.Tests.EntityTests;

public class TrackByteSizeAttributeTests
{
    [Fact]
    public void Attribute_TargetsProperties()
    {
        var usage = typeof(TrackByteSizeAttribute)
            .GetCustomAttributes(typeof(AttributeUsageAttribute), inherit: false)
            .Cast<AttributeUsageAttribute>()
            .Single();

        Assert.True(usage.ValidOn.HasFlag(AttributeTargets.Property));
    }

    [Fact]
    public void Attribute_AllowMultiple_IsFalse()
    {
        var usage = typeof(TrackByteSizeAttribute)
            .GetCustomAttributes(typeof(AttributeUsageAttribute), inherit: false)
            .Cast<AttributeUsageAttribute>()
            .Single();

        Assert.False(usage.AllowMultiple);
    }

    [Fact]
    public void Attribute_Inherited_IsTrue()
    {
        var usage = typeof(TrackByteSizeAttribute)
            .GetCustomAttributes(typeof(AttributeUsageAttribute), inherit: false)
            .Cast<AttributeUsageAttribute>()
            .Single();

        Assert.True(usage.Inherited);
    }

    [Fact]
    public void Attribute_IsSealed()
    {
        Assert.True(typeof(TrackByteSizeAttribute).IsSealed);
    }

    [Fact]
    public void Attribute_CanBeAppliedToProperty()
    {
        // Verifies the attribute actually appears on properties that declare it
        // (sanity check — if this were missing the interceptor would never count anything).
        var prop = typeof(DataSource).GetProperty(nameof(DataSource.Headers))!;
        var attr = prop.GetCustomAttributes(typeof(TrackByteSizeAttribute), inherit: false);

        Assert.Single(attr);
    }
}
