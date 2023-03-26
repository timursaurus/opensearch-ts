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

// ping<TContext = unknown>(
//   params?: T.PingRequest,
//   options?: TransportRequestOptions
// ): TransportRequestPromise<ApiResponse<T.PingResponse, TContext>>;
// ping<TContext = unknown>(
//   callback: callbackFn<T.PingResponse, TContext>
// ): TransportRequestCallback;
// ping<TContext = unknown>(
//   params: T.PingRequest,
//   callback: callbackFn<T.PingResponse, TContext>
// ): TransportRequestCallback;
// ping<TContext = unknown>(
//   params: T.PingRequest,
//   options: TransportRequestOptions,
//   callback: callbackFn<T.PingResponse, TContext>
// ): TransportRequestCallback;

import { Transport } from "@/transport";
import { PingRequest } from "@/types/internal";
import { normalizeArguments } from "@/utils";

export class PingImpl {
  constructor(protected transport: Transport) {
    this.transport = transport;
  }

  ping(params: PingRequest, options: TransportRequestOptions, callback) {
    [params, options, callback] = normalizeArguments(params, options, callback);

    let { method, body, ...querystring } = params;
    const path = "/";
    if (method == null) {
      method = "HEAD";
    }

    const request = {
      method:'HEAD',
      path,
      body: null,
      querystring,
    }

    return this.transport;
  }
}

export default PingImpl;
