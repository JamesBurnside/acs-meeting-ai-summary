// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as express from 'express';
import { startGroupCallWithTranscription } from '../lib/callAutomationUtils';
import { CommunicationIdentifier } from '@azure/communication-common';

const router = express.Router();
interface StartCallWithTranscriptionRequest {
  targetCallIds: CommunicationIdentifier[];
}

router.post('/', async function (req, res, next) {
  const { targetCallIds }: StartCallWithTranscriptionRequest = req.body;
  try {
    await startGroupCallWithTranscription(targetCallIds);
  } catch (e) {
    console.error('Error starting call with transcription:', e);
    res.status(500).send('Error starting call');
    return;
  }

  res.status(200).end();
});

export default router;
