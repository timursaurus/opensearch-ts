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
import type { ConnectionOptions as TLSConnectionOptions } from "node:tls";

import createDebug from "debug";
import hpagent from "hpagent";

import type {
  ConnectionOptions,
  ConnectionRequestParams,
  ConnectionRoles,
} from "@/types/connection";

import { ConfigurationError, ConnectionError, RequestAbortedError, TimeoutError } from "@/errors";
import { isStream, NOOP, prepareHeaders, resolvePathname, stripAuth } from "@/utils";

const debug = createDebug("opensearch:transport:connection");
const INVALID_PATH_REGEX = /[^\u0021-\u00FF]/;
export class Connection {
  url: URL;
  ssl: TLSConnectionOptions | null;
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
    this._status = options.status || Connection.statuses.ALIVE;
    this.roles = Object.assign({}, defaultRoles, options.roles);

    if (!["http:", "https:"].includes(this.url.protocol)) {
      throw new ConfigurationError(`Invalid protocol: '${this.url.protocol}'`);
    }
    const isHttp = this.url.protocol === "http:";

    if (typeof options.agent === "function") {
      this.agent = options.agent(options);
    } else if (options.agent === false) {
      this.agent = undefined;
    } else {
      const agentOptions = Object.assign(
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
        agentOptions.proxy = options.proxy;

        this.agent = isHttp
          ? new hpagent.HttpProxyAgent(agentOptions)
          : new hpagent.HttpsProxyAgent(Object.assign({}, agentOptions, this.ssl));
      } else {
        this.agent = isHttp
          ? new http.Agent(agentOptions)
          : new https.Agent(Object.assign({}, agentOptions, this.ssl));
      }
    }

    this.makeRequest = isHttp ? http.request : https.request;
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
        request.pathname = resolvePathname(request.pathname, params[key] as string);
      } else if (key === "querystring" && Boolean(params[key])) {
        if (request.search === "") {
          request.search = "?" + params[key];
        } else {
          request.search += "&" + params[key];
        }
      } else if (key === "headers") {
        request.headers = Object.assign({}, request.headers, params.headers);
      } else {
        // @ts-ignore
        request[key] = params[key];
      }
    }

    request.path = request.pathname + request.search;

    return request;
  }

  request(
    params: ConnectionRequestParams,
    callback: (err: Error | null, response: http.ServerResponse | null) => void
  ) {
    this._openRequests++;
    let cleanedListeners = false;
    const requestParams = this.buildRequestObject(params);
    if (INVALID_PATH_REGEX.test(requestParams.path as string) === true) {
      callback(new TypeError(`ERR_UNESCAPED_CHARACTERS: ${requestParams.path}`), null);
      return { abort: NOOP };
    }

    debug("Starting a new request", params);
    const request = this.makeRequest(requestParams);

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
      request.once("error", NOOP);
      request.abort();
      // TODO: This should be a TimeoutError
      // callback(new TimeoutError("Request timed out", params), null);
      callback(new TimeoutError("Request timed out"), null);
    };

    const onError = (error: Error) => {
      cleanListeners();
      debug("Request errored", params);
      this._openRequests--;
      callback(new ConnectionError(error.message), null);
    };

    const onAbort = () => {
      cleanListeners();
      request.once("error", NOOP);
      debug("Request aborted", params);
      this._openRequests--;
      callback(new RequestAbortedError("Request aborted"), null);
    };

    request.on("response", onResponse);
    request.on("timeout", onTimeout);
    request.on("error", onError);
    request.on("abort", onAbort);

    // Disable Nagle's algorithm
    request.setNoDelay(true);

    if (isStream(params.body)) {
      pipeline(params.body, request, (err) => {
        if (err != null && cleanedListeners === false) {
          cleanListeners();
          this._openRequests--;
          callback(err, null);
        }
      });
    } else {
      request.end(params.body);
    }

    function cleanListeners() {
      request.removeListener("response", onResponse);
      request.removeListener("timeout", onTimeout);
      request.removeListener("error", onError);
      request.removeListener("abort", onAbort);
      cleanedListeners = true;
    }
    // console.log("request", request);

    return request;
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
    const { authorization, ...headers } = this.headers;
    return {
      url: stripAuth(this.url.toString()),
      id: this.id,
      headers,
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

const validStatuses = Object.keys(Connection.statuses).map((k) => Connection.statuses[k]);
const validRoles = new Set(Object.keys(Connection.roles).map((k) => Connection.roles[k]));
const defaultRoles = {
  [Connection.roles.DATA]: true,
  [Connection.roles.INGEST]: true,
};

export default Connection;
