// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { AzureCommunicationTokenCredential, CommunicationTokenRefreshOptions } from '@azure/communication-common';
import { AbortSignalLike } from '@azure/abort-controller';
import { CommunicationUserToken } from '@azure/communication-identity';

const postRefreshTokenParameters = {
  method: 'POST'
};

/**
 * Get ACS user token from the Contoso server.
 */
export const fetchTokenResponse = async (): Promise<CommunicationUserToken> => {
  const response = await fetch('/api/token?scope=voip');
  if (response.ok) {
    const responseAsJson: CommunicationUserToken = await response.json();
    const token = responseAsJson.token;
    if (token) {
      return responseAsJson;
    }
  }
  throw new Error('Invalid token response');
};

/**
 * Create credentials that auto-refresh asynchronously.
 */
export const createAutoRefreshingCredential = (userId: string, token: string): AzureCommunicationTokenCredential => {
  const options: CommunicationTokenRefreshOptions = {
    token: token,
    tokenRefresher: refreshTokenAsync(userId),
    refreshProactively: true
  };
  return new AzureCommunicationTokenCredential(options);
};

const refreshTokenAsync = (userIdentity: string): ((abortSignal?: AbortSignalLike) => Promise<string>) => {
  return async (): Promise<string> => {
    const response = await fetch(`/api/refreshToken/${userIdentity}`, postRefreshTokenParameters);
    if (response.ok) {
      const communicationUserToken: CommunicationUserToken = await response.json();
      return communicationUserToken.token;
    } else {
      throw new Error('could not refresh token');
    }
  };
};
