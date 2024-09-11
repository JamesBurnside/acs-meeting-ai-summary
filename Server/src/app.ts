// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import express from 'express';
import cors from 'cors';
import createError from 'http-errors';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import path from 'path';

import issueToken from './routes/issueToken';
import refreshToken from './routes/refreshToken';
import summarizeTranscript from './routes/summarizeTranscript';

const app = express();

app.use(logger('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, 'build')));

/**
 * route: /api/refreshToken
 * purpose: Chat,Calling: get a new token
 */
app.use('/api/refreshToken', cors(), refreshToken);

/**
 * route: /api/token
 * purpose: Chat,Calling: get ACS token with the given scope
 */
app.use('/api/token', cors(), issueToken);

/**
 * route: /api/summarizeTranscript
 * purpose: Receives a transcript and sends to AI summarization service
 */
app.use('/api/summarizeTranscript', cors(), summarizeTranscript);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

export default app;
