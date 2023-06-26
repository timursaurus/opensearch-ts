import { randomUUID as uuid } from "node:crypto";
import { describe, it, expect } from "vitest";
import { AwsSigv4Signer } from "@/transport/aws";
import { AwsSigv4SignerOptions } from "@/types/aws";
import { Connection } from "@/transport";

describe("Sigv4Signer", () => {
  it("sign a request", async () => {
    const mockCredentials = {
      accessKeyId: uuid(),
      secretAccessKey: uuid(),
    };
    const mockRegion = "us-west-2";

    const options: AwsSigv4SignerOptions = {
      getCredentials: () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(mockCredentials), 100);
        });
      },
      region: mockRegion,
    };

    const auth = await AwsSigv4Signer(options);

    const connection = new Connection({
      url: new URL("http://localhost:9200"),
    });

    const request = connection.buildRequestObject({
      path: "/hello",
      method: "GET",
      headers: {
        "X-Custom-Test": "true",
      },
    });

    const signed = await auth.buildSignedRequestObject(request);

    expect(signed.headers).toHaveProperty("x-amz-date");
    expect(signed.headers).toHaveProperty("authorization");
    expect(signed.headers['x-amz-content-sha256']).toEqual('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  });
});
