// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import express from 'express';
import path from 'path';
import { CommunicationIdentityClient } from '@azure/communication-identity';
import { getServerConfig } from './utils/getConfig';
import { removeJsonpCallback } from './utils/removeJsonpCallback';
import { configController } from './controllers/configController';
import { tokenController } from './controllers/tokenController';
import { storeSurveyResult } from './controllers/surveyController';
import { createSurveyDBHandler } from './databaseHandlers/surveyDBHandler';
import { ERROR_PAYLOAD_500 } from './constants';

const app = express();

app.use(express.static('public'));
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
});

app.use(removeJsonpCallback);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_, res) => {
  res.redirect('book');
});

app.get('/book', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/book.html'));
});

app.get('/visit', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/visit.html'));
});

const config = getServerConfig();

const identityClient =
  process.env.NODE_ENV === 'test'
    ? ({} as CommunicationIdentityClient)
    : new CommunicationIdentityClient(config.communicationServicesConnectionString);

app.get('/api/config', configController(config));
app.get('/api/token', tokenController(identityClient, config));

const surveyDBHandler = createSurveyDBHandler(config);

if (surveyDBHandler) {
  surveyDBHandler.init();

  app.post('/api/surveyResults', storeSurveyResult(surveyDBHandler));
}

app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public/pageNotFound.html'));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).send({ error: err?.message ?? ERROR_PAYLOAD_500 });
});

export default app;
