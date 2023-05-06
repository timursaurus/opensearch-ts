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
import type { SecureContextOptions, ConnectionOptions as TLSConnectionOptions } from "node:tls";
import Debug from "debug";
import { Connection } from "@/transport";

import { NOOP } from "@/utils";
import { ConfigurationError } from "@/errors";
import { AgentOptions, ConnectionOptions, ConnectionRoles } from "@/types/connection";
import { BasicAuth } from "@/types/pool";

const debug = Debug("opensearch:pool:base-connection");

export interface BaseConnectionPoolOptions {
  ssl?: SecureContextOptions;
  agent?: AgentOptions;
  proxy?: string | URL;
  auth?: BasicAuth;
  emit: (event: string | symbol, ...args: any[]) => boolean;
  Connection: typeof Connection;
}

export interface NodeSelectorFn {
  (connections: Connection[]): Connection;
}

export interface NodeFilterFn {
  (connection: Connection): boolean;
}

export interface GetConnectionOptions {
  filter?: NodeFilterFn;
  selector?: NodeSelectorFn;
  requestId: string | number;
  name: string;
  now: number;
}

export class BaseConnectionPool {
  connections: Connection[];
  size: number;
  emit: (event: string | symbol, ...args: any[]) => boolean;
  private _ssl?: SecureContextOptions;
  private _agent?: AgentOptions;
  private _proxy?: string | URL;

  constructor(options: BaseConnectionPoolOptions) {
    this.connections = [];
    this.size = this.connections.length;
    this.emit = options.emit ?? NOOP;

    this._ssl = options.ssl;
    this._agent = options.agent;
    this._proxy = options.proxy;
  }

  getConnection(options: GetConnectionOptions): Connection | null {
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

  addConnection(options: ConnectionOptions) {}

  removeConnection(connection: Connection) {
    debug("Removing connection");
  }

  empty(callback = NOOP) {
    debug("Emptying the connection pool");
  }

  update(nodes: Connection[]) {}

  nodesToHost(nodes: Connection[], protocol) {}

  urlToHost(url: string) {
    return {
      url: new URL(url),
    };
  }
}

export default BaseConnectionPool;
