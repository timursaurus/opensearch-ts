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

import type { ClientRequestArgs } from "node:http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";
import type {
  AWSProvider,
  AwsSigv4SignerOptions,
  DefaultAWSCredentialsProvider,
} from "@/types/aws";
import { OpenSearchClientError } from "@/errors";
import { Connection, Transport } from "@/transport";
import { ConnectionRequestParams } from "@/types/connection";

class Sigv4SignerTransport extends Transport {}

class Sigv4SignerConnection extends Connection {
  buildRequestObject(params: ConnectionRequestParams) {
    const request = super.buildRequestObject(params);
    // return buildSignedRequestObject(request);
  }
}

export class AwsSigv4SignerError extends OpenSearchClientError {
  message: string;
  data;
  constructor(message = "AwsSigv4Signer Error", data?: string) {
    super(message);
    Error.captureStackTrace(this, AwsSigv4SignerError);
    this.name = "AwsSigv4SignerError";
    this.message = message;
    this.data = data;
  }
}

async function getSDKCredentialsProvider(): Promise<DefaultAWSCredentialsProvider> {
  try {
    const awsV3 = await import("@aws-sdk/credential-provider-node");
    if (typeof awsV3?.defaultProvider === "function") {
      return awsV3.defaultProvider();
    }
  } catch {}
  try {
    const awsV2 = await import("aws-sdk");
    if (typeof awsV2?.default.config.getCredentials === "function") {
      return new Promise((resolve, reject) => {
        awsV2.default.config.getCredentials((error, credentials) => {
          if (error) {
            reject(error);
          }
          if (credentials) {
            resolve(credentials);
          }
        });
      });
    }
  } catch {}

  throw new AwsSigv4SignerError(
    "Unable to find a valid AWS SDK, please provide a valid getCredentials function to AwsSigv4Signer options."
  );
}

function defaultCredentialsProvider(): Promise<DefaultAWSCredentialsProvider> {
  return new Promise((resolve, reject) => {
    getSDKCredentialsProvider()
      .then((provider) => {
        if (typeof provider === "function") {
          provider().then(resolve).catch(reject);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export async function AwsSigv4Signer(options: AwsSigv4SignerOptions) {
  if (!options.region) {
    throw new AwsSigv4SignerError("Region cannot be empty");
  }
  if (typeof options.getCredentials !== "function") {
    options.getCredentials = defaultCredentialsProvider as AWSProvider;
  }

  const credentialsState = {
    credentials: null,
  };

  const signer = new SignatureV4({
    service: options.service || "es",
    region: options.region,
    sha256: Sha256,
    credentials: await options.getCredentials(),
  });

  async function buildSignedRequestObject(request = {}) {
    const req = new HttpRequest({
      ...request,
    });

    const signed = await signer.sign(req);

    return signed;
  }

  return {
    Connection: Sigv4SignerConnection,
    Transport: Sigv4SignerTransport,
    buildSignedRequestObject,
  };
}