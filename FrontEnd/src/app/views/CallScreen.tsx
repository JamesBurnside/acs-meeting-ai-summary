// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { CommunicationUserIdentifier } from '@azure/communication-common';
import { MicrosoftTeamsUserIdentifier } from '@azure/communication-common';
import {
  AzureCommunicationCallAdapterOptions,
  CallAdapterLocator,
  CallAdapterState,
  useAzureCommunicationCallAdapter,
  CommonCallAdapter,
  CallAdapter,
  toFlatCommunicationIdentifier
} from '@azure/communication-react';
import { useTeamsCallAdapter, TeamsCallAdapter } from '@azure/communication-react';

import { onResolveVideoEffectDependencyLazy } from '@azure/communication-react';
import type { CaptionsInfo, Profile, TeamsAdapterOptions } from '@azure/communication-react';
import type { StartCallIdentifier } from '@azure/communication-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createAutoRefreshingCredential } from '../utils/credential';
import { WEB_APP_TITLE } from '../utils/AppUtils';
import { CallCompositeContainer } from './CallCompositeContainer';
import { CallState } from '@azure/communication-calling';
import { PrimaryButton, Spinner, Stack, Text } from '@fluentui/react';

export interface CallScreenProps {
  token: string;
  userId: CommunicationUserIdentifier | MicrosoftTeamsUserIdentifier;
  callLocator?: CallAdapterLocator;
  targetCallees?: StartCallIdentifier[];
  displayName: string;
  isTeamsIdentityCall?: boolean;
}

export type ConversationSummaryInput = {
  author: string;
  text: string;
}[];

interface SummarizeTranscriptRequest {
  useTestData: boolean;
  transcript: ConversationSummaryInput;
}

export type SummarizeResult = {
  recap: string;
  chapters: {
    chapterTitle: string;
    narrative: string;
  }[];
};

