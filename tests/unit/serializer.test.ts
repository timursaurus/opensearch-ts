import { stringify } from "node:querystring";
import { test } from "vitest";
import { DeserializationError, SerializationError } from "@/errors";
import { Serializer } from "@/transport";

test("Basic serialization", (t) => {
  const serializer = new Serializer();
  const object = { hello: "world" };
  const json = JSON.stringify(object);
  const serialized = serializer.serialize(object);
  t.expect(serialized).toBe(json);
});

test("ndserialize", (t) => {
  const serializer = new Serializer();
  const obj = [
    { hello: "world" },
    { winter: "is coming" },
    { you_know: "for search" },
  ];
  const serialized = serializer.ndserialize(obj);
  const json = obj.map((o) => JSON.stringify(o)).join("\n") + "\n";

  t.expect(serialized).toBe(json);
});

test("ndserialize (strings)", (t) => {
  const serializer = new Serializer();
  const obj = [
    JSON.stringify({ hello: "world" }),
    JSON.stringify({ winter: "is coming" }),
    JSON.stringify({ you_know: "for search" }),
  ];
  const serialized = serializer.ndserialize(obj);
  t.expect(serialized).toBe(obj.join("\n") + "\n");
});

test("qserialize", (t) => {
  const serializer = new Serializer();
  const obj = {
    hello: "world",
    you_know: "for search",
  };
  const serialized = serializer.qserialize(obj);
  t.expect(serialized, stringify(obj));
});

test("qserialize (array)", (t) => {
  const s = new Serializer();
  const obj = {
    hello: "world",
    arr: ["foo", "bar"],
  };
  t.expect(s.qserialize(obj)).toBe("hello=world&arr=foo%2Cbar");
});

test("qserialize (string)", (t) => {
  const s = new Serializer();
  const obj = {
    hello: "world",
    you_know: "for search",
  };
  t.expect(s.qserialize(stringify(obj))).toBe(stringify(obj));
});

test("qserialize (key with undefined value)", (t) => {
  const s = new Serializer();
  const obj = {
    hello: "world",
    key: undefined,
    foo: "bar",
  };
  t.expect(s.qserialize(obj)).toBe("hello=world&foo=bar");
});

test("SerializationError", (t) => {
  const s = new Serializer();
  const obj: Record<string, unknown> = { hello: "world" };
  obj.o = obj;
  try {
    s.serialize(obj);
    throw new Error("Should fail");
  } catch (error) {
    t.expect(error).toBeInstanceOf(SerializationError);
  }
});

test("SerializationError ndserialize", (t) => {
  const s = new Serializer();
  try {
    // @ts-expect-error
    s.ndserialize({ hello: "world" });
    throw new Error("Should fail");
  } catch (error) {
    t.expect(error).toBeInstanceOf(SerializationError);
  }
});

test("DeserializationError", (t) => {
  const s = new Serializer();
  const json = '{"hello';
  try {
    s.deserialize(json);
    throw new Error("Should fail");
  } catch (error) {
    t.expect(error).toBeInstanceOf(DeserializationError);
  }
});

test("prototype poisoning protection", (t) => {
  const s = new Serializer();
  try {
    s.deserialize('{"__proto__":{"foo":"bar"}}');
    throw new Error("Should fail");
  } catch (error) {
    t.expect(error).toBeInstanceOf(DeserializationError);
  }
  try {
    s.deserialize('{"constructor":{"prototype":{"foo":"bar"}}}');
    throw new Error("Should fail");
  } catch (error) {
    t.expect(error).toBeInstanceOf(DeserializationError);
  }
});

test("disable prototype poisoning protection", (t) => {
  const s = new Serializer({ disablePrototypePoisoningProtection: true });
  try {
    const result = s.deserialize('{"__proto__":{"foo":"bar"}}');
    t.expect(result).toBeInstanceOf(Object);
  } catch {
    throw new Error("Should not fail");
  }

  try {
    const result = s.deserialize('{"constructor":{"prototype":{"foo":"bar"}}}');
    t.expect(result).toBeInstanceOf(Object);
  } catch {
    throw new Error("Should not fail");
  }
});

test("disable prototype poisoning protection only for proto", (t) => {
  const s = new Serializer({ disablePrototypePoisoningProtection: "proto" });
  try {
    const result = s.deserialize('{"__proto__":{"foo":"bar"}}');
    t.expect(result).toBeInstanceOf(Object);
  } catch {
    throw new Error("Should not fail");
  }

  try {
    s.deserialize('{"constructor":{"prototype":{"foo":"bar"}}}');
    throw new Error("Should fail");
  } catch (error) {
    t.expect(error).toBeInstanceOf(DeserializationError);
  }
});

test("disable prototype poisoning protection only for constructor", (t) => {
  const s = new Serializer({
    disablePrototypePoisoningProtection: "constructor",
  });
  try {
    s.deserialize('{"__proto__":{"foo":"bar"}}');
    throw new Error("Should fail");
  } catch (error) {
    t.expect(error).toBeInstanceOf(DeserializationError);
  }

  try {
    const result = s.deserialize('{"constructor":{"prototype":{"foo":"bar"}}}');
    t.expect(result).toBeInstanceOf(Object);
  } catch {
    throw new Error("Should not fail");
  }
});
