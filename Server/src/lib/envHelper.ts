// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const appSettings = require('../../appsettings.json');

export const getResourceConnectionString = (): string => {
  const resourceConnectionString = process.env['ResourceConnectionString'] || appSettings.ResourceConnectionString;

  if (!resourceConnectionString) {
    throw new Error('No ACS connection string provided');
  }

  return resourceConnectionString;
};

export const getLanguageAPIKey = (): string => process.env['LANGUAGE_API_KEY'] || appSettings.LanguageAPIKey;
export const getLanguageAPIURL = (): string => process.env['LANGUAGE_API_URL'] || appSettings.LanguageAPIURL;
