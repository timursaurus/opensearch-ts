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
import http from "node:http";
import https from "node:https";
import { inspect } from "node:util";
import { pipeline } from "node:stream";
import type { ConnectionOptions as TlsConnectionOptions } from "node:tls";

import Debug from "debug";
import hpagent from "hpagent";

import { isStream, NOOP } from "@/utils";
import type {
  ConnectionOptions,
  ConnectionRequestParams,
  ConnectionRoles,
} from "@/types/connection";
import type { BasicAuth } from "@/types/pool";
import { ConfigurationError, ConnectionError, RequestAbortedError, TimeoutError } from "@/errors";

const debug = Debug("opensearch:transport:connection");
const INVALID_PATH_REGEX = /[^\u0021-\u00FF]/;
export class Connection {
  url: URL;
  ssl: TlsConnectionOptions | null;
  id: string;
  headers: http.IncomingHttpHeaders;
  roles: ConnectionRoles;
  deadCount: number;
  resurrectTimeout: number;
  makeRequest: typeof http.request | typeof https.request;
  agent?: http.Agent | https.Agent | hpagent.HttpProxyAgent | hpagent.HttpsProxyAgent;

  static statuses: Record<string, string> = {
    ALIVE: "alive",
    DEAD: "dead",
  };

  static roles: Record<string, string> = {
    CLUSTER_MANAGER: "cluster_manager",
    /**
     * @deprecated use `CLUSTER_MANAGER` instead
     */
    MASTER: "master",
    DATA: "data",
    INGEST: "ingest",
  };

  private _openRequests: number;
  private _status: string;

  constructor(options: ConnectionOptions) {
    this.url = options.url;
    this.ssl = options.ssl ?? null;
    this.id = options.id ?? stripAuth(options.url.href);
    this.headers = prepareHeaders(options.headers ?? {}, options.auth);
    this.deadCount = 0;
    this.resurrectTimeout = 0;
    this._openRequests = 0;
    this._status = options.status ?? Connection.statuses.ALIVE;
    this.roles = Object.assign({}, defaultRoles, options.roles);
    this.makeRequest = this.url.protocol === "http:" ? http.request : https.request;

    if (!["http:", "https:"].includes(this.url.protocol)) {
      throw new ConfigurationError(`Invalid protocol: '${this.url.protocol}'`);
    }

    if (typeof options.agent === "function") {
      this.agent = options.agent(options);
    } else if (options.agent === false) {
      this.agent = undefined;
    } else {
      const _agentOptions = Object.assign(
        {},
        {
          keepAlive: true,
          keepAliveMsecs: 1000,
          maxSockets: 256,
          maxFreeSockets: 256,
          scheduling: "lifo",
        },
        options.agent
      ) as hpagent.HttpProxyAgentOptions;
      if (options.proxy) {
        _agentOptions.proxy = options.proxy;

        this.agent =
          this.url.protocol === "http:"
            ? new hpagent.HttpProxyAgent(_agentOptions)
            : new hpagent.HttpsProxyAgent(Object.assign({}, _agentOptions, this.ssl));
      } else {
        this.agent =
          this.url.protocol === "http:"
            ? new http.Agent(_agentOptions)
            : new https.Agent(Object.assign({}, _agentOptions, this.ssl));
      }
    }
  }

  close(callback = NOOP) {
    debug("Closing connection", this.id);
    if (this._openRequests > 0) {
      setTimeout(() => this.close(callback), 1000);
    } else {
      if (this.agent !== undefined) {
        this.agent.destroy();
      }
      callback();
    }
  }

  buildRequestObject(params: ConnectionRequestParams): http.ClientRequestArgs {
    const url = this.url;
    const request = {
      protocol: url.protocol,
      hostname: url.hostname[0] === "[" ? url.hostname.slice(1, -1) : url.hostname,
      hash: url.hash,
      search: url.search,
      pathname: url.pathname,
      path: "",
      href: url.href,
      origin: url.origin,
      port: url.port === "" ? undefined : url.port,
      headers: Object.assign({}, this.headers),
      agent: this.agent,
    };

    const paramsKeys = Object.keys(params);
    for (let i = 0, len = paramsKeys.length; i < len; i++) {
      const key = paramsKeys[i];
      if (key === "path") {
        const _path = params[key] as string;
        request.pathname = resolve(request.pathname, _path);
      } else if (key === "querystring" && !!params[key]) {
        if (request.search === "") {
          request.search = `?${params[key]}`;
        } else {
          request.search += `&${params[key]}`;
        }
      } else if (key === "headers") {
        request.headers = Object.assign({}, request.headers, params.headers);
      } else {
        // @ts-expect-error
        request[key] = params[key];
      }
    }

    request.path = request.pathname + request.search;

    return request;
  }

