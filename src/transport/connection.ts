/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
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

import assert from "node:assert";
import http from "node:http";
import https from "node:https";
import { pipeline } from "node:stream";
import { inspect } from "node:util";
import type { ConnectionOptions as TlsConnectionOptions } from "node:tls";

import Debug from "debug";
import hpagent from "hpagent";
import { NOOP } from "@/utils";

const debug = Debug("opensearch:transport:connection");

export class Connection {
  url: URL;
  ssl: TlsConnectionOptions | null,
  id: string;
  headers: Record<string, string>;
  // roles
  deadCount: number;
  resurrectTimeout: number;
  makeRequest: typeof http.request | typeof https.request;
  openRequests: number;
  status: string
  agent: http.Agent | https.Agent | hpagent.HttpProxyAgent | hpagent.HttpsProxyAgent;
  static statuses: Record<string, string> = {
    ALIVE: 'alive',
    DEAD: 'dead',
  };
  static roles: Record<string, string> = {
    CLUSTER_MANAGER: 'cluster_manager',
    /**
     * @deprecated use `CLUSTER_MANAGER` instead
     */
    MASTER: 'master',
    DATA: 'data',
    INGEST: 'ingest',
  };
  constructor(options) {

  }

}