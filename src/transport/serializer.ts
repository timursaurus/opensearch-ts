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
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { stringify } from "node:querystring";
import Debug from "debug";
import sjson from "secure-json-parse";
import { kJsonOptions } from "@/symbols";
import { DeserializationError, SerializationError } from "@/errors";

const debug = Debug("opensearch:transport:serializer");

export interface SerializerOptions {
  disablePrototypePoisoningProtection?: boolean | "proto" | "constructor";
}

export class Serializer {
  [kJsonOptions]: {
    protoAction: "error" | "ignore";
    constructorAction: "error" | "ignore";
  };

  constructor(options?: SerializerOptions) {
    const disable = options?.disablePrototypePoisoningProtection ?? false;
    this[kJsonOptions] = {
      protoAction: disable === true || disable === "proto" ? "ignore" : "error",
      constructorAction:
        disable === true || disable === "constructor" ? "ignore" : "error",
    };
  }

  serialize(payload: Record<string, unknown>): string {
    debug("Serializing ", payload);
    let serialized: string;
    try {
      serialized = JSON.stringify(payload);
    } catch (error) {
      const err = error as Error;
      throw new SerializationError(err.message, payload);
    }
    return serialized;
  }

  deserialize<T = unknown>(payload: string): T {
    debug("Deserializing ", payload);
    let output;
    try {
      // @ts-expect-error
      output = sjson.parse(payload, this[kJsonOptions]);
    } catch (error) {
      const err = error as Error;
      throw new DeserializationError(err.message, payload);
    }
    return output;
  }

  ndserialize(payload: (string | Record<string, unknown>)[]): string {
    debug("NDSerializing ", payload);
    if (!Array.isArray(payload)) {
      throw new SerializationError(
        "The argument provided is not an array",
        payload
      );
    }
    let output = "";
    for (let i = 0, len = payload.length; i < len; i++) {
      const value = payload[i];
      if (typeof value === "string") {
        output += payload[i] + "\n";
      } else {
        output += this.serialize(value) + "\n";
      }
    }
    return output;
  }

  qserialize(object?: Record<string, unknown> | string): string {
    debug("QSerializing ", object);
    if (object == null) {
      return "";
    }
    if (typeof object === "string") {
      return object;
    }
    const keys = Object.keys(object);
    for (let i = 0, len = keys.length; i < len; i++) {
      const key = keys[i];
      // OpenSearch will complain about keys without a value
      if (object[key] === undefined) {
        delete object[key];
      } else if (Array.isArray(object[key])) {
        object[key] = (object[key] as string[]).join(",");
      }
    }
    return stringify(object as Record<string, string>);
  }
}
