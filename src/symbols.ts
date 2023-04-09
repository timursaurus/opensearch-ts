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

export const kJsonOptions = Symbol("opensearch:secure-json-parse-options");
export const kClient = Symbol("opensearch:client");
export const kMetaHeader = Symbol("opensearch:meta-header");
export const kMaxRetries = Symbol("opensearch:max-retries");
export const kInitialOptions = Symbol("opensearch:initial-options");
export const kChild = Symbol("opensearch:child");
export const kExtensions = Symbol("opensearch:extensions");
export const kEventEmitter = Symbol("opensearch:event-emitter");

export const kCat = Symbol("opensearch:cat");
export const kCluster = Symbol("opensearch:cluster");
export const kDanglingIndices = Symbol("opensearch:dangling-indices");
export const kFeatures = Symbol("opensearch:features");
export const kIndices = Symbol("opensearch:indices");
export const kIngest = Symbol("opensearch:ingest");
export const kNodes = Symbol("opensearch:nodes");
export const kShutdown = Symbol("opensearch:shutdown");
export const kSnapshot = Symbol("opensearch:snapshot");
export const kTasks = Symbol("opensearch:tasks");
export const kConfigurationError = Symbol("opensearch:configuration-error");
