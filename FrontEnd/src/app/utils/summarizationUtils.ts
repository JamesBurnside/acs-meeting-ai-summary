// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { CaptionsInfo } from '@azure/communication-react';

export type ConversationSummaryInput = {
  author: string;
  text: string;
}[];

export interface SummarizeTranscriptRequest {
  transcript: ConversationSummaryInput;
}

export type SummarizeResult = {
  recap: string;
  chapters: {
    chapterTitle: string;
    narrative: string;
  }[];
};

export const SummarizeCaptions = async (captions: CaptionsInfo[]): Promise<SummarizeResult> => {
  if (captions.length < 5) {
    alert('Not enough captions. Please wait for at least 5 captions to be generated before summarizing');
    throw new Error('No captions to summarize');
  }

  const requestData: SummarizeTranscriptRequest = {
    transcript: captions.map((caption) => ({
      author: caption.speaker.displayName ?? 'Unknown',
      text: caption.captionText ?? ''
    }))
  };
  console.log('Request:', requestData);

  const response = await fetch('/api/summarizeTranscript', {
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

  return result;
};
