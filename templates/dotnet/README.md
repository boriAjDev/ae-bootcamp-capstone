# APP_NAME

## Overview

This is a .NET application scaffolded by the Self-Service Repository Request system.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)

## Getting Started

```bash
# Restore dependencies
dotnet restore

# Build
dotnet build

# Run tests
dotnet test

# Run the application
dotnet run --project src/APP_NAME
```

## Project Structure

```
APP_NAME/
├── global.json               # SDK version pin
├── src/
│   ├── APP_NAME.sln          # Solution file
│   └── APP_NAME/             # Main project
│       ├── APP_NAME.csproj
│       └── Program.cs
└── tests/
    └── APP_NAME.Tests/       # Unit test project
        ├── APP_NAME.Tests.csproj
        └── SampleTests.cs
```
