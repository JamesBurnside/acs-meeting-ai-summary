// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as express from 'express';
import { ConversationSummaryInput, SummarizeConversation } from '../lib/summarizationHelper';

const router = express.Router();
interface SummarizeTranscriptRequest {
  useTestData: boolean;
  transcript: ConversationSummaryInput;
}

router.post('/', async function (req, res, next) {
  const { transcript, useTestData }: SummarizeTranscriptRequest = req.body;
  const summarized = await SummarizeConversation(useTestData ? 'testdata' : transcript);
  res.send(summarized);
});

export default router;
