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
import Debug from "debug";

import { BaseConnectionPool } from "@/transport/pool";
import { Connection } from "@/transport";
import { NOOP } from "@/utils";
import { HTTP_STATUS_CODE } from "@/constants";

import type {
  ConnectionPoolOptions,
  GetConnectionOptions,
  ResurrectCallback,
  ResurrectOptions,
} from "@/types/pool";

const debug = Debug("opensearch:pool:connection");

export class ConnectionPool extends BaseConnectionPool {
  static resurrectStrategies: {
    none: 0;
    ping: 1;
    optimistic: 2;
  };

  dead: string[];
  private _sniffEnabled: boolean;
  resurrectTimeout: number;
  resurrectTimeoutCutoff: number;
  pingTimeout: number;
  resurrectStrategy: number;
  constructor(options: ConnectionPoolOptions) {
    super(options);
    this.dead = [];
    this._sniffEnabled = options.sniffEnabled ?? false;
    this.resurrectTimeout = 1000 * 60;
    this.resurrectTimeoutCutoff = 5;
    this.pingTimeout = options.pingTimeout ?? 3000;
    const _resurrectStrategy = options.resurrectStrategy ?? "ping";

    this.resurrectStrategy = ConnectionPool.resurrectStrategies[_resurrectStrategy];

    assert(
      this.resurrectStrategy != null,
      `Invalid resurrection strategy: '${_resurrectStrategy}'`
    );
  }

  markAlive(connection: Connection): this {
    const { id: _id } = connection;
    debug(`Marking as 'alive' connection '${_id}'`);
    const index = this.dead.indexOf(_id);
    if (index > -1) {
      this.dead.splice(index, 1);
    }
    connection.status = Connection.statuses.ALIVE;
    connection.deadCount = 0;
    connection.resurrectTimeout = 0;
    return this;
  }

  markDead(connection: Connection): this {
    const { id: _id } = connection;
    return this;
  }

  update(connections: Connection[]): this {
    super.update(connections);
    this.dead = [];
    return this;
  }

  /**
   * Empty the connection pool.
   * @param callback
   */
  empty(callback = NOOP): void {
    super.empty(() => {
      this.dead = [];
      callback();
    });
  }

  getConnection(options: GetConnectionOptions): Connection | null {
    const filter = options.filter ?? (() => true);
    const selector = options.selector ?? ((c) => c[0]);
    const { now, requestId, name } = options;

    this.resurrect({ now, requestId, name });

    const noAliveConnections = this.size === this.dead.length;
    const connections = [];
    for (let i = 0; i < this.size; i++) {
      const _connection = this.connections[i];
      if (noAliveConnections || _connection.status === Connection.statuses.ALIVE) {
        filter(_connection) && connections.push(_connection);
      }
    }
    if (connections.length === 0) {
      return null;
    }
    return selector(connections);
  }

  // callback function overload when no args provided its optional
  // but if args are provided then callback is mandatory

  resurrect(options: ResurrectOptions, callback: ResurrectCallback = NOOP): void {
    if (this.resurrectStrategy === 0 || this.dead.length === 0) {
      debug("Nothing to resurrect");
      callback();
      return;
    }

    /**
     * the dead list is sorted in ascending order based on the timeout
     * so the first element will always be the one with the smaller timeout
     */
    const _connection = this.connections.find((c) => c.id === this.dead[0]) as Connection;
    if ((options?.now || Date.now()) < _connection?.resurrectTimeout) {
      debug("Nothing to resurrect, the timeout is not expired yet");
      callback();
      return;
    }
    const { id: _id } = _connection;

    /**
     * Ping strategy
     */
    if (this.resurrectStrategy === ConnectionPool.resurrectStrategies.ping) {
      _connection.request(
        { method: "HEAD", path: "/", timeout: this.pingTimeout },
        (_error, _response) => {
          let _isAlive = true;
          const _statusCode = _response?.statusCode ?? 0;
          if (
            _error != null ||
            _statusCode === HTTP_STATUS_CODE.BAD_GATEWAY ||
            _statusCode === HTTP_STATUS_CODE.SERVICE_UNAVAILABLE ||
            _statusCode === HTTP_STATUS_CODE.GATEWAY_TIMEOUT
          ) {
            debug(`Resurrect: connection '${_id}' is still dead`);
            this.markDead(_connection);
            _isAlive = false;
          } else {
            debug(`Resurrect: connection '${_id}' is alive`);
            this.markAlive(_connection);
          }
          this.emit("resurrect", null, {
            strategy: "ping",
            name: options.name,
            request: { id: options.requestId },
            isAlive: _isAlive,
            connection: _connection,
          });
          callback(_isAlive, _connection);
        }
      );
    }
  }
}