  request(
    params: ConnectionRequestParams,
    callback: (err: Error | null, response: http.IncomingMessage | null) => void
  ) {
    this._openRequests++;
    let cleanedListeners = false;
    const _requestParams = this.buildRequestObject(params);
    if (INVALID_PATH_REGEX.test(_requestParams.path as string)) {
      callback(new TypeError(`ERR_UNESCAPED_CHARACTERS: ${_requestParams.path}`), null);
      return { abort: NOOP };
    }
    debug("Starting a new request", params);
    const _request = this.makeRequest(_requestParams);

    const onResponse = (response: http.IncomingMessage) => {
      cleanListeners();
      debug("Request completed", params);
      this._openRequests--;
      callback(null, response);
    };
    const onTimeout = () => {
      cleanListeners();
      debug("Request timed out", params);
      this._openRequests--;
      _request.once("error", NOOP);
      _request.abort();
      callback(new TimeoutError("Request timed out", params), null);
    };

    const onError = (error: Error) => {
      cleanListeners();
      debug("Request errored", params);
      this._openRequests--;
      callback(new ConnectionError(error.message), null);
    };

    const onAbort = () => {
      cleanListeners();
      _request.once("error", NOOP);
      debug("Request aborted", params);
      this._openRequests--;
      callback(new RequestAbortedError("Request aborted"), null);
    };

    _request.on("response", onResponse);
    _request.on("timeout", onTimeout);
    _request.on("error", onError);
    _request.on("abort", onAbort);

    // Disable Nagle's algorithm
    _request.setNoDelay(true);

    if (isStream(params.body)) {
      pipeline(params.body, _request, (err) => {
        if (err != null && !cleanedListeners) {
          cleanListeners();
          this._openRequests--;
          callback(err, null);
        }
      });
    } else {
      _request.end(params.body);
    }

    return _request;

    function cleanListeners() {
      _request.removeListener("response", onResponse);
      _request.removeListener("timeout", onTimeout);
      _request.removeListener("error", onError);
      _request.removeListener("abort", onAbort);
      cleanedListeners = true;
    }
  }

  setRole(role: string, enabled: boolean) {
    if (!validRoles.has(role)) {
      throw new ConfigurationError(`Unsupported role: '${role}'`);
    }
    if (typeof enabled !== "boolean") {
      throw new ConfigurationError(`enabled must be a boolean, got '${typeof enabled}'`);
    }
    this.roles[role] = enabled;
    return this;
  }

  get openRequests() {
    return this._openRequests;
  }

  get status() {
    return this._status;
  }

  set status(status: string) {
    assert(~validStatuses.indexOf(status), `Unsupported status: '${status}'`);
    this._status = status;
  }

  toJSON() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { authorization, ..._headers } = this.headers;
    return {
      url: stripAuth(this.url.toString()),
      id: this.id,
      headers: _headers,
      deadCount: this.deadCount,
      resurrectTimeout: this.resurrectTimeout,
      openRequests: this._openRequests,
      status: this.status,
      roles: this.roles,
    };
  }

  [inspect.custom]() {
    return this.toJSON();
  }
}

export function stripAuth(href: string) {
  if (!href.includes("@")) {
    return href;
  }
  return href.slice(0, href.indexOf("//") + 2) + href.slice(href.indexOf("@") + 1);
}

function resolve(host: string, path: string) {
  const hostEndWithSlash = host[host.length - 1] === "/";
  const pathStartsWithSlash = path[0] === "/";

  if (hostEndWithSlash === true && pathStartsWithSlash === true) {
    return host + path.slice(1);
  } else if (hostEndWithSlash === pathStartsWithSlash) {
    return `${host}/${path}`;
  } else {
    return host + path;
  }
}

function prepareHeaders(
  headers: http.IncomingHttpHeaders,
  auth?: BasicAuth
): http.IncomingHttpHeaders {
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

const validStatuses = Object.keys(Connection.statuses).map((k) => Connection.statuses[k]);
const validRoles = new Set(Object.keys(Connection.roles).map((k) => Connection.roles[k]));
const defaultRoles = {
  [Connection.roles.DATA]: true,
  [Connection.roles.INGEST]: true,
};

export default Connection;
