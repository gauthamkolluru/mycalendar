import { describe, expect, it } from "vitest";
import { handleRequest, memoryBlobStore } from "../lib/api.js";

const ENV = {
  CALENDAR_PASSWORD: "desk-calendar",
  CALENDAR_SESSION_SECRET: "s".repeat(32),
};

function request(method, path, { body, cookie } = {}) {
  const headers = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return new Request(`https://calendar.thegauthams.com${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function login(store) {
  const response = await handleRequest(
    request("POST", "/api/session", { body: { password: ENV.CALENDAR_PASSWORD } }),
    ENV,
    store,
  );
  const setCookie = response.headers.get("set-cookie");
  const match = /cal_session=([^;]+)/.exec(setCookie);
  return match[1];
}

describe("handleRequest", () => {
  it("accepts the Netlify function path for login", async () => {
    const response = await handleRequest(
      new Request(
        "https://calendar.thegauthams.com/.netlify/functions/api/session",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: ENV.CALENDAR_PASSWORD }),
        },
      ),
      ENV,
      memoryBlobStore(),
    );
    expect(response.status).toBe(200);
  });

  it("rejects missing configuration", async () => {
    const response = await handleRequest(
      request("GET", "/api/tasks?month=2025-10"),
      {},
      memoryBlobStore(),
    );
    expect(response.status).toBe(503);
  });

  it("rejects unknown paths", async () => {
    const response = await handleRequest(
      request("GET", "/api/nope"),
      ENV,
      memoryBlobStore(),
    );
    expect(response.status).toBe(404);
  });

  it("requires a session to read or write notes", async () => {
    const store = memoryBlobStore();
    const read = await handleRequest(
      request("GET", "/api/tasks?month=2025-10"),
      ENV,
      store,
    );
    const write = await handleRequest(
      request("POST", "/api/tasks", {
        body: { date: "2025-10-31", text: "Halloween party" },
      }),
      ENV,
      store,
    );
    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
  });

  it("rejects a wrong password without setting a session cookie", async () => {
    const response = await handleRequest(
      request("POST", "/api/session", { body: { password: "nope" } }),
      ENV,
      memoryBlobStore(),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("stores, lists, and deletes a day's notes after login", async () => {
    const store = memoryBlobStore();
    const token = await login(store);
    const created = await handleRequest(
      request("POST", "/api/tasks", {
        body: { date: "2025-10-31", text: "  candy  " },
        cookie: `cal_session=${token}`,
      }),
      ENV,
      store,
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.task).toMatchObject({
      date: "2025-10-31",
      text: "candy",
    });

    const listed = await handleRequest(
      request("GET", "/api/tasks?month=2025-10", {
        cookie: `cal_session=${token}`,
      }),
      ENV,
      store,
    );
    const month = await listed.json();
    expect(month.tasks["2025-10-31"]).toHaveLength(1);

    const deleted = await handleRequest(
      request("DELETE", `/api/tasks?date=2025-10-31&id=${createdBody.task.id}`, {
        cookie: `cal_session=${token}`,
      }),
      ENV,
      store,
    );
    expect(deleted.status).toBe(204);
  });

  it("rejects invalid dates and empty notes", async () => {
    const store = memoryBlobStore();
    const token = await login(store);
    const badDate = await handleRequest(
      request("POST", "/api/tasks", {
        body: { date: "2025-02-29", text: "leap" },
        cookie: `cal_session=${token}`,
      }),
      ENV,
      store,
    );
    const empty = await handleRequest(
      request("POST", "/api/tasks", {
        body: { date: "2025-10-01", text: "  " },
        cookie: `cal_session=${token}`,
      }),
      ENV,
      store,
    );
    expect(badDate.status).toBe(400);
    expect(empty.status).toBe(400);
  });

  it("caps notes per day", async () => {
    const store = memoryBlobStore();
    const token = await login(store);
    for (let i = 0; i < 12; i += 1) {
      const response = await handleRequest(
        request("POST", "/api/tasks", {
          body: { date: "2025-10-01", text: `note ${i}` },
          cookie: `cal_session=${token}`,
        }),
        ENV,
        store,
      );
      expect(response.status).toBe(201);
    }
    const extra = await handleRequest(
      request("POST", "/api/tasks", {
        body: { date: "2025-10-01", text: "too many" },
        cookie: `cal_session=${token}`,
      }),
      ENV,
      store,
    );
    expect(extra.status).toBe(409);
  });

  it("clears the session cookie on logout", async () => {
    const store = memoryBlobStore();
    const token = await login(store);
    const response = await handleRequest(
      request("DELETE", "/api/session", { cookie: `cal_session=${token}` }),
      ENV,
      store,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });

  it("rate-limits repeated failed logins from the same client", async () => {
    const store = memoryBlobStore();
    const headers = {
      "content-type": "application/json",
      "x-nf-client-connection-ip": "203.0.113.9",
    };
    let last;
    for (let i = 0; i < 9; i += 1) {
      last = await handleRequest(
        new Request("https://calendar.thegauthams.com/api/session", {
          method: "POST",
          headers,
          body: JSON.stringify({ password: "wrong" }),
        }),
        ENV,
        store,
      );
    }
    expect(last.status).toBe(429);
  });
});
