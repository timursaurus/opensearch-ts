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

import { Readable } from "node:stream";
import { promisify } from "node:util";

import { NOOP } from "@/utils";
import type { BulkHelper, HelpersOptions, BulkStats } from "@/types/helpers";
import { kClient, kMaxRetries, kMetaHeader } from "@/symbols";
import { Client } from "@/client";

const immediate = promisify(setImmediate);
const sleep = promisify(setTimeout);

export class Helpers {
  [kMetaHeader]: string | null;
  [kClient]: Client;
  [kMaxRetries]: number;
  constructor(options: HelpersOptions) {
    this[kMetaHeader] = options.metaHeader;
    this[kClient] = options.client;
    this[kMaxRetries] = options.maxRetries;
  }

  search(params, options) {}

  scrollSearch(params, options) {}

  msearch() {}

  bulk<TDocument = unknown>(options, requestOptions): BulkHelper<BulkStats> {}
}
export default Helpers;
