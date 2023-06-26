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
import createDebug from "debug"

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

const debug = createDebug("opensearch:pool:connection");

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

    const _strategy = options.resurrectStrategy ?? "ping";
    this.resurrectStrategy = ConnectionPool.resurrectStrategies[_strategy];

    assert(this.resurrectStrategy != null, `Invalid resurrection strategy: '${_strategy}'`);
  }

  /**
   * Marks a connection as 'dead'.
   * If needed adds the connection to the dead list
   * and then increments the `deadCount`.
   *
   * @param connection
   */
  markAlive(connection: Connection): this {
    const { id } = connection;
    debug(`Marking as 'alive' connection '${id}'`);
    const index = this.dead.indexOf(id);
    if (index > -1) {
      this.dead.splice(index, 1);
    }

    connection.status = Connection.statuses.ALIVE;
    connection.deadCount = 0;
    connection.resurrectTimeout = 0;
    return this;
  }

  /**
   * Marks a connection as 'dead'.
   * If needed, adds the connection to the dead list
   * and then increments the `deadCount`.
   *
   * @param connection
   */
  markDead(connection: Connection): this {
    const { id, deadCount } = connection;
    debug(`Marking as 'dead' connection '${id}'`);
    /**
     * It might happen that `markDead` is called just after
     * a pool update, and in such case we will add to the dead
     * list a node that no longer exist. The following check verify
     * that the connection is still part of the pool before
     * marking it as dead.
     */
    if (!this.dead.includes(id) && this.connections.some((c) => c.id === id)) {
      this.dead.push(id);
    }
    connection.status = Connection.statuses.DEAD;
    connection.deadCount += 1;

    /**
     * ResurrectTimeout formula:
     * `resurrectTimeout * 2 ** min(deadCount - 1, resurrectTimeoutCutoff)`
     */
    const _resurrectTimeout =
      Date.now() +
      this.resurrectTimeout * Math.pow(2, Math.min(deadCount - 1, this.resurrectTimeoutCutoff));

    connection.resurrectTimeout = _resurrectTimeout;

    /**
     * Sort the dead connections list in ascending order based on the
     * `resurrectTimeout` property.
     */
    this.dead.sort((a, b) => {
      const conn1 = this.connections.find((c) => c.id === a);
      const conn2 = this.connections.find((c) => c.id === b);
      if (conn1 && conn2) {
        return conn1.resurrectTimeout - conn2.resurrectTimeout;
      }
      return 0;
    });

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

  /**
   * Returns an alive connection if present,
   * otherwise returns a dead connection.
   * By default, it filters the `cluster_manager` or `master` only nodes.
   * It uses the selector to choose which
   * connection to return
   * @param options
   * @returns { Connection | null }
   */
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

  /**
   * If enabled, tries to resurrect a connection with the given
   * resurrect strategy (`'ping'`, `'optimistic'`, `'none'`).
   * @param options
   * @param callback
   * @returns {void}
   */
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
    const connection = this.connections.find((c) => c.id === this.dead[0]) as Connection;
    if ((options?.now || Date.now()) < connection?.resurrectTimeout) {
      debug("Nothing to resurrect, the timeout is not expired yet");
      callback();
      return;
    }
    const { id } = connection;

    /**
     * Ping strategy
     */
    if (this.resurrectStrategy === ConnectionPool.resurrectStrategies.ping) {
      connection.request(
        { method: "HEAD", path: "/", timeout: this.pingTimeout },
        (error, response) => {
          let _isAlive = true;
          const statusCode = response?.statusCode ?? 0;
          if (
            error != null ||
            statusCode === HTTP_STATUS_CODE.BAD_GATEWAY ||
            statusCode === HTTP_STATUS_CODE.SERVICE_UNAVAILABLE ||
            statusCode === HTTP_STATUS_CODE.GATEWAY_TIMEOUT
          ) {
            debug(`Resurrect: connection '${id}' is still dead`);
            this.markDead(connection);
            _isAlive = false;
          } else {
            debug(`Resurrect: connection '${id}' is alive`);
            this.markAlive(connection);
          }
          this.emit("resurrect", null, {
            strategy: "ping",
            name: options.name,
            request: { id: options.requestId },
            isAlive: _isAlive,
            connection,
          });
          callback(_isAlive, connection);
        }
      );
    } else {
      /**
       * Optimistic strategy
       */
      debug(`Resurrect: optimistic resurrection of connection '${id}'`);
      this.dead.splice(this.dead.indexOf(id), 1);
      this.markAlive(connection);
      const isAlive = true;
      this.emit("resurrect", null, {
        strategy: "optimistic",
        name: options.name,
        request: { id: options.requestId },
        isAlive,
        connection,
      });
      callback(isAlive, connection);
    }
  }
}
