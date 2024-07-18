// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Call } from '@azure/communication-calling';
import {
  CommunicationIdentifier,
  CommunicationTokenCredential,
  CommunicationUserIdentifier
} from '@azure/communication-common';
import {
  CallAdapter,
  createAzureCommunicationCallAdapterFromClient,
  createStatefulCallClient
} from '@azure/communication-react';

export const navigateToHomePage = (): void => {
  window.location.href = window.location.href.split('?')[0];
};

export const WEB_APP_TITLE = document.title;

export const placeCall = async (callDetails: {
  userId: CommunicationUserIdentifier;
  token: CommunicationTokenCredential;
  displayName: string;
}): Promise<CallAdapter> => {
  const callClient = createStatefulCallClient({
    userId: callDetails.userId
  });

  const callAgent = await callClient.createCallAgent(callDetails.token, {
    displayName: callDetails.displayName
  });

  const awaitCallPromise = new Promise<Call>((resolve) => {
    console.log('Listening for incoming calls');
    callAgent.on('incomingCall', async (ev) => {
      const call = await ev.incomingCall.accept();
      resolve(call);
    });
  });

  const adapter = await createAzureCommunicationCallAdapterFromClient(callClient, callAgent, []);

  const response = await fetch('/api/startCallWithTranscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      targetCallIds: [callDetails.userId]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to start call with transcription');
  }

  const call = await awaitCallPromise;

  // TODO: remove this once `@azure/communication-react` supports creating an adapter with an existing call
  adapter.startCall([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).cachedCallId = call.id;

  return adapter;
};

export type CallTranscription = Array<{
  text: string;
  confidence: number;
  offsetInTicks: number;
  durationInTicks: number;
  participant: CommunicationIdentifier;
  resultState: 'intermediate' | 'final';
}>;

export const fetchTranscript = async (callId: string): Promise<CallTranscription> => {
  const response = await fetch(`/api/fetchTranscript`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      callId
    })
  });
  if (!response.ok) {
    console.error('Failed to fetch transcript:', response);
    return [];
  }

  return ((await response.json()) as { transcript: CallTranscription }).transcript;
};
