// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as express from 'express';
import { ConversationSummaryInput, SummarizeConversation } from '../lib/summarizationHelper';

const router = express.Router();
interface SummarizeTranscriptRequest {
  transcript: ConversationSummaryInput;
}

router.post('/', async function (req, res, next) {
  try {
    const { transcript }: SummarizeTranscriptRequest = req.body;
    const summarized = await SummarizeConversation(transcript);
    res.send(summarized);
  } catch (error) {
    console.error('Error in summarizeTranscript:', error);
    res.status(500).send('Error. Failed to summarize transcript');
  }
});

export default router;
