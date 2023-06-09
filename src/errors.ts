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

import type { ErrorCause, ErrorResponseBase } from "@/types/internal";
import type { APIResponse, Context } from "@/types/transport";

export class OpenSearchClientError extends Error {
  name: string;
  constructor(message: string) {
    super(message);
    this.name = "OpenSearchClientError";
  }
}

export class TimeoutError<
  TResponse = Record<string, unknown>,
  TContext = Context
> extends OpenSearchClientError {
  name: string;
  message: string;
  meta?: APIResponse<TResponse, TContext>;
  constructor(message = "Timeout Error", meta?: APIResponse<TResponse, TContext>) {
    super(message);
    Error.captureStackTrace(this, TimeoutError);
    this.name = "TimeoutError";
    this.message = message;
    this.meta = meta;
  }
}

export class ConnectionError<
  TResponse = Record<string, unknown>,
  TContext = Context
> extends OpenSearchClientError {
  name: string;
  message: string;
  meta?: APIResponse<TResponse, TContext>;
  constructor(message = "Connection Error", meta?: APIResponse<TResponse, TContext>) {
    super(message);
    Error.captureStackTrace(this, ConnectionError);
    this.name = "ConnectionError";
    this.message = message;
    this.meta = meta;
  }
}

export class NoLivingConnectionsError<
  TResponse = Record<string, unknown>,
  TContext = Context
> extends OpenSearchClientError {
  name: string;
  message: string;
  meta?: APIResponse<TResponse, TContext>;
  constructor(
    message = "Given the configuration, the ConnectionPool was not able to find a usable Connection for this request.",
    meta?: APIResponse<TResponse, TContext>
  ) {
    super(message);
    Error.captureStackTrace(this, NoLivingConnectionsError);
    this.name = "NoLivingConnectionsError";
    this.message = message;
    this.meta = meta;
  }
}

export class SerializationError extends OpenSearchClientError {
  name: string;
  message: string;
  data: Record<string, unknown>;
  constructor(message = "Serialization Error", data: Record<string, unknown>) {
    super(message);
    Error.captureStackTrace(this, SerializationError);
    this.name = "SerializationError";
    this.message = message;
    this.data = data;
  }
}

export class DeserializationError extends OpenSearchClientError {
  name: string;
  message: string;
  data: string;
  constructor(message = "Deserialization Error", data: string) {
    super(message);
    Error.captureStackTrace(this, DeserializationError);
    this.name = "DeserializationError";
    this.message = message;
    this.data = data;
  }
}

export class ConfigurationError extends OpenSearchClientError {
  constructor(message = "Configuration Error") {
    super(message);
    Error.captureStackTrace(this, ConfigurationError);
    this.name = "ConfigurationError";
    this.message = message;
  }
}

export class ResponseError<
  TResponse = Record<string, unknown>,
  TContext = Context
> extends OpenSearchClientError {
  name: string;
  message: string;
  meta: APIResponse<TResponse, TContext>;
  constructor(meta: APIResponse) {
    super("Response Error");
    Error.captureStackTrace(this, ResponseError);
    this.name = "ResponseError";
    const error = meta.body.error as ErrorCause;
    if (error?.type) {
      if (Array.isArray(error.root_cause)) {
        this.message = `${error.type}: ${error.root_cause
          .map((entry) => `[${entry.type}] Reason: ${entry.reason}`)
          .join("; ")}`;
      } else {
        this.message = error.type;
      }
    } else {
      this.message = "Response Error";
    }
    this.meta = meta as APIResponse<TResponse, TContext>;
  }

  get body() {
    return this.meta?.body;
  }

  get statusCode() {
    const body = this.meta?.body as ErrorResponseBase;
    if (typeof body === "object" && typeof body.status === "number") {
      return body.status;
    }
    return this.meta?.statusCode;
  }

  get headers() {
    return this.meta?.headers;
  }

  toString() {
    return JSON.stringify(this.meta?.body);
  }
}

export class RequestAbortedError<
  TResponse = Record<string, unknown>,
  TContext = Context
> extends OpenSearchClientError {
  name: string;
  message: string;
  meta?: APIResponse<TResponse, TContext>;
  constructor(message = "Request aborted", meta?: APIResponse<TResponse, TContext>) {
    super(message);
    Error.captureStackTrace(this, RequestAbortedError);
    this.name = "RequestAbortedError";
    this.message = message;
    this.meta = meta;
  }
}

export class NotCompatibleError<
  TResponse = Record<string, unknown>,
  TContext = Context
> extends OpenSearchClientError {
  meta?: APIResponse<TResponse, TContext>;
  constructor(meta?: APIResponse<TResponse, TContext>) {
    super("Not Compatible Error");
    Error.captureStackTrace(this, NotCompatibleError);
    this.name = "NotCompatibleError";
    this.message = "The client noticed that the server is not a supported distribution";
    this.meta = meta;
  }
}
