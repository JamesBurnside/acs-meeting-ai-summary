// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import {
  CommunicationAccessToken,
  CommunicationIdentityClient,
  CommunicationUserToken,
  TokenScope
} from '@azure/communication-identity';
import { CommunicationUserIdentifier } from '@azure/communication-common';
import { getResourceConnectionString } from './envHelper';

// lazy init to allow mocks in test
let identityClient: CommunicationIdentityClient | undefined = undefined;
const getIdentityClient = (): CommunicationIdentityClient =>
  identityClient ?? (identityClient = new CommunicationIdentityClient(getResourceConnectionString()));

export const getToken = (user: CommunicationUserIdentifier, scopes: TokenScope[]): Promise<CommunicationAccessToken> =>
  getIdentityClient().getToken(user, scopes);

export const createUserAndToken = (scopes: TokenScope[]): Promise<CommunicationUserToken> =>
  getIdentityClient().createUserAndToken(scopes);
