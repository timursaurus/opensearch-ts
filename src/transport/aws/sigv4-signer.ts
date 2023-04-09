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

import crypto from "node:crypto";
import { SignatureV4 } from '@aws-sdk/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'
import { OpenSearchClientError } from "@/errors";
import type { AwsSigv4SignerOptions } from "@/types/aws";
import { Connection  } from '@/transport'

// <
//   TResponse = Record<string, unknown>,
//   TContext = Context
// >
export class AwsSigv4SignerError extends OpenSearchClientError {
  message: string;
  data;
  constructor(message: string, data?: string) {
    super(message);
    Error.captureStackTrace(this, AwsSigv4SignerError);
    this.name = "AwsSigv4SignerError";
    this.message = message ?? "AwsSigv4Signer Error";
    this.data = data;
  }
}

export function AwsSigv4Signer(options: AwsSigv4SignerOptions) {
  if (!options.region) {
    throw new AwsSigv4SignerError("Region cannot be empty");
  }
}

// function buildSignedRequestObject(request) {
//   const sigv4 = new SignatureV4({
//     region: 'us-east-1'
//     service: 'es',
//     sha256: Sha256,
//     credentials: {

//     }
//   })
// }