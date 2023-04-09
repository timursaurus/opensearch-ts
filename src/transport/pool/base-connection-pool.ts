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

import { URL } from "node:url";
import type { SecureContextOptions } from "node:tls";
import Debug from "debug";
import { Connection } from "@/transport";

import { NOOP } from "@/utils";
import { ConfigurationError } from "@/errors";
const debug = Debug("opensearch:pool:base-connection");

export class BaseConnectionPool {
  connections: Connection[];
  size: number;
  emit: (event: string | symbol, ...args: any[]) => boolean;

  constructor() {}

  getConnection(options): Connection | null {
    throw new ConfigurationError("getConnection must be implemented.");
  }

  markAlive(connection: Connection) {
    connection.status = Connection.statuses.ALIVE;
    return this;
  }

  markDead(connection: Connection): this {
    connection.status = Connection.statuses.DEAD;
    return this;
  }

  createConnection(options) {}

  addConnection(options) {}

  removeConnection(connection: Connection) {
    debug("Removing connection");
  }

  empty(callback = NOOP) {
    debug("Emptying the connection pool");
  }

  update(nodes: Connection[]) {}

  nodesToHost(nodes: Connection[], protocol) {}
}

export default BaseConnectionPool;
