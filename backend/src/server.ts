import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import type { DbClient } from './db/client.js';
import type { Config } from './config.js';
import { getConfig } from './config.js';
import { getDbClient } from './db/client.js';
import { connectionRoutes } from './routes/connection.js';
import { charactersRoutes } from './routes/characters.js';

export interface AppContext {
  db: DbClient;
  config: Config;
}

export function buildApp(context: AppContext): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  app.decorate('appContext', context);

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      app.log.error(error);
    }
    reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal server error' : error.message,
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: 'Not found' });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(connectionRoutes, { prefix: '/api' });
  app.register(charactersRoutes, { prefix: '/api' });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    appContext: AppContext;
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  const config = getConfig();
  const db = getDbClient(config.dbPath);
  const app = buildApp({ db, config });

  app.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
