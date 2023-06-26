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
import createDebug from "debug"
import { Connection } from "@/transport";

import { NOOP } from "@/utils";
import { ConfigurationError } from "@/errors";
import { AgentOptions, ConnectionOptions, ConnectionRoles } from "@/types/connection";
import { BasicAuth } from "@/types/pool";

const debug = createDebug("opensearch:pool:base-connection");

export interface BaseConnectionPoolOptions {
  ssl?: SecureContextOptions;
  agent?: AgentOptions;
  proxy?: string | URL;
  auth?: BasicAuth;
  emit: (event: string | symbol, ...args: any[]) => boolean;
  Connection: typeof Connection;
}

export type NodeSelectorFn = (connections: Connection[]) => Connection;

export type NodeFilterFn = (connection: Connection) => boolean;

export type GenerateRequestIdFn = () => number;

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
  auth?: BasicAuth;
  Connection: typeof Connection;

  constructor(options: BaseConnectionPoolOptions) {
    this.connections = [];
    this.size = this.connections.length;
    this.emit = options.emit ?? NOOP;
    this.Connection = options.Connection;
    this.auth = options.auth;
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

  /**
   * Creates a new connection instance.
   */
  createConnection(options: ConnectionOptions | string) {
    if (options instanceof Connection) {
      throw new ConfigurationError("The argument provided is already a Connection instance.");
    }
    if (typeof options === "string") {
      options = this.urlToHost(options);
    }

    if (this.auth !== null) {
      options.auth = this.auth;
    } else if (options.url.username !== "" && options.url.password !== "") {
      options.auth = {
        username: decodeURIComponent(options.url.username),
        password: decodeURIComponent(options.url.password),
      };
    }

    if (options.ssl == null) {
      options.ssl = this._ssl;
    }

    if (options.agent == null) {
      options.agent = this._agent;
    }

    if (options.proxy == null) {
      options.proxy = this._proxy;
    }

    const connection = new this.Connection(options);

    for (const conn of this.connections) {
      if (conn.id === connection.id) {
        throw new Error(`Connection with id '${connection.id}' is already present`);
      }
    }

    return connection;
  }

  addConnection(options: ConnectionOptions | ConnectionOptions[] | string) {
    if (Array.isArray(options)) {
      for (const o of options) {
        this.addConnection(o);
      }
      return;
    }
    if (typeof options === "string") {
      options = this.urlToHost(options);
    }

    const connectionId = options.id;
    const connectionUrl = options.url.href;

    if (connectionId || connectionUrl) {
      const connectionById = this.connections.find((c) => c.id === connectionId);
      const connectionByUrl = this.connections.find((c) => c.id === connectionUrl);

      if (connectionById || connectionByUrl) {
        throw new ConfigurationError(
          `Connection with id '${connectionId || connectionUrl}' is already present`
        );
      }
    }

    this.update([...this.connections, options]);
    return this.connections[this.size - 1];
  }

  removeConnection(connection: Connection) {
    debug("Removing connection");
  }

  empty(callback = NOOP) {
    debug("Emptying the connection pool");
  }

  update(nodes: Connection[]) {
    debug("Updating the connection pool");
    const newConnections = [];
    const oldConnections = [];

    for (const node of nodes) {
      // if we already have a given connection in the pool
      // we mark it as alive and we do not close the connection
      // to avoid socket issues
      const connectionById = this.connections.find((c) => c.id === node.id);
      const connectionByUrl = this.connections.find((c) => c.id === node.url.href);
      if (connectionById) {
        debug(`The connection with id '${node.id}' is already present`);
        this.markAlive(connectionById);
        newConnections.push(connectionById);
        // in case the user has passed a single url (or an array of urls),
        // the connection id will be the full href; to avoid closing valid connections
        // because are not present in the pool, we check also the node url,
        // and if is already present we update its id with the opensearch provided one.
      } else if (connectionByUrl) {
        connectionByUrl.id = node.id;
        this.markAlive(connectionByUrl);
        newConnections.push(connectionByUrl);
      } else {
        newConnections.push(this.createConnection(node));
      }
    }

    const ids = nodes.map((c) => c.id);
    // remove all the dead connections and old connections
    for (const connection of this.connections) {
      if (ids.indexOf(connection.id) === -1) {
        oldConnections.push(connection);
      }
    }

    // close old connections
    oldConnections.forEach((connection) => connection.close());

    this.connections = newConnections;
    this.size = this.connections.length;

    return this;
  }

  nodesToHost(nodes: Connection[], protocol) {}

  urlToHost(url: string) {
    return {
      url: new URL(url),
    };
  }
}

export default BaseConnectionPool;
