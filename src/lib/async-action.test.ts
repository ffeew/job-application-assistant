import { describe, expect, test } from "vitest";
import { runAsyncAction, withAsyncHandler } from "./async-action";

describe("async event adapters", () => {
  test("passes arguments without delaying the action", () => {
    const values: number[] = [];
    const errors: unknown[] = [];
    const handler = withAsyncHandler(
      (value: number) => Promise.resolve(values.push(value)),
      (error) => {
        errors.push(error);
      },
    );
    handler(4);
    expect(values).toEqual([4]);
    expect(errors).toEqual([]);
  });

  test("observes rejected actions exactly once", async () => {
    const failure = new Error("Example action failure");
    const errors: unknown[] = [];
    const handler = withAsyncHandler(
      () => Promise.reject(failure),
      (error) => {
        errors.push(error);
      },
    );
    handler();
    await Promise.resolve();
    expect(errors).toEqual([failure]);
  });

  test("also handles synchronous failures before a promise is returned", () => {
    const failure = new Error("Example synchronous failure");
    const errors: unknown[] = [];
    const handler = withAsyncHandler(
      (): Promise<void> => {
        throw failure;
      },
      (error) => {
        errors.push(error);
      },
    );
    handler();
    expect(errors).toEqual([failure]);
  });

  test("observes background failures", async () => {
    const failure = new Error("Example background failure");
    const errors: unknown[] = [];
    runAsyncAction(Promise.reject(failure), (error) => {
      errors.push(error);
    });
    await Promise.resolve();
    expect(errors).toEqual([failure]);
  });
});
