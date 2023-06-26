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

import { inspect } from "node:util";
import { URL } from "node:url";
import http, { Agent, IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import hpagent from "hpagent";
import { describe, it, expect } from "vitest";
import { buildServer } from "../utils/server";

import { Connection } from "@/transport";
import { TimeoutError } from "@/errors";

describe("Connection", () => {
  it("http", async () => {
    function handler(req: IncomingMessage, res: ServerResponse) {
      // throw new Error("Method not implemented.");
      res.end("ok");
    }

    const [{ port }, server] = await buildServer(handler);

    const connection = new Connection({
      url: new URL(`http://localhost:${port}`),
    });
    // console.log("connection", connection);
    connection.request(
      {
        path: "/hello",
        method: "GET",
        headers: {
          "X-Custom-Test": true,
        },
      },
      (err, response) => {
        // throw new Error("Not working");
        expect(err).toBe(null);


        expect(response?.headers).toMatchObject({
          connection: "keep-alive",
        });

        if (response) {
          let payload = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            payload += chunk;
          });
          response.on("error", (err) => {
            throw err;
          });
          response.on("end", () => {
            expect(payload).toBe("ok");
            server.stop();
          });
        }
      }
    );
  });
  it("https", async () => {
    function handler(req: IncomingMessage, res: ServerResponse) {
      res.end("ok");
    }

    const [{ port }, server] = await buildServer(handler);

    const connection = new Connection({
      url: new URL(`https://localhost:${port}`),
    });
    // console.log("connection", connection);
    connection.request(
      {
        path: "/hello",
        method: "GET",
        headers: {
          "X-Custom-Test": true,
        },
      },
      (err, response) => {
        throw new Error("Not working");
        expect(err).toBe(null);
        expect(response?.headers).toMatchObject({
          connection: "keep-alive",
        });

        if (response) {
          let payload = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            payload += chunk;
          });
          // response.on("error", (err) => t.fail(err));
          response.on("error", () => {
            throw new Error("error");
          });

          response.on("end", () => {
            expect(payload).toBe("ok");

            server.stop();
          });
        }
      }
    );
  });
  it("Timeout", async () => {
    function handler(req: IncomingMessage, res: ServerResponse) {
      setTimeout(() => res.end("ok"), 1000);
    }

    const [{ port }, server] = await buildServer(handler);

    const connection = new Connection({
      url: new URL(`http://localhost:${port}`),
    });

    connection.request(
      {
        path: "/hello",
        method: "GET",
        timeout: 500,
      },
      (err) => {
        expect(err).toBeInstanceOf(TimeoutError);
        server.stop();
      }
    );
  });

  describe("querystring", () => {
    it("Should concatenate the querystring", () => {
      function handler(req: IncomingMessage, res: ServerResponse) {
        throw new Error("Method not implemented.");
        expect(req.url).toBe("/hello?hello=world&you_know=for%20search");
        res.end("ok");
      }

      buildServer(handler).then(([{ port }, server]) => {
        const connection = new Connection({
          url: new URL(`http://localhost:${port}`),
        });

        connection.request(
          {
            path: "/hello",
            method: "GET",
            querystring: "hello=world&you_know=for%20search",
          },
          (err) => {
            expect(err).toBe(null);
            server.stop();
          }
        );
      });
    });
  });
});
