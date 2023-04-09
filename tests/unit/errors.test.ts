import { expect, describe, it } from "vitest";
import {
  OpenSearchClientError,
  TimeoutError,
  ConfigurationError,
  ConnectionError,
  DeserializationError,
  NoLivingConnectionsError,
  NotCompatibleError,
  RequestAbortedError,
  ResponseError,
  SerializationError,
} from "@/errors";
import { APIResponse } from "@/types/transport";

describe("OpenSearchClientError", () => {
  it("should be an instance of Error", () => {
    const err = new OpenSearchClientError("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("TimeoutError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const err = new TimeoutError("test");
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should have meta property", () => {
    const err = new TimeoutError("test");
    expect(err).toHaveProperty("meta");
  });
});

describe("ConnectionError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const err = new ConnectionError("test");
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should have meta property", () => {
    const err = new ConnectionError("test");
    expect(err).toHaveProperty("meta");
  });
});

describe("NotCompatibleError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const err = new NotCompatibleError();
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should have meta property", () => {
    const meta = {
      body: { test: "test" },
    } as unknown as APIResponse;
    const err = new NotCompatibleError(meta);
    expect(err).toHaveProperty("meta");
  });
});

describe("NoLivingConnectionsError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const err = new NoLivingConnectionsError("test");
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should have meta property", () => {
    const err = new NoLivingConnectionsError("test");
    expect(err).toHaveProperty("meta");
  });
});

describe("SerializationError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const err = new SerializationError("test", { test: "test" });
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should have data property", () => {
    const err = new SerializationError("test", { test: "test" });
    expect(err).toHaveProperty("data");
  });
  it("should not have meta property", () => {
    const err = new SerializationError("test", { test: "test" });
    expect(err).not.toHaveProperty("meta");
  });
});

describe("DeserializationError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const err = new DeserializationError("test", "test");
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should have data property", () => {
    const err = new DeserializationError("test", "test");
    expect(err).toHaveProperty("data");
  });
  it("should not have meta property", () => {
    const err = new DeserializationError("test", "test");
    expect(err).not.toHaveProperty("meta");
  });
});

describe("ConfigurationError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const err = new ConfigurationError("test");
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should not have meta property", () => {
    const err = new ConfigurationError("test");
    expect(err).not.toHaveProperty("meta");
  });
});

describe("RequestAbortedError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const err = new RequestAbortedError("test");
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should have meta property", () => {
    const err = new RequestAbortedError("test");
    expect(err).toHaveProperty("meta");
  });
});

describe("ResponseError", () => {
  it("should be an instance of OpenSearchClientError", () => {
    const meta = {
      body: 1,
      statusCode: 1,
      headers: 1,
    } as unknown as APIResponse;
    const err = new ResponseError(meta);
    expect(err.body).toBe(1);
    expect(err.statusCode).toBe(1);
    expect(err.headers).toBe(1);
    expect(err).toBeInstanceOf(OpenSearchClientError);
  });
  it("should have meta property", () => {
    const meta = {
      body: 1,
    } as unknown as APIResponse;
    const err = new ResponseError(meta);
    expect(err).toHaveProperty("meta");
  });

  it("meaningful message / 1", () => {
    const meta = {
      body: {
        error: {
          root_cause: [
            {
              type: "index_not_found_exception",
              reason: "no such index [foo]",
              "resource.type": "index_expression",
              "resource.id": "foo",
              index_uuid: "_na_",
              index: "foo",
            },
          ],
          type: "index_not_found_exception",
          reason: "no such index [foo]",
          "resource.type": "index_expression",
          "resource.id": "foo",
          index_uuid: "_na_",
          index: "foo",
        },
        status: 404,
      },
      statusCode: 404,
      headers: {},
    } as unknown as APIResponse;
    const err = new ResponseError(meta);
    expect(err.message).toBe(
      "index_not_found_exception: [index_not_found_exception] Reason: no such index [foo]"
    );
    expect(err.toString()).toBe(JSON.stringify(meta.body));
  });
  it("meaningful message / 2", () => {
    const meta = {
      body: {
        error: {
          root_cause: [
            {
              type: "index_not_found_exception",
              reason: "no such index [foo]",
              "resource.type": "index_expression",
              "resource.id": "foo",
              index_uuid: "_na_",
              index: "foo",
            },
            {
              type: "nested_cause",
              reason: "this is a nested cause",
              "resource.type": "index_expression",
              "resource.id": "foo",
              index_uuid: "_na_",
              index: "foo",
            },
          ],
          type: "index_not_found_exception",
          reason: "no such index [foo]",
          "resource.type": "index_expression",
          "resource.id": "foo",
          index_uuid: "_na_",
          index: "foo",
        },
        status: 404,
      },
      statusCode: 404,
      headers: {},
    } as unknown as APIResponse;
    const err = new ResponseError(meta);
    expect(err.message).toBe(
      "index_not_found_exception: [index_not_found_exception] Reason: no such index [foo]; [nested_cause] Reason: this is a nested cause"
    );
    expect(err.toString()).toBe(JSON.stringify(meta.body));
  });
  it("meaningful message / 3", () => {
    const meta = {
      body: {
        error: {
          type: "index_not_found_exception",
          reason: "no such index [foo]",
          "resource.type": "index_expression",
          "resource.id": "foo",
          index_uuid: "_na_",
          index: "foo",
        },
        status: 404,
      },
      statusCode: 404,
      headers: {},
    } as unknown as APIResponse;
    const err = new ResponseError(meta);
    expect(err.message).toBe("index_not_found_exception");
    expect(err.toString()).toBe(JSON.stringify(meta.body));
  });
});
