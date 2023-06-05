/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";

import stoppable, { StoppableServer } from "stoppable";

import Debug from "debug";
const debug = Debug("opensearch:test");

/** allow self signed certificates for testing purposes */
// @ts-ignore
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const secureOptions = {
  key: readFileSync(new URL(path.join("..", "fixtures", "https.key"), import.meta.url), "utf8"),
  cert: readFileSync(new URL(path.join("..", "fixtures", "https.cert"), import.meta.url), "utf8"),
};

let id = 0;

export type ServiceHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

export interface ServerOptions {
  secure?: boolean;
}

export type ServerHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;
export type Server = [{ port: number }, StoppableServer];

export function buildServer(handler: ServerHandler, options: ServerOptions = {}): Promise<Server> {
  const serverId = id++;
  debug(`Booting server '${serverId}'`);

  const server = options.secure
    ? stoppable(https.createServer(secureOptions))
    : stoppable(http.createServer());

  server.on("request", handler);

  server.on("error", (err: Error) => {
    console.log("http server error", err);
    process.exit(1);
  });

  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error(`Server '${serverId}' failed to boot`);
      }
      const port = address.port;
      debug(`Server '${serverId}' booted on port ${port}`);
      resolve([Object.assign({}, secureOptions, { port }), server]);
    });
  });
}
