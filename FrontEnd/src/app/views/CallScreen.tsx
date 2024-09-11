// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CommunicationUserIdentifier } from '@azure/communication-common';
import {
  AzureCommunicationCallAdapterOptions,
  CallAdapterState,
  useAzureCommunicationCallAdapter,
  CallAdapter,
  toFlatCommunicationIdentifier,
  CallComposite
} from '@azure/communication-react';

import { onResolveVideoEffectDependencyLazy } from '@azure/communication-react';
import type { CallCompositeOptions } from '@azure/communication-react';
import React, { useCallback, useMemo, useRef } from 'react';
import { createAutoRefreshingCredential } from '../utils/credential';
import { WEB_APP_TITLE } from '../utils/AppUtils';
import { Spinner, Stack } from '@fluentui/react';
import { useIsMobile } from '../utils/useIsMobile';
import { useSwitchableFluentTheme } from '../theming/SwitchableFluentThemeProvider';
import { CaptionsSummarization } from './CaptionsSummarization';
import { GroupCallLocator, TeamsMeetingLinkLocator } from '@azure/communication-calling';

export interface CallScreenProps {
  token: string;
  userId: CommunicationUserIdentifier;
  callLocator?: GroupCallLocator | TeamsMeetingLinkLocator;
  displayName: string;
}

export const CallScreen = (props: CallScreenProps): JSX.Element => {
  const { token, userId, callLocator, displayName } = props;
  const callIdRef = useRef<string>();

  const subscribeAdapterEvents = useCallback(async (adapter: CallAdapter): Promise<CallAdapter> => {
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
    });

    return adapter;
  }, []);

  const credential = useMemo(() => {
    return createAutoRefreshingCredential(toFlatCommunicationIdentifier(userId), token);
  }, [token, userId]);

  const adapterArgs = useMemo(() => ({
    displayName,
    userId,
    locator: callLocator,
    credential,
    options: callAdapterOptions
  }), []);

  const adapter = useAzureCommunicationCallAdapter(adapterArgs, subscribeAdapterEvents);

  const isMobileSession = useIsMobile();
  const options: CallCompositeOptions = useMemo(
    () => ({
      callControls: {
        screenShareButton: isMobileSession ? false : undefined,
        endCallButton: {
          hangUpForEveryone: 'endCallOptions'
        }
      },
      autoShowDtmfDialer: true
    }),
    [isMobileSession]
  );

  const { currentTheme, currentRtl } = useSwitchableFluentTheme();

  if (!adapter) {
    return <Spinner label={'Creating adapter'} ariaLive="assertive" labelPosition="top" />;
  }

  return (
    <Stack verticalFill>
      <Stack.Item styles={{ root: { minHeight: '40rem', width: '70vw', minWidth: '30rem', margin: '0 auto' } }}>
      <CallComposite
        adapter={adapter}
        fluentTheme={currentTheme.theme}
        rtl={currentRtl}
        callInvitationUrl={window.location.href}
        formFactor={isMobileSession ? 'mobile' : 'desktop'}
        options={options}
      />
      </Stack.Item>
      <Stack.Item styles={{ root: { maxHeight: '30rem', overflow: 'auto', margin: '2rem', maxWidth: '70rem' } }}>
        <CaptionsSummarization adapter={adapter} />
      </Stack.Item>
    </Stack>
  );
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

const callAdapterOptions: AzureCommunicationCallAdapterOptions = {
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