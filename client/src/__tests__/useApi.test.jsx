import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useApi } from "../hooks/useApi.js";

/** Fake fetch: answers each /api path with its JSON, or a 500 for an Error. */
const respond = (map) =>
  vi.fn(async (url) => {
    const body = map[url];
    if (body instanceof Error) return new Response(JSON.stringify({ error: body.message }), { status: 500 });
    return new Response(JSON.stringify(body), { status: 200 });
  });

afterEach(() => vi.unstubAllGlobals());

describe("useApi", () => {
  it("loads data, and shows nothing stale when the path changes", async () => {
    vi.stubGlobal("fetch", respond({ "/api/a": { n: 1 }, "/api/b": { n: 2 } }));
    const { result, rerender } = renderHook(({ p }) => useApi(p), { initialProps: { p: "/a" } });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    rerender({ p: "/b" });
    expect(result.current.data).toBe(null);
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }));
  });

  it("with keep: shows the previous data while the next page loads", async () => {
    vi.stubGlobal("fetch", respond({ "/api/a": { n: 1 }, "/api/b": { n: 2 } }));
    const { result, rerender } = renderHook(({ p }) => useApi(p, undefined, { keep: true }), { initialProps: { p: "/a" } });
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    rerender({ p: "/b" });
    expect(result.current).toMatchObject({ data: { n: 1 }, loading: true });
    await waitFor(() => expect(result.current).toMatchObject({ data: { n: 2 }, loading: false }));
  });

  it("reports errors and retries on reload()", async () => {
    const fetchMock = respond({ "/api/x": new Error("Server down") });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useApi("/x"));
    await waitFor(() => expect(result.current.error?.message).toBe("Server down"));
    act(() => result.current.reload());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("skips the request when the path is empty", () => {
    const fetchMock = respond({});
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useApi(null));
    expect(result.current).toMatchObject({ data: null, loading: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
