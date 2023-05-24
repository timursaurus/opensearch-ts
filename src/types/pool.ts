import { Connection } from "@/transport";
import type { BaseConnectionPoolOptions, NodeFilterFn, NodeSelectorFn } from "@/transport/pool";

export interface BasicAuth {
  username: string;
  password: string;
}

export interface ConnectionPoolOptions extends BaseConnectionPoolOptions {
  pingTimeout?: number;
  resurrectStrategy?: "ping" | "optimistic" | "none";
  sniffEnabled?: boolean;
}

type ResurrectEmptyCallback = () => void;
type ResurrectCallbackWithArgs = (isAlive: boolean, connection: Connection) => void;
export type ResurrectCallback = ResurrectEmptyCallback & ResurrectCallbackWithArgs;

export interface ResurrectOptions {
  now?: number;
  requestId: string | number;
  name: string;
}

export interface GetConnectionOptions {
  filter?: NodeFilterFn;
  selector?: NodeSelectorFn;
  requestId: string | number;
  name: string;
  now?: number;
}
