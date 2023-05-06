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

import buffer from "node:buffer";
import os from "node:os";
import v8 from "node:v8";
import { EventEmitter } from "node:events";
import ms from "ms";
import { ConnectionPool } from "@/transport/pool/connection-pool";
import { CloudConnectionPool } from "@/transport/pool/cloud-connection-pool";
import { Connection, Serializer } from "@/transport";
import { kCompatibleCheck, kApiVersioning } from "@/symbols";
import type { Context, MemoryCircuitBreakerOptions, TransportOptions } from "@/types/transport";
import { ConfigurationError } from "@/errors";
import { generateRequestId, sleep, toMS } from "@/utils";

const MAX_BUFFER_LENGTH = buffer.constants.MAX_LENGTH;
const MAX_STRING_LENGTH = buffer.constants.MAX_STRING_LENGTH;
const HEAP_SIZE_LIMIT = v8.getHeapStatistics().heap_size_limit;

export class Transport {
  static sniffReasons: {
    SNIFF_ON_START: string;
    SNIFF_INTERVAL: string;
    SNIFF_ON_CONNECTION_FAULT: string;
    DEFAULT: string;
  };

  emit: (event: string | symbol, ...args: any[]) => boolean;
  connectionPool: ConnectionPool | CloudConnectionPool;
  serializer: Serializer;
  maxRetries: number;
  requestTimeout: number;
  suggestCompression: boolean;
  compression: "gzip" | false;
  sniffInterval: number;
  sniffOnConnectionFault: boolean;
  opaqueIdPrefix: string | null;
  memoryCircuitBreaker: MemoryCircuitBreakerOptions | undefined;
  sniffEndpoint: string;
  context: Context;
  name: string;

  private _sniffEnabled: boolean;
  private _nextSniff: number;
  private _isSniffing: boolean;

  constructor(options: TransportOptions) {
    const _compression = options.compression;
    if (typeof _compression === "string" && _compression !== "gzip") {
      throw new ConfigurationError(`Invalid compression: '${options.compression}'`);
    }
    this.emit = options.emit;
    this.connectionPool = options.connectionPool;
    this.serializer = options.serializer;
    this.maxRetries = options.maxRetries;
    this.requestTimeout = toMS(options.requestTimeout);
    this.suggestCompression = options.suggestCompression === true;
    this.compression = options.compression ?? false;
    this.context = options.context ?? null;
    this.headers = Object.assign({}, {});
    this.sniffInterval = options.sniffInterval;
    this.sniffOnConnectionFault = options.sniffOnConnectionFault;
    this.sniffEndpoint = options.sniffEndpoint;
    this.generateRequestId = options.generateRequestId || generateRequestId();
    this.name = options.name;
    this.opaqueIdPrefix = options.opaqueIdPrefix ?? null;

    this[kCompatibleCheck] = 0;
    this[kApiVersioning] = process.env.OPENSEARCH_CLIENT_APIVERSIONING === "true";

    this.memoryCircuitBreaker = options.memoryCircuitBreaker;
    this.nodeFilter = options.nodeFilter ?? defaultNodeFilter;
    this._sniffEnabled = typeof this.sniffInterval === "number";
    this._nextSniff = this._sniffEnabled ? Date.now() + this.sniffInterval : 0;
    this._isSniffing = false;

    if (options?.sniffOnStart) {
      sleep(10).then(() => {
        this.sniff({ reason: Transport.sniffReasons.SNIFF_ON_START });
      });
    }

    if (typeof options.nodeFilter === "function") {
      this.nodeFilter = options.nodeFilter;
    } else if (options.nodeFilter === "round-robin") {
      this.nodeFilter = roundRobinNodeFilter;
    }
    if (typeof options.nodeSelector === "function") {
      this.nodeSelector = options.nodeSelector;
    } else if (options.nodeSelector === "round-robin") {
      this.nodeSelector = roundRobinSelector();
    } else if (options.nodeSelector === "random") {
      this.nodeSelector = randomSelector;
    } else {
      this.nodeSelector = roundRobinSelector();
    }
  }
}

function defaultNodeFilter(node: Connection): boolean {
  if (
    (node.roles.cluster_manager === true || node.roles.master === true) &&
    node.roles.data === false &&
    node.roles.ingest === false
  ) {
    return false;
  }
  return true;
}
