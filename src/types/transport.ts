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

import { Readable as ReadableStream } from "node:stream";
import * as errors from "@/errors";
import { Serializer } from "@/transport";

export type APIError =
  | errors.ConfigurationError
  | errors.ConnectionError
  | errors.DeserializationError
  | errors.SerializationError
  | errors.NoLivingConnectionsError
  | errors.ResponseError
  | errors.TimeoutError
  | errors.RequestAbortedError
  | errors.NotCompatibleError;

export interface APIResponse<TResponse = Record<string, unknown>, TContext = Context>
  extends RequestEvent<TResponse, TContext> {}

export type Context = unknown;

export interface MemoryCircuitBreakerOptions {
  enabled: boolean;
  maxPercentage: number;
}

export interface RequestEvent<TResponse = Record<string, any>, TContext = Context> {
  body: TResponse;
  statusCode: number | null;
  headers: Record<string, any> | null;
  warnings: string[] | null;
  meta: {
    context: TContext;
    name: string | symbol;
    request: {
      params: TransportRequestParams;
      options: TransportRequestOptions;
      id: any;
    };
    connection: Connection;
    attempts: number;
    aborted: boolean;
    sniff?: {
      hosts: any[];
      reason: string;
    };
  };
}

export interface TransportGetConnectionOptions {
  requestId: string;
}

export interface TransportSniffOptions {
  reason: string;
  requestId?: string;
}
