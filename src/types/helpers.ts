import { Client } from "@/client";

export interface HelpersOptions {
  client: Client;
  metaHeader: string | null;
  maxRetries: number;
}

export interface BulkHelper<T> extends Promise<T> {
  abort: () => BulkHelper<T>;
  readonly stats: BulkStats;
}

export interface BulkStats {
  total: number;
  failed: number;
  retry: number;
  successful: number;
  noop: number;
  time: number;
  bytes: number;
  aborted: boolean;
}
