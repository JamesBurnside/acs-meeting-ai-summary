# ACS Meeting AI Summarization Sample

Project for displaying AI generated meeting summary for ACS meetings using `@azure/communication-react` Captions.

## Prerequisites

- Node.js
- npm
- Azure account with access to Azure Cognitive Services and Azure Communication Services

## Setup

1. Create an Azure Communication Services resource
1. Create an Azure Cognitive Lanugage Services resource
1. Clone the repository
1. Install dependencies

   ```bash
   npm run setup
   ```

1. Setup the `Server/appsettings.json` file

   - Copy the `Server/appsettings.json TEMPLATE` file and rename it to `Server/appsettings.json`
      - `ResourceConnectionString`: Connection string for the Azure Communication Services resource
      - `LanguageAPIURL`: URL for the Azure Cognitive Language Services resource
      - `LanguageAPIKey`: API key for the Azure Cognitive Language Services resource

## Running the project

1. Start the server and client

   ```bash
   npm run start
   ```
