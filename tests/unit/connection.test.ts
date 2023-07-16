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
import { IncomingMessage, ServerResponse } from "node:http";
import { describe, it, expect } from "vitest";
import { buildServer } from "../utils/server";

import { Connection } from "@/transport";
import { ConfigurationError, TimeoutError } from "@/errors";

describe("Connection", () => {
  it("http", async () => {
    function handler(req: IncomingMessage, res: ServerResponse) {
      expect(req.headers).toMatchObject({
        "x-custom-test": "true",
        connection: "keep-alive",
      });
      res.end("ok");
    }

    const [{ port }, server] = await buildServer(handler);

    const connection = new Connection({
      url: new URL(`http://localhost:${port}`),
    });

    await new Promise((resolve, reject) => {
      const request = connection.request(
        {
          path: "/hello",
          method: "GET",
          headers: {
            "x-custom-test": "true",
          },
        },
        (err, response) => {
          if (err) {
            reject(err);
            return;
          }
          expect(response?.headers).toMatchObject({
            connection: "keep-alive",
          });

          let payload = "";
          response?.setEncoding("utf8");
          response?.on("data", (chunk) => {
            payload += chunk;
          });
          response?.on("error", (err) => {
            reject(err);
          });
          response?.on("end", () => {
            expect(payload).toBe("ok");
            server.stop();
            resolve(true);
          });
        }
      );

      request.on("error", (err) => {
        reject(err);
      });

      request.end();
    });
  });

  // it("https", async () => {
  //   function handler(req: IncomingMessage, res: ServerResponse) {
  //     expect(req.headers).toMatchObject({
  //       "x-custom-test": "true",
  //       connection: "keep-alive",
  //     });
  //     res.end("ok");
  //   }

  //   const [{ port }, server] = await buildServer(handler, { secure: true });

  //   const connection = new Connection({
  //     url: new URL(`https://localhost:${port}`),
  //   });

  //   await new Promise((resolve, reject) => {
  //     const request = connection.request(
  //       {
  //         path: "/hello",
  //         method: "GET",
  //         headers: {
  //           "x-custom-test": "true",
  //         },
  //       },
  //       (err, response) => {
  //         if (err) {
  //           reject(err);
  //           throw err;
  //         }

  //         expect(response?.headers).toMatchObject({
  //           connection: "keep-alive",
  //         });

  //         let payload = "";
  //         response?.setEncoding("utf8");
  //         response?.on("data", (chunk) => {
  //           payload += chunk;
  //         });
  //         response?.on("error", (err) => {
  //           throw err;
  //         });
  //         response?.on("end", () => {
  //           expect(payload).toBe("ok");
  //           server.stop();
  //         });

  //         //
  //       }
  //     );
  //   });
  // });

  it("Timeout", async () => {
    function handler(_: IncomingMessage, res: ServerResponse) {
      setTimeout(() => res.end("ok"), 1000);
    }

    const [{ port }, server] = await buildServer(handler);

    const connection = new Connection({
      url: new URL(`http://localhost:${port}`),
    });

    const error = await new Promise<TimeoutError | null>((resolve) => {
      connection.request(
        {
          path: "/hello",
          method: "GET",
          timeout: 500,
        },
        (err) => {
          resolve(err);
        }
      );
    });

    expect(error).toBeInstanceOf(TimeoutError);
    server.stop();
  });

  // describe("querystring", () => {
  //   it("Should concatenate the querystring", async () => {
  //     function handler(req: IncomingMessage, res: ServerResponse) {
  //       expect(req.url).toBe("/hello?hello=world&you_know=for%20search");
  //       res.end("ok");
  //     }

  //     const [{ port }, server] = await buildServer(handler);

  //     const connection = new Connection({
  //       url: new URL(`http://localhost:${port}`),
  //     });

  //     const response = await new Promise<IncomingMessage>((resolve) => {
  //       const request = connection.request(
  //         {
  //           path: "/hello",
  //           method: "GET",
  //           querystring: "hello=world&you_know=for%20search",
  //         },
  //         (err, response) => {
  //           if (response) {
  //             resolve(response);
  //           }
  //           throw err;
  //         }
  //       );

  //       request.on("error", (err) => {
  //         throw err;
  //       });

  //       request.end();
  //     });

  //     expect(response.statusCode).toBe(200);
  //     server.stop();
  //   });

  //   // it("if querystring is null, should not do anything", async () => {
  //   //   function handler(req: IncomingMessage, res: ServerResponse) {
  //   //     res.end("ok");
  //   //   }

  //   //   const [{ port }, server] = await buildServer(handler);

  //   //   const connection = new Connection({
  //   //     url: new URL(`http://localhost:${port}`),
  //   //   });

  //   //   await new Promise((resolve, reject) => {
  //   //     const request = connection.request(
  //   //       {
  //   //         path: "/hello",
  //   //         method: "GET",
  //   //       },
  //   //       (err) => {
  //   //         server.stop();
  //   //         throw err;
  //   //       }
  //   //     );
  //   //   });
  //   // });
  // });

  it("Should throw if the protocol is not http or https", () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const connection = new Connection({
        url: new URL("nope://nope"),
      });
      throw new Error("Should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      const message = (error as Error).message;
      expect(message).toBe("Invalid protocol: 'nope:'");
    }
  });

  it('IPv6', () => {
    const connection = new Connection({
      url: new URL('http://[::1]:9200'),
    });
    const hostname = connection.buildRequestObject({}).hostname
    expect(hostname).toBe('::1')
  })

  it("Should not add agent and ssl to the serialized connection", () => {
    const connection = new Connection({
      url: new URL("http://localhost:9200"),
    });

    const connectionToBeTested = JSON.stringify(connection);
    // throw connectionToBeTested
    const expected =
      '{"url":"http://localhost:9200/","id":"http://localhost:9200/","headers":{},"deadCount":0,"resurrectTimeout":0,"openRequests":0,"status":"alive","roles":{"data":true,"ingest":true}}';
    expect(connectionToBeTested).toBe(expected);
  });

  it("Should disallow two-byte characters in URL path", () => {
    const connection = new Connection({
      url: new URL("http://localhost:9200"),
    });
    connection.request(
      {
        // eslint-disable-next-line unicorn/escape-case
        path: "/thisisinvalid\uffe2",
        method: "GET",
      },
      (err) => {
        const message = (err as Error).message;
        // eslint-disable-next-line unicorn/escape-case
        expect(message).toBe("ERR_UNESCAPED_CHARACTERS: /thisisinvalid\uffe2");
      }
    );
  });

  describe("Authorization", () => {
    it("Basic", () => {
      const connection = new Connection({
        url: new URL("http://localhost:9200"),
        auth: { username: "foo", password: "bar" },
      });
      expect(connection.headers).toMatchObject({
        authorization: "Basic Zm9vOmJhcg==",
      });
    });
    it("No auth headers", () => {
      const connection = new Connection({
        url: new URL("http://localhost:9200"),
      });
      const emptyObject = {};
      expect(connection.headers).toStrictEqual(emptyObject);
    });
  });

  describe("Role", () => {
    it("Update the value of a role", () => {
      const connection = new Connection({
        url: new URL("http://localhost:9200"),
      });

      expect(connection.roles).toMatchObject({
        data: true,
        ingest: true,
      });

      connection.setRole("cluster_manager", false);

      expect(connection.roles).toMatchObject({
        cluster_manager: false,
        data: true,
        ingest: true,
      });
    });

    it("invalid value", () => {
      const connection = new Connection({
        url: new URL("http://localhost:9200"),
      });

      try {
        // @ts-expect-error
        connection.setRole("cluster_manager", 1);
        throw new Error("Should throw");
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const message = (error as Error).message;
        expect(message).toBe("enabled must be a boolean, got 'number'");
      }
    });
  });
});
