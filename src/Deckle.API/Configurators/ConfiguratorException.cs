using Deckle.API.DTOs;

namespace Deckle.API.Configurators;

public class ConfiguratorException : Exception
{
    public ConfiguratorException()
    {
    }

    public ConfiguratorException(string message) : base(message)
    {
    }

    public ConfiguratorException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
