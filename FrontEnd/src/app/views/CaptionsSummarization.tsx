// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CallState } from '@azure/communication-calling';
import { SummarizeCaptions, SummarizeResult } from '../utils/summarizationUtils';
import React, { useEffect, useRef, useState } from 'react';
import { PrimaryButton, Spinner, Stack, Text } from '@fluentui/react';
import { CallAdapter, CallAdapterState, CaptionsInfo } from '@azure/communication-react';

export const CaptionsSummarization = (props: { adapter: CallAdapter }): JSX.Element => {
  const { adapter } = props;
  const [summarizationStatus, setSummarizationStatus] = useState<'None' | 'InProgress' | 'Complete'>('None');
  const [summary, setSummary] = useState<SummarizeResult>();

  const [callState, setCallState] = useState<CallState | undefined>();
  const callStateRef = useRef<CallState | undefined>();
  const captions = useRef(new Set<CaptionsInfo>());

  const sendCaptionsForSummary = async (): Promise<void> => {
    setSummary(undefined);
    setSummarizationStatus('InProgress');
    try {
      const result = await SummarizeCaptions([...captions.current]);
      setSummary(result);
    } finally {
      setSummarizationStatus('Complete');
    }
  };

  useEffect(() => {
    const adapterStateChange = (state: CallAdapterState): void => {
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
    };

    adapter.onStateChange(adapterStateChange);
    return () => {
      adapter.offStateChange(adapterStateChange);
    };
  }, [adapter]);

  return (
    <>
      {callState === 'Connected' && (
        <Stack horizontal tokens={{ childrenGap: '1rem' }}>
          <PrimaryButton disabled={summarizationStatus === 'InProgress'} onClick={() => sendCaptionsForSummary()}>
            Send for Summary
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
    </>
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
