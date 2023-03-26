import { Serializer } from "@/transport/";
export class Client {
  serializer: Serializer;
  constructor() {
    this.serializer = new Serializer();
  }
}
