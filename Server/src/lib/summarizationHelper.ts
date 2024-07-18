// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// import { AnalyzeBatchAction, AzureKeyCredential, TextAnalysisClient } from '@azure/ai-language-text';
import { getLanguageAPIKey } from './envHelper';

const API_URL =
  'https://ui-library-ai-language-services-test-resource.cognitiveservices.azure.com/language/analyze-conversations/jobs?api-version=2023-11-15-preview';

const apiHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Ocp-Apim-Subscription-Key': getLanguageAPIKey()
});

const Job_Poll_Time_Ms = 3000;

export type ConversationSummaryInput = {
  author: string;
  text: string;
}[];

export type SummarizeRestRequestResponse = {
  jobUrl: string;
};

export type JobRestResponse = {
  status: 'InProgress' | 'Succeeded' | 'Failed';
  tasks?: {
    kind?: string;
    status?: string;
    taskName?: string;
    results?: {
      conversations: {
        summaries: {
          aspect: string;
          text?: string;
        }[];
      }[];
    };
  }[];
};

export type SummarizeResult = {
  recap: string;
  chapters: {
    chapterTitle: string;
    narrative: string;
  }[];
};

// const testInputData = [...(testTranscript as unknown as Set<CaptionsInfo>)].map((caption) => ({
//   author: caption.speaker.displayName,
//   text: caption.captionText
// }));

const testJobResponse = {
  status: 'Succeeded',
  tasks: RestReponse.tasks.items
};

export async function SummarizeConversation(input: ConversationSummaryInput | 'testdata'): Promise<SummarizeResult> {
  const USE_TEST_DATA = input === 'testdata';
  const requestResponse = USE_TEST_DATA
    ? { jobUrl: 'n/a' }
    : await requestConversationSummary(input as unknown as ConversationSummaryInput);
  console.log('Request response:', requestResponse);

  const jobResult = USE_TEST_DATA ? testJobResponse : await pollJobStatus(requestResponse.jobUrl);
  console.log('Job result:', jobResult);

  if (jobResult.status === 'Failed') {
    throw new Error('Job failed');
  }

  if (!jobResult.tasks) {
    throw new Error('Tasks not found');
  }
  if (jobResult.tasks[0].status !== 'succeeded') {
    throw new Error('Chapters Task failed');
  }
  if (jobResult.tasks[1].status !== 'succeeded') {
    throw new Error('Narratives Task failed');
  }
  if (jobResult.tasks[2].status !== 'succeeded') {
    throw new Error('Recaps Task failed');
  }

  const chapters = jobResult.tasks[0].results?.conversations[0].summaries.map((summary) => summary.text ?? '') ?? [];
  const narratives = jobResult.tasks[1].results?.conversations[0].summaries.map((summary) => summary.text ?? '') ?? [];
  const recap = jobResult.tasks[2].results?.conversations[0].summaries[0].text ?? '';

  const summarization = {
    recap: recap,
    chapters: chapters.map((chapter, index) => ({
      chapterTitle: chapter,
      narrative: narratives[index]
    }))
  };
  console.log('Summarization:', summarization);

  return summarization;
}

const requestConversationSummary = async (input: ConversationSummaryInput): Promise<SummarizeRestRequestResponse> => {
  const requestData = JSON.stringify({
    displayName: 'Conversation Task Example',
    analysisInput: {
      conversations: [
        {
          conversationItems: input.map((item, index) => ({
            text: item.text,
            id: index.toString(),
            role: 'Customer',
            participantId: item.author
          })),
          modality: 'text',
          id: 'conversation1'
        }
      ]
    },
    tasks: [
      {
        taskName: 'Conversation Task 1',
        kind: 'ConversationalSummarizationTask',
        parameters: {
          summaryAspects: ['chapterTitle']
        }
      },
      {
        taskName: 'Conversation Task 2',
        kind: 'ConversationalSummarizationTask',
        parameters: {
          summaryAspects: ['narrative']
        }
      },
      {
        taskName: 'Conversation Task 3',
        kind: 'ConversationalSummarizationTask',
        parameters: {
          summaryAspects: ['recap']
        }
      }
    ]
  });

  console.log('Request data:', requestData);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: apiHeaders(),
    body: requestData
  });
  console.log('Response:', response);

  if (!response.ok) {
    console.error('Response Failed: ', response.statusText);
    throw new Error('Summarization request failed');
  }

  const operationLocation = response.headers.get('Operation-Location');
  console.log('Operation location:', operationLocation);

  if (!operationLocation) {
    throw new Error('Operation location not found');
  }

  return {
    jobUrl: operationLocation
  };
};

