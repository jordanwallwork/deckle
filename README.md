# Deckle - [deckle.games](https://app.deckle.games)

A modern tool for designing and managing tabletop game components. Create cards, dice, and other game components with ease.

**-- Note: Very much a work in progress! --**

Docs: [docs.deckle.games](https://docs.deckle.games)

## What is Deckle?

Deckle helps board game designers and hobbyists create game components quickly and easily. Whether you're prototyping a new game or preparing files for print-on-demand services, Deckle streamlines the design process.

### Features

- **Project Management**: Organize your game components into projects
- **Component Designer**: Create custom components, such as cards, player mats and game boards
- **Data Integration**: Connect to Google Sheets to automatically create and update entire decks
- **Export Ready**: Generate print-ready files for your game components

## Getting Started

Deckle is available for use at [app.deckle.games](https://app.deckle.games)

If you wish to run the project locally, either to contribute fixes/features or to self host, then read on (if self hosting, be sure to read [the license](LICENSE.md)) 

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) or later
- Visual Studio 2022 or [Visual Studio Code](https://code.visualstudio.com/) with C# Dev Kit

### Running Deckle

1. Clone the repository
2. Navigate to the solution root directory
3. Run the application:

```bash
aspire run
```

The AppHost will start the Aspire application and launch the dashboard in your browser.

Note: First run may require:

```bash
dotnet restore
dotnet build
```

### Contributing

## Technology Stack

- **Backend**: .NET 10 with Aspire orchestration
- **API**: ASP.NET Core Minimal APIs with Scalar documentation
- **Frontend**: Svelte 5 + SvelteKit
- **Database**: PostgreSQL

## Development

For detailed development guidelines, architecture information, and contribution rules, see [AGENTS.md](AGENTS.md).

If you wish to contribute to Deckle, please feel free to fork the project, create a feature branch, and then submit a PR for consideration

## License

Deckle is licensed under the [Business Source License 1.1](LICENSE.md).

**TL;DR**: You can use Deckle for personal use, internal company use, and to design games you sell commercially. You cannot offer Deckle itself as a hosted service to others. The license converts to Apache 2.0 on after 2 years (exact date for current version in LICENSE.md)

For commercial licensing inquiries: licensing@deckle.games

## Contact

For questions, issues, or feature requests, please open an issue on GitHub.
