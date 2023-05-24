import type { ConnectionOptions as TLSConnectionOptions } from "node:tls";
import type { IncomingHttpHeaders, ClientRequestArgs } from "node:http";
import type { BasicAuth } from "@/types/pool";

export interface ConnectionRoles {
  cluster_manager?: boolean;
  /**
   * @deprecated use cluster_manager instead
   */
  master?: boolean;
  data?: boolean;
  ingest?: boolean;
  [key: string]: boolean | undefined;
}
export interface AgentOptions {
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  maxSockets?: number;
  maxFreeSockets?: number;
}

export type AgentFn = (options: ConnectionOptions) => any;

export interface ConnectionOptions {
  url: URL;
  ssl?: TLSConnectionOptions;
  id?: string;
  headers?: IncomingHttpHeaders;
  agent?: AgentOptions | AgentFn | boolean;
  status?: string;
  roles?: ConnectionRoles;
  auth?: BasicAuth;
  proxy?: string | URL;
}

export interface ConnectionRequestParams extends ClientRequestArgs {
  asStream?: boolean;
  body?: string | Buffer | ReadableStream | null;
  querystring?: string;
}