export const CallScreen = (props: CallScreenProps): JSX.Element => {
  const { token, userId, isTeamsIdentityCall } = props;
  const callIdRef = useRef<string>();

  const [callState, setCallState] = useState<CallState | undefined>();
  const callStateRef = useRef<CallState | undefined>();
  const captions = useRef(new Set<CaptionsInfo>());

  const subscribeAdapterEvents = useCallback((adapter: CommonCallAdapter) => {
    adapter.on('error', (e) => {
      // Error is already acted upon by the Call composite, but the surrounding application could
      // add top-level error handling logic here (e.g. reporting telemetry).
      console.log('Adapter error event:', e);
    });
    adapter.onStateChange((state: CallAdapterState) => {
      const pageTitle = convertPageStateToString(state);
      document.title = `${pageTitle} - ${WEB_APP_TITLE}`;

      if (state?.call?.id && callIdRef.current !== state?.call?.id) {
        callIdRef.current = state?.call?.id;
        console.log(`Call Id: ${callIdRef.current}`);
      }

      // Start captions when call connects
      if (callStateRef.current !== 'Connected' && state.call?.state === 'Connected') {
        adapter.startCaptions();
      }
      callStateRef.current = state.call?.state;
      setCallState(state.call?.state);

      // Track finalized captions
      const newCaptions = state.call?.captionsFeature.captions
        .filter((caption) => caption?.resultType === 'Final')
        .filter((caption) => !captions.current.has(caption));

      if (newCaptions && newCaptions.length > 0) {
        console.log('New captions:', newCaptions);
        newCaptions.forEach((caption) => captions.current.add(caption));
        console.log('Captions captured:', captions.current);
      }
    });

    adapter.on('transferAccepted', (e) => {
      console.log('Call being transferred to: ' + e);
    });
  }, []);

  const afterCallAdapterCreate = useCallback(
    async (adapter: CallAdapter): Promise<CallAdapter> => {
      subscribeAdapterEvents(adapter);
      return adapter;
    },
    [subscribeAdapterEvents]
  );

  const afterTeamsCallAdapterCreate = useCallback(
    async (adapter: TeamsCallAdapter): Promise<TeamsCallAdapter> => {
      subscribeAdapterEvents(adapter);
      return adapter;
    },
    [subscribeAdapterEvents]
  );

  const credential = useMemo(() => {
    if (isTeamsIdentityCall) {
      return new AzureCommunicationTokenCredential(token);
    }
    return createAutoRefreshingCredential(toFlatCommunicationIdentifier(userId), token);
  }, [token, userId, isTeamsIdentityCall]);

  const [summarizationStatus, setSummarizationStatus] = useState<'None' | 'InProgress' | 'Complete'>('None');
  const [summary, setSummary] = useState<SummarizeResult>();

  const sendCaptionsForSummary = async (test: boolean): Promise<void> => {
    setSummary(undefined);
    setSummarizationStatus('InProgress');
    try {
      const captionsArray = [...captions.current];

      if (test) {
        // sleep 3 seconds to simulate the time it takes to summarize the conversation
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        console.log('Captions:', captionsArray);

        if (captionsArray.length < 5) {
          alert('Not enough captions. Please wait for at least 5 captions to be generated before summarizing');
          throw new Error('No captions to summarize');
        }
      }

      const requestData: SummarizeTranscriptRequest = {
        useTestData: test,
        transcript: captionsArray.map((caption) => ({
          author: caption.speaker.displayName ?? 'Unknown',
          text: caption.captionText ?? ''
        }))
      };
      console.log('Request:', requestData);

      const response = await fetch('/summarizeTranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      console.log('Response:', response);

      if (!response.ok) {
        alert('Summarization request failed');
        console.error('Response Failed: ', response.statusText);
        throw new Error('Summarization request failed');
      }

      const result = await response.json();
      console.log('Summary result:', result);
      setSummary(result);
    } finally {
      setSummarizationStatus('Complete');
    }
  };

  return (
    <Stack verticalFill>
      <Stack.Item styles={{ root: { minHeight: '40rem', width: '70vw', minWidth: '30rem', margin: '0 auto' } }}>
        {isTeamsIdentityCall ? (
          <TeamsCallScreen afterCreate={afterTeamsCallAdapterCreate} credential={credential} {...props} />
        ) : props.callLocator ? (
          <AzureCommunicationCallScreen afterCreate={afterCallAdapterCreate} credential={credential} {...props} />
        ) : (
          <AzureCommunicationOutboundCallScreen
            afterCreate={afterCallAdapterCreate}
            credential={credential}
            {...props}
          />
        )}
      </Stack.Item>
      <Stack.Item styles={{ root: { maxHeight: '30rem', overflow: 'auto', margin: '2rem', maxWidth: '70rem' } }}>
        {callState === 'Connected' && (
          <Stack horizontal tokens={{ childrenGap: '1rem' }}>
            <PrimaryButton
              disabled={summarizationStatus === 'InProgress'}
              onClick={() => sendCaptionsForSummary(false)}
            >
              Send for Summary
            </PrimaryButton>
            <PrimaryButton disabled={summarizationStatus === 'InProgress'} onClick={() => sendCaptionsForSummary(true)}>
              Summarize Test Data
            </PrimaryButton>
          </Stack>
        )}
        {summarizationStatus === 'InProgress' && (
          <Spinner styles={{ root: { marginTop: '2rem' } }} label="Summarizing conversation..." />
        )}
        {summarizationStatus === 'Complete' && summary && (
          <Stack styles={{ root: { marginTop: '1rem' } }}>
            <Text styles={{ root: { marginTop: '0.5rem', fontWeight: 600 } }} variant="large">
              Summary
            </Text>
            <Text styles={{ root: { marginTop: '0.5rem', marginBottom: '1rem', fontStyle: 'italic' } }}>
              {summary.recap}
            </Text>
            {summary.chapters.map((chapter, index) => (
              <Chapter key={index} title={chapter.chapterTitle} narrative={chapter.narrative} />
            ))}
          </Stack>
        )}
      </Stack.Item>
    </Stack>
  );
};

const Chapter = (props: { title: string; narrative: string }): JSX.Element => {
  return (
    <Stack
      styles={{
        root: {
          paddingLeft: '2rem',
          marginTop: '0.5rem',
          marginBottom: '0.5rem',
          borderLeft: '2px solid #ccc'
        }
      }}
    >
      <Text styles={{ root: { marginBottom: '0.25rem', fontWeight: 600 } }}>{props.title}</Text>
      <Text>{props.narrative}</Text>
    </Stack>
  );
};

type TeamsCallScreenProps = CallScreenProps & {
  afterCreate?: (adapter: TeamsCallAdapter) => Promise<TeamsCallAdapter>;
  credential: AzureCommunicationTokenCredential;
};

const TeamsCallScreen = (props: TeamsCallScreenProps): JSX.Element => {
  const { afterCreate, callLocator: locator, userId, ...adapterArgs } = props;
  if (!(locator && 'meetingLink' in locator)) {
    throw new Error('A teams meeting locator must be provided for Teams Identity Call.');
  }

  if (!('microsoftTeamsUserId' in userId)) {
    throw new Error('A MicrosoftTeamsUserIdentifier must be provided for Teams Identity Call.');
  }

  const teamsAdapterOptions: TeamsAdapterOptions = useMemo(
    () => ({
      videoBackgroundOptions: {
        videoBackgroundImages
      }
    }),
    []
  );

  const adapter = useTeamsCallAdapter(
    {
      ...adapterArgs,
      userId,
      locator,
      options: teamsAdapterOptions
    },
    afterCreate
  );
  return <CallCompositeContainer {...props} adapter={adapter} />;
};

type AzureCommunicationCallScreenProps = CallScreenProps & {
  afterCreate?: (adapter: CallAdapter) => Promise<CallAdapter>;
  credential: AzureCommunicationTokenCredential;
};

const AzureCommunicationCallScreen = (props: AzureCommunicationCallScreenProps): JSX.Element => {
  const { afterCreate, callLocator: locator, userId, ...adapterArgs } = props;

  if (!('communicationUserId' in userId)) {
    throw new Error('A MicrosoftTeamsUserIdentifier must be provided for Teams Identity Call.');
  }

  const callAdapterOptions: AzureCommunicationCallAdapterOptions = useMemo(() => {
    return {
      videoBackgroundOptions: {
        videoBackgroundImages,
        onResolveDependency: onResolveVideoEffectDependencyLazy
      },
      callingSounds: {
        callEnded: { url: '/assets/sounds/callEnded.mp3' },
        callRinging: { url: '/assets/sounds/callRinging.mp3' },
        callBusy: { url: '/assets/sounds/callBusy.mp3' }
      },
      reactionResources: {
        likeReaction: { url: '/assets/reactions/likeEmoji.png', frameCount: 102 },
        heartReaction: { url: '/assets/reactions/heartEmoji.png', frameCount: 102 },
        laughReaction: { url: '/assets/reactions/laughEmoji.png', frameCount: 102 },
        applauseReaction: { url: '/assets/reactions/clapEmoji.png', frameCount: 102 },
        surprisedReaction: { url: '/assets/reactions/surprisedEmoji.png', frameCount: 102 }
      }
    };
  }, []);

  const adapter = useAzureCommunicationCallAdapter(
    {
      ...adapterArgs,
      userId,
      locator,
      options: callAdapterOptions
    },
    afterCreate
  );

  return <CallCompositeContainer {...props} adapter={adapter} />;
};

const AzureCommunicationOutboundCallScreen = (props: AzureCommunicationCallScreenProps): JSX.Element => {
  const { afterCreate, targetCallees: targetCallees, userId, ...adapterArgs } = props;

  if (!('communicationUserId' in userId)) {
    throw new Error('A MicrosoftTeamsUserIdentifier must be provided for Teams Identity Call.');
  }

  const callAdapterOptions: AzureCommunicationCallAdapterOptions = useMemo(() => {
    return {
      videoBackgroundOptions: {
        videoBackgroundImages,
        onResolveDependency: onResolveVideoEffectDependencyLazy
      },
      callingSounds: {
        callEnded: { url: '/assets/sounds/callEnded.mp3' },
        callRinging: { url: '/assets/sounds/callRinging.mp3' },
        callBusy: { url: '/assets/sounds/callBusy.mp3' }
      },
      reactionResources: {
        likeReaction: { url: '/assets/reactions/likeEmoji.png', frameCount: 102 },
        heartReaction: { url: '/assets/reactions/heartEmoji.png', frameCount: 102 },
        laughReaction: { url: '/assets/reactions/laughEmoji.png', frameCount: 102 },
        applauseReaction: { url: '/assets/reactions/clapEmoji.png', frameCount: 102 },
        surprisedReaction: { url: '/assets/reactions/surprisedEmoji.png', frameCount: 102 }
      },
      onFetchProfile: async (userId: string, defaultProfile?: Profile): Promise<Profile | undefined> => {
        if (userId === '<28:orgid:Enter your teams app here>') {
          return { displayName: 'Teams app display name' };
        }
        return defaultProfile;
      }
    };
  }, []);

  const adapter = useAzureCommunicationCallAdapter(
    {
      ...adapterArgs,
      userId,
      targetCallees: targetCallees,
      options: callAdapterOptions
    },
    afterCreate
  );

  return <CallCompositeContainer {...props} adapter={adapter} />;
};

const convertPageStateToString = (state: CallAdapterState): string => {
  switch (state.page) {
    case 'accessDeniedTeamsMeeting':
      return 'error';
    case 'badRequest':
      return 'error';
    case 'leftCall':
      return 'end call';
    case 'removedFromCall':
      return 'end call';
    default:
      return `${state.page}`;
  }
};

const videoBackgroundImages = [
  {
    key: 'contoso',
    url: '/assets/backgrounds/contoso.png',
    tooltipText: 'Contoso Background'
  },
  {
    key: 'pastel',
    url: '/assets/backgrounds/abstract2.jpg',
    tooltipText: 'Pastel Background'
  },
  {
    key: 'rainbow',
    url: '/assets/backgrounds/abstract3.jpg',
    tooltipText: 'Rainbow Background'
  },
  {
    key: 'office',
    url: '/assets/backgrounds/room1.jpg',
    tooltipText: 'Office Background'
  },
  {
    key: 'plant',
    url: '/assets/backgrounds/room2.jpg',
    tooltipText: 'Plant Background'
  },
  {
    key: 'bedroom',
    url: '/assets/backgrounds/room3.jpg',
    tooltipText: 'Bedroom Background'
  },
  {
    key: 'livingroom',
    url: '/assets/backgrounds/room4.jpg',
    tooltipText: 'Living Room Background'
  }
];
