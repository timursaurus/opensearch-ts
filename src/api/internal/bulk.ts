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

import { Transport } from "@/transport";
import { CallbackFn } from "@/types/client";
import { BulkRequest, BulkResponse } from "@/types/internal";

export class BulkImpl {
  constructor(protected transport: Transport) {
    this.transport = transport;
  }
  /**
   * The bulk operation lets you add, update, or delete many documents in a single request.
   * Compared to individual OpenSearch indexing requests, the bulk operation has significant performance benefits.
   * Whenever practical, we recommend batching indexing operations into bulk requests.
   * <br/> See Also: {@link https://opensearch.org/docs/latest/api-reference/document-apis/bulk/|OpenSearch - Bulk}
   *
   * @memberOf API-Document
   * @param params
   * @param options
   * @param callback
   */
  async bulk<TSource = unknown, TContext = unknown>(
    params: BulkRequest<TSource>,
    options: TransportRequestOptions
  ): TransportRequestPromise;
  bulk<TSource = unknown, TContext = unknown>(
    params: BulkRequest<TSource>,
    callback: CallbackFn<BulkResponse, TContext>
  ): TransportRequestCallback;
  bulk<TSource = unknown, TContext = unknown>(
    params: BulkRequest<TSource>,
    options: TransportRequestOptions,
    callback: CallbackFn<BulkResponse, TContext>
  ): TransportRequestCallback {
    // implementation
    // return this.transport(params, options, callback)
  }
}
