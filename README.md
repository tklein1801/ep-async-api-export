# ep-async-api-fix

![CI](https://ci.tools.tklein.it/api/v1/teams/main/pipelines/ep-async-api-export/badge)
![NPM Version](https://img.shields.io/npm/v/%40tklein1801%2Fep-async-api-export)
![NPM License](https://img.shields.io/npm/l/%40tklein1801%2Fep-async-api-export)
![NPM Last Update](https://img.shields.io/npm/last-update/%40tklein1801%2Fep-async-api-export)

## Getting started

### Use the tool

```bash
npx @tklein1801/ep-async-api-export --help
```

### Start developing

> [!NOTE]
> You can look up in the [Solace Documentation](https://docs.solace.com/Cloud/ght_api_tokens.htm) on how to manage your API tokens.

1. Clone this repository

   ```bash
   git clone git@github.com:tklein1801/ep-async-api-export.git

   cd ep-async-api-export/
   ```

2. Install all required dependencies

   ```bash
   npm install
   ```

3. Run the programm

   ```bash
   npx tsx ./src/cli.ts
   ```

4. Build the programm

   ```bash
   npm run build
   ```

> [!NOTE]
> A new version of the NPM package is published using the CI pipeline if the tests and build were successful.

## About

A compact CLI tool to export AsyncAPI schemas from the SAP AEM Event Portal and Solace Pub/Sub+ Event Portal.

## Usage

> [!TIP]
> If you run `npx @tklein1801/ep-async-api-export export --help` you will get a short documentation about all possible options you can set

### Authentication

You can authenticate as a user via 3 methods or provide your Solace Cloud Token in 3 ways:

1.Using the environment variables `CLI_SOLACE_CLOUD_TOKEN` or `SOLACE_CLOUD_TOKEN`
2.Providing the token via the flag `--solaceCloudToken`
3.Storing the token locally in a file and providing it via the flag `--secretFile`

> [!IMPORTANT]
> Tokens are set in this order. Therefore, if all values are provided, the hierarchy would be environment variable, token via flag, and finally token via file, making the file token the last valid token.

### Exporting a schema

When the CLI is used by a human, there is not much to worry about as you can simply navigate through the CLI. If the CLI is run in a static environment or executed using programs or instructions, you need to use flags to skip the prompts (e.g. `--applicationDomain <APPLICATION_DOMAIN_ID>`), as interactivity cannot be used in a CI pipeline.

## Improvements

These points offer opportunities for improvement:

1.Uninstall `@solace-labs/ep-sdk` to reduce bundle size
2.Implement pagination for Application Domains, Applications, Application Versions... to allow navigation through pages in case more than 100 values are returned for a request
3.Export AsyncAPI via clean `STDOUT`

## Credits

| Source                                                        | Information                                                       |
| :------------------------------------------------------------ | :---------------------------------------------------------------- |
| [drizzle-team/brocli](https://github.com/drizzle-team/brocli) | This package was used to build the CLI                            |
| [terkelg/prompts](https://github.com/terkelg/prompts)         | Used for implementing interactive prompts                         |
