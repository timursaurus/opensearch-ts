import { stringify } from "node:querystring";
import { describe, it, expect } from "vitest";
import { DeserializationError, SerializationError } from "@/errors";
import { Serializer } from "@/transport";

describe("Serializer", () => {
  const serializer = new Serializer();

  it("serialize", () => {
    const object = { hello: "world" };
    const json = JSON.stringify(object);
    const serialized = serializer.serialize(object);
    expect(serialized).toBe(json);
  });

  it("ndserialize", () => {
    const obj = [{ hello: "world" }, { winter: "is coming" }, { you_know: "for search" }];
    const serialized = serializer.ndserialize(obj);
    const json = obj.map((o) => JSON.stringify(o)).join("\n") + "\n";
    expect(serialized).toBe(json);
  });

  it("qserialize", () => {
    const obj = {
      hello: "world",
      you_know: "for search",
    };
    const serialized = serializer.qserialize(obj);
    expect(serialized).toBe(stringify(obj));
  });

  it("qserialize (array)", () => {
    const obj = {
      hello: "world",
      arr: ["foo", "bar"],
    };
    expect(serializer.qserialize(obj)).toBe("hello=world&arr=foo%2Cbar");
  });

  it("qserialize (string)", () => {
    const obj = {
      hello: "world",
      you_know: "for search",
    };
    expect(serializer.qserialize(stringify(obj))).toBe(stringify(obj));
  });
  it("qserialize (key with undefined value)", () => {
    const obj = {
      hello: "world",
      key: undefined,
      foo: "bar",
    };
    expect(serializer.qserialize(obj)).toBe("hello=world&foo=bar");
  });

  it("SerializationError", () => {
    const obj: Record<string, unknown> = { hello: "world" };
    obj.o = obj;
    try {
      serializer.serialize(obj);
      throw new Error("Should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(SerializationError);
    }
  });

  it("SerializationError (ndserialize)", () => {
    try {
      // @ts-expect-error
      serializer.ndserialize({ hello: "world" });
      throw new Error("Should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(SerializationError);
    }
  });

  it("DeserializationError", () => {
    const json = '{"hello":"world"';
    try {
      serializer.deserialize(json);
      throw new Error("Should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DeserializationError);
    }
  });

  it("prototype poisoning protection", () => {
    try {
      serializer.deserialize('{"__proto__":{"foo":"bar"}}');
      throw new Error("Should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DeserializationError);
    }
    try {
      serializer.deserialize('{"constructor":{"prototype":{"foo":"bar"}}}');
      throw new Error("Should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DeserializationError);
    }
  });

  it("disable prototype poisoning protection only for proto", () => {
    const serializer = new Serializer({ disablePrototypePoisoningProtection: "proto" });
    try {
      const result = serializer.deserialize('{"__proto__":{"foo":"bar"}}');
      expect(result).toBeInstanceOf(Object);
    } catch {
      throw new Error("Should not fail");
    }

    try {
      serializer.deserialize('{"constructor":{"prototype":{"foo":"bar"}}}');
      throw new Error("Should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DeserializationError);
    }
  });

  it('disable prototype poisoning protection only for "constructor"', () => {
    const serializer = new Serializer({ disablePrototypePoisoningProtection: "constructor" });
    try {
      serializer.deserialize('{"__proto__":{"foo":"bar"}}');
      throw new Error("Should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DeserializationError);
    }

    try {
      const result = serializer.deserialize('{"constructor":{"prototype":{"foo":"bar"}}}');
      expect(result).toBeInstanceOf(Object);
    } catch {
      throw new Error("Should not fail");
    }
  });
});