const pollJobStatus = async (jobUrl: string): Promise<JobRestResponse> => {
  let jobResult = await fetchJobResult(jobUrl);

  while (jobResult.status === 'InProgress') {
    await new Promise((resolve) => setTimeout(resolve, Job_Poll_Time_Ms));
    jobResult = await fetchJobResult(jobUrl);
  }

  return jobResult;
};

const fetchJobResult = async (jobUrl: string): Promise<JobRestResponse> => {
  const response = await fetch(jobUrl, {
    method: 'GET',
    headers: apiHeaders()
  });

  const responseBody = await response.json();
  console.log('Response body:', responseBody);

  if (responseBody.status === 'running' || responseBody.status === 'notStarted' || responseBody.status === 'queued') {
    return {
      status: 'InProgress',
      tasks: responseBody.tasks.items
    };
  } else if (responseBody.status === 'succeeded') {
    return {
      status: 'Succeeded',
      tasks: responseBody.tasks.items
    };
  } else {
    return {
      status: 'Failed'
    };
  }
};

// const OLD_FUNCTIONS = async (input: ConversationSummaryInput): Promise<void> => {
//   const transcript = input.map((caption) => `${caption.author}: ${caption.text}`);
//   console.log('Transcript:', transcript);

//   const client = new TextAnalysisClient(
//     'https://ui-library-ai-language-services-test-resource.cognitiveservices.azure.com',
//     new AzureKeyCredential(getLanguageAPIKey())
//   );

//   const documentLimit = 25;
//   const charLimit = 1000;
//   const textLimit = charLimit * 5000;

//   const documents: string[] = [];
//   let currentDocument = '';
//   let currentDocumentLength = 0;
//   for (const sentence of transcript) {
//     if (currentDocumentLength + sentence.length + 2 > textLimit || documents.length >= documentLimit) {
//       documents.push(currentDocument);
//       currentDocument = '';
//       currentDocumentLength = 0;
//     }
//     currentDocument += sentence + '. ';
//     currentDocumentLength += currentDocument.length;
//   }
//   documents.push(currentDocument);
//   const documentsLimited = documents.slice(0, documentLimit);
//   console.log('Documents:', documentsLimited);

//   const sentimentResults = await client.analyze('SentimentAnalysis', transcript);
//   console.log('Sentiment analysis results:', sentimentResults);
//   const keyPhraseExtractionResults = await client.analyze('KeyPhraseExtraction', transcript, 'en');
//   console.log('Key phrase extraction results:', keyPhraseExtractionResults);

//   const actions: AnalyzeBatchAction[] = [
//     {
//       kind: 'ExtractiveSummarization',
//       maxSentenceCount: 2
//     }
//   ];
//   const poller = await client.beginAnalyzeBatch(actions, documentsLimited, 'en');
//   const results = await poller.pollUntilDone();

//   for await (const actionResult of results) {
//     if (actionResult.kind !== 'ExtractiveSummarization') {
//       throw new Error(`Expected extractive summarization results but got: ${actionResult.kind}`);
//     }
//     if (actionResult.error) {
//       const { code, message } = actionResult.error;
//       throw new Error(`Unexpected error (${code}): ${message}`);
//     }
//     for (const result of actionResult.results) {
//       console.log(`- Document ${result.id}`);
//       if (result.error) {
//         const { code, message } = result.error;
//         throw new Error(`Unexpected error (${code}): ${message}`);
//       }
//       console.log('Summary:');
//       console.log(result.sentences.map((sentence) => sentence.text).join('\n'));
//     }
//   }
// };
