import { spawn } from "node:child_process";

const PORT = Number(process.env.API_SMOKE_PORT || 8800 + Math.floor(Math.random() * 600));
const BASE_URL = `http://127.0.0.1:${PORT}`;
const BASE_URL_LOCALHOST = `http://localhost:${PORT}`;
const STARTUP_TIMEOUT_MS = Number(process.env.API_SMOKE_STARTUP_TIMEOUT_MS || 30_000);

let serverStdout = "";
let serverStderr = "";
let serverExitCode = null;
let serverExitSignal = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, options = {}, timeoutMs = 10000, baseUrl = BASE_URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    return { status: response.status, ok: response.ok, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServerReady(server, timeoutMs = STARTUP_TIMEOUT_MS) {
  const start = Date.now();
  const candidateBases = [BASE_URL, BASE_URL_LOCALHOST];
  while (Date.now() - start < timeoutMs) {
    if (server.exitCode != null) {
      return {
        ok: false,
        reason: "server-exited",
        exitCode: server.exitCode,
        signal: server.signalCode,
      };
    }

    for (const base of candidateBases) {
      try {
        const health = await fetchJson("/api/health", {}, 1200, base);
        if (health.status === 200) {
          return {
            ok: true,
            baseUrl: base,
          };
        }
      } catch {
        // Continue polling until timeout or child process exits.
      }
    }

    await sleep(200);
  }

  return {
    ok: false,
    reason: "timeout",
  };
}

function getStartupFailureMessage(readiness) {
  const stderr = String(serverStderr || "");
  const stdout = String(serverStdout || "");
  const joined = `${stderr}\n${stdout}`;

  if (/listen\s+eperm/i.test(joined)) {
    return [
      "Server startup blocked by environment socket restrictions (listen EPERM).",
      "This environment does not allow local port binding for API smoke tests.",
      "Run `npm run test:api` on your local machine/CI with loopback sockets enabled.",
    ].join(" ");
  }

  if (/eaddrinuse/i.test(joined)) {
    return `Port ${PORT} is already in use. Set API_SMOKE_PORT to a free port and retry.`;
  }

  if (readiness?.reason === "server-exited") {
    const sawStartupLog = /api running on/i.test(stdout);
    if (sawStartupLog && !stderr.trim()) {
      return [
        "Server process exited right after startup log; health endpoint was never reachable.",
        "This usually indicates environment restrictions on local sockets/process lifetime.",
        "Run `npm run test:api` on your local machine/CI environment.",
      ].join(" ");
    }
    return `Server process exited before health check succeeded (exit=${readiness?.exitCode}, signal=${readiness?.signal || "none"}).`;
  }

  if (readiness?.reason === "timeout") {
    return "Server did not become ready within timeout.";
  }

  return "Server did not become ready.";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log(`Starting API smoke test on ${BASE_URL}`);
  const server = spawn("node", ["backend/server/index.js"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => {
    serverStdout += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverStderr += chunk.toString();
  });
  server.on("exit", (code, signal) => {
    serverExitCode = code;
    serverExitSignal = signal;
  });

  const stopServer = async () => {
    if (server.killed) return;
    server.kill("SIGTERM");
    try {
      await sleep(1200);
      if (!server.killed && server.exitCode == null) {
        server.kill("SIGKILL");
      }
    } catch {
      // Ignore cleanup errors.
    }
  };

  try {
    const readiness = await waitForServerReady(server, STARTUP_TIMEOUT_MS);
    assert(readiness.ok, getStartupFailureMessage(readiness));
    const activeBaseUrl = readiness.baseUrl || BASE_URL;
    const testUserSuffix = Date.now().toString(36);
    const signup = await fetchJson(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          username: `smoke_${testUserSuffix}`,
          displayName: "Smoke Test User",
          email: `smoke_${testUserSuffix}@example.com`,
          password: "SmokePass123!",
        }),
      },
      10000,
      activeBaseUrl
    );
    assert(signup.status === 201, `Expected 201 from /api/auth/register, got ${signup.status}`);
    const accessToken = String(signup.data?.accessToken || "");
    assert(accessToken, "Expected access token from /api/auth/register");
    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };

    const checks = [];
    const runCheck = async (name, testFn) => {
      try {
        await testFn();
        checks.push({ name, ok: true });
      } catch (error) {
        checks.push({ name, ok: false, error: String(error?.message || error) });
      }
    };

    await runCheck("GET /api/health", async () => {
      const res = await fetchJson("/api/health", {}, 10000, activeBaseUrl);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data?.ok === true, "Expected health payload { ok: true }");
    });

    await runCheck("GET /api/ready", async () => {
      const res = await fetchJson("/api/ready", {}, 10000, activeBaseUrl);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data?.ready === true, "Expected ready payload { ready: true }");
    });

    await runCheck("POST /api/assistant/query", async () => {
      const res = await fetchJson(
        "/api/assistant/query",
        {
          method: "POST",
          body: JSON.stringify({ query: "FIR not registered after theft" }),
        },
        10000,
        activeBaseUrl
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(typeof res.data?.answer?.now === "string", "Expected answer.now string");
      assert(Array.isArray(res.data?.sources), "Expected sources array");
    });

    await runCheck("GET /api/community", async () => {
      const res = await fetchJson("/api/community?search=FIR", {}, 10000, activeBaseUrl);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data?.discussions), "Expected discussions array");
    });

    await runCheck("POST /api/community/discussions validation", async () => {
      const res = await fetchJson(
        "/api/community/discussions",
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({}),
        },
        10000,
        activeBaseUrl
      );
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await runCheck("POST /api/community/discussions/:id/upvote 404", async () => {
      const res = await fetchJson(
        "/api/community/discussions/non-existent-id/upvote",
        {
          method: "POST",
          headers: authHeaders,
        },
        10000,
        activeBaseUrl
      );
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    await runCheck("POST /api/community/discussions/:id/comments 404", async () => {
      const res = await fetchJson(
        "/api/community/discussions/non-existent-id/comments",
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ text: "Test comment" }),
        },
        10000,
        activeBaseUrl
      );
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    await runCheck("GET /api/rights/search", async () => {
      const res = await fetchJson(
        "/api/rights/search?query=consumer%20rights",
        {},
        10000,
        activeBaseUrl
      );
      assert([200, 502].includes(res.status), `Expected 200 or 502, got ${res.status}`);
      if (res.status === 200) {
        assert(Array.isArray(res.data?.rights), "Expected rights array");
      } else {
        assert(typeof res.data?.error === "string", "Expected error string");
      }
    });

    await runCheck("GET /api/lawyers/search", async () => {
      const res = await fetchJson(
        "/api/lawyers/search?query=family&state=Delhi&district=New%20Delhi&field=Family%20Law",
        {},
        10000,
        activeBaseUrl
      );
      assert([200, 502].includes(res.status), `Expected 200 or 502, got ${res.status}`);
      if (res.status === 200) {
        assert(Array.isArray(res.data?.lawyers), "Expected lawyers array");
      } else {
        assert(typeof res.data?.error === "string", "Expected error string");
      }
    });

    const failed = checks.filter((item) => !item.ok);
    for (const item of checks) {
      console.log(`${item.ok ? "PASS" : "FAIL"} - ${item.name}`);
      if (!item.ok) console.log(`  ${item.error}`);
    }

    if (failed.length > 0) {
      console.error(`\n${failed.length} check(s) failed.`);
      process.exitCode = 1;
    } else {
      console.log("\nAll API smoke checks passed.");
    }
  } catch (error) {
    console.error("Smoke test failed before checks completed.");
    console.error(String(error?.message || error));
    process.exitCode = 1;
  } finally {
    await stopServer();
    if (process.exitCode) {
      if (serverStdout.trim()) {
        console.error("\nServer stdout:");
        console.error(serverStdout.trim());
      }
      if (serverStderr.trim()) {
        console.error("\nServer stderr:");
        console.error(serverStderr.trim());
      }
      if (serverExitCode != null || serverExitSignal != null) {
        console.error(
          `\nServer exit info: code=${String(serverExitCode)}, signal=${String(serverExitSignal)}`
        );
      }
    }
  }
}

run();
