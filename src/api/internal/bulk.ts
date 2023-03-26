import { Transport } from "@/transport";

export class BulkImpl {
  constructor(protected transport: Transport) {
    this.transport = transport;
  }
  bulk(params, options, callback) {

  }
}
