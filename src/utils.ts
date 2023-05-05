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
import ms from "ms";
import { RequestBase } from "@/types/internal";

export function NOOP() {}

export function normalizeArguments(params: RequestBase, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (typeof params === "function" || params == null) {
    callback = params;
    params = {};
    options = {};
  }
  return [params, options, callback];
}

export function isStream(obj: any): obj is ReadableStream;
export function isStream(obj: ReadableStream): obj is ReadableStream {
  return obj != null && typeof obj.pipe === "function";
}

export function toMS(time: number | string) {
  if (typeof time === "string") {
    return ms(time);
  }
  return time;
}

export function generateRequestId() {
  const maxInt = 2_147_483_647;
  let nextReqId = 0;
  return () => (nextReqId = (nextReqId + 1) & maxInt);
}

export function lowerCaseHeaders(oldHeaders: Record<string, unknown>) {
  if (oldHeaders == null) {
    return oldHeaders;
  }
  const newHeaders: Record<string, unknown> = {};
  for (const header in oldHeaders) {
    newHeaders[header.toLowerCase()] = oldHeaders[header];
  }
  return newHeaders;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldSerialize(obj: RequestBase): boolean {
  return (
    typeof obj !== "string" && typeof obj.pipe !== "function" && Buffer.isBuffer(obj) === false
  );
}

export function roundRobinSelector() {
  let current = -1;
  return function _roundRobinSelector(connections) {
    if (++current >= connections.length) {
      current = 0;
    }
    return connections[current];
  };
}
