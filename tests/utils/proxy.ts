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

import path from "node:path";
import https from "node:https";
import http from "node:http";
import { readFileSync } from "node:fs";
import { createProxy as proxy } from "proxy";

const ssl = {
  key: readFileSync(new URL(path.join("..", "fixtures", "https.key"), import.meta.url), "utf8"),
  cert: readFileSync(new URL(path.join("..", "fixtures", "https.cert"), import.meta.url), "utf8"),
};

export function createProxy() {
  return new Promise((resolve) => {
    const server = proxy(http.createServer());
    server.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

export function createSecureProxy() {
  return new Promise((resolve) => {
    const server = proxy(https.createServer(ssl));
    server.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

export function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

export function createSecureServer() {
  return new Promise((resolve) => {
    const server = https.createServer(ssl);
    server.listen(0, "127.0.0.1", () => {
      resolve(server);
    });
  });
}
