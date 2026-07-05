const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/+$/, "");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(method, path, body, token, allowError = false) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await response.json().catch(() => null);
  if (!allowError && (!response.ok || json?.code !== 0)) {
    throw new Error(`${method} ${path} failed: HTTP ${response.status} ${json?.message || ""}`);
  }
  return { status: response.status, body: json };
}

async function step(name, fn) {
  process.stdout.write(`- ${name} ... `);
  const result = await fn();
  console.log("ok");
  return result;
}

async function main() {
  console.log(`Lumi API smoke test: ${API_BASE}`);

  await step("health", async () => {
    const { body } = await request("GET", "/health");
    assert(body.data?.status === "ok", "health status is not ok");
  });

  await step("public bootstrap/config", async () => {
    const [{ body: bootstrap }, { body: hotSearches }] = await Promise.all([
      request("GET", "/app/bootstrap"),
      request("GET", "/config/hot-searches")
    ]);
    assert(Array.isArray(bootstrap.data?.gameplays), "bootstrap gameplays missing");
    assert(Array.isArray(hotSearches.data), "hot searches missing");
  });

  const user = await step("mock user login", async () => {
    const code = `mock-smoke-${Date.now()}`;
    const { body } = await request("POST", "/auth/wechat/login", { code });
    assert(body.data?.accessToken, "access token missing");
    return body.data;
  });

  await step("profile and credits", async () => {
    const [{ body: me }, { body: credits }] = await Promise.all([
      request("GET", "/users/me", undefined, user.accessToken),
      request("GET", "/credits/balance", undefined, user.accessToken)
    ]);
    assert(me.data?.id, "profile id missing");
    assert(typeof credits.data?.credits === "number", "credits missing");
  });

  await step("feedback", async () => {
    const { body } = await request(
      "POST",
      "/feedback",
      { type: "suggestion", content: "smoke test feedback", imageUrls: [], wechat: "" },
      user.accessToken
    );
    assert(body.data?.id, "feedback id missing");
  });

  await step("work create/edit/detail/delete", async () => {
    const { body: created } = await request(
      "POST",
      "/works",
      {
        title: "smoke-work-before",
        description: "before",
        prompt: "smoke prompt",
        imageUrl: "https://example.com/smoke-work.png",
        ratio: "1:1",
        quality: "1K",
        modelId: "smoke-model",
        style: "smoke-style-before",
        isPublic: false
      },
      user.accessToken
    );
    const workId = created.data?.id;
    assert(workId, "created work id missing");

    const { body: patched } = await request(
      "PATCH",
      `/works/${workId}`,
      { title: "smoke-work-after", description: "after", style: "smoke-style-after" },
      user.accessToken
    );
    assert(patched.data?.style === "smoke-style-after", "work style did not update");

    const { body: detail } = await request("GET", `/works/${workId}`);
    assert(detail.data?.title === "smoke-work-after", "work detail did not persist");

    const { body: deleted } = await request("DELETE", `/works/${workId}?action=delete`, undefined, user.accessToken);
    assert(deleted.data?.ok, "work delete failed");
  });

  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    const admin = await step("admin login", async () => {
      const { body } = await request("POST", "/admin/auth/login", { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
      assert(body.data?.accessToken, "admin token missing");
      return body.data;
    });

    await step("admin dashboard", async () => {
      const { body } = await request("GET", "/admin/dashboard/summary", undefined, admin.accessToken);
      assert(body.data, "admin dashboard summary missing");
    });
  } else {
    console.log("- admin checks skipped (set ADMIN_USERNAME and ADMIN_PASSWORD to enable)");
  }

  console.log("Smoke test passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
