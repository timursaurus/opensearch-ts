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
import type { IncomingHttpHeaders } from "node:http";
import ms from "ms";
import type { NodeSelectorFn } from "./transport/pool";
import { Connection } from "./transport";
import { BasicAuth } from "./types/pool";
import type { RequestBase } from "@/types/internal";

export function NOOP() {}

export function normalizeArguments(
  params: RequestBase,
  options: Record<string, unknown>,
  callback: () => void
): [RequestBase, Record<string, unknown>, () => void];
export function normalizeArguments(
  params: RequestBase,
  options: Record<string, unknown>
): [RequestBase, Record<string, unknown>, () => void];
export function normalizeArguments(
  params: RequestBase,
  callback: () => void
): [RequestBase, Record<string, unknown>, () => void];
export function normalizeArguments(
  callback: () => void
): [RequestBase, Record<string, unknown>, () => void];

export function normalizeArguments(
  callback: () => void
): [RequestBase, Record<string, unknown>, () => void];

export function normalizeArguments(
  params: RequestBase | (() => void),
  options?: Record<string, unknown> | (() => void),
  callback = NOOP
): [RequestBase, Record<string, unknown>, () => void] {
  if (typeof options === "function") {
    callback = options as () => void;
    options = {};
  }
  if (typeof params === "function" || params == null) {
    callback = params as () => void;
    params = {};
    options = {};
  }
  return [params as RequestBase, options as Record<string, unknown>, callback];
}

export function isStream(obj: any): obj is ReadableStream;
export function isStream(obj: ReadableStream): obj is ReadableStream {
  return obj != null && typeof obj.pipe === "function";
}

export function shouldSerialize(obj: any): boolean;
export function shouldSerialize(obj: ReadableStream): boolean {
  return (
    typeof obj !== "string" && typeof obj.pipe !== "function" && Buffer.isBuffer(obj) === false
  );
}

export function isAsyncIterator<T = unknown>(obj: any): obj is AsyncIterator<T> {
  return obj != null && typeof obj[Symbol.asyncIterator] === "function";
}

export function toMS(time: number | string) {
  if (typeof time === "string") {
    return ms(time);
  }
  return time;
}

export function generateRequestId(): () => number {
  const maxInt = 2_147_483_647;
  let nextReqId = 0;
  return () => (nextReqId = (nextReqId + 1) & maxInt);
}

export function lowerCaseHeaders(oldHeaders: Record<string, unknown>): Record<string, unknown> {
  if (oldHeaders == null) {
    return oldHeaders;
  }
  const newHeaders: Record<string, unknown> = {};
  for (const header in oldHeaders) {
    const lowerCasedHeader = typeof header === "string" ? header.toLowerCase() : header;
    newHeaders[lowerCasedHeader] = oldHeaders[header];
  }
  return newHeaders;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function roundRobinSelector(): NodeSelectorFn {
  let current = -1;
  return function _roundRobinSelector(connections: Connection[]): Connection {
    if (++current >= connections.length) {
      current = 0;
    }
    return connections[current];
  };
}

export function randomSelector(connections: Connection[]) {
  const index = Math.floor(Math.random() * connections.length);
  return connections[index];
}

export function validateMemoryPercentage(percentage: number) {
  if (percentage < 0 || percentage > 1) {
    return 1;
  }
  return percentage;
}

export function appendFilterPath(filter: string, params: Record<string, unknown>, force: boolean) {
  if (params.filter_path !== undefined) {
    params.filter_path += "," + filter;
  } else if (params.filterPath !== undefined) {
    params.filterPath += "," + filter;
  } else if (force === true) {
    params.filter_path = filter;
  }
}

export function stripAuth(url: string) {
  if (!url.includes("@")) {
    return url;
  }
  return url.slice(0, url.indexOf("//") + 2) + url.slice(url.indexOf("@") + 1);
}

export function resolvePathname(host: string, path: string) {
  const hostEndWithSlash = host[host.length - 1] === "/";
  const pathStartsWithSlash = path[0] === "/";

  if (hostEndWithSlash === true && pathStartsWithSlash === true) {
    return host + path.slice(1);
  } else if (hostEndWithSlash === pathStartsWithSlash) {
    return host + "/" + path;
  } else {
    return host + path;
  }
}

// export function prepareHeaders(headers: Record<string, unknown> = {}, auth?: BasicAuth) {
//   if (auth != null && headers.authorization == null && auth.username && auth.password) {
//     headers.authorization =
//       "Basic " + Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
//   }
//   return headers;
// }
export function prepareHeaders(
  headers: IncomingHttpHeaders,
  auth?: BasicAuth
): IncomingHttpHeaders {
  if (
    auth != null &&
    headers.authorization == null &&
    auth.username != null &&
    auth.password != null
  ) {
    const _auth = `${auth.username}:${auth.password}`;
    const authBuffer = Buffer.from(_auth, "utf8");
    headers.authorization = `Basic ${authBuffer.toString("base64")}`;
  }
  return headers;
}
