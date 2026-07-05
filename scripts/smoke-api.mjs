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

  await step("social notifications", async () => {
    const ownerLogin = await request("POST", "/auth/wechat/login", { code: `mock-smoke-owner-${Date.now()}` });
    const actorLogin = await request("POST", "/auth/wechat/login", { code: `mock-smoke-actor-${Date.now()}` });
    const owner = ownerLogin.body.data;
    const actor = actorLogin.body.data;
    assert(owner?.accessToken && actor?.accessToken, "social smoke tokens missing");

    const { body: created } = await request(
      "POST",
      "/works",
      {
        title: "smoke-social-work",
        description: "social smoke",
        prompt: "social smoke prompt",
        imageUrl: "https://example.com/smoke-social-work.png",
        ratio: "1:1",
        quality: "1K",
        modelId: "smoke-model",
        style: "smoke-style",
        isPublic: true
      },
      owner.accessToken
    );
    const workId = created.data?.id;
    assert(workId, "social work id missing");

    if (created.data?.status !== "published") {
      if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
        await request("DELETE", `/works/${workId}?action=delete`, undefined, owner.accessToken);
        console.log("skipped (manual review kept work unpublished)");
        return;
      }
      const { body: adminLogin } = await request("POST", "/admin/auth/login", {
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      });
      assert(adminLogin.data?.accessToken, "admin token missing for social work approval");
      await request("POST", `/admin/reviews/${workId}/approve`, {}, adminLogin.data.accessToken);
    }

    const { body: like } = await request("POST", `/social/works/${workId}/like`, undefined, actor.accessToken);
    assert(like.data?.liked === true, "like did not toggle on");
    const { body: favorite } = await request("POST", `/social/works/${workId}/favorite`, undefined, actor.accessToken);
    assert(favorite.data?.favorited === true, "favorite did not toggle on");
    const { body: remake } = await request("POST", `/social/works/${workId}/remake`, undefined, actor.accessToken);
    assert(typeof remake.data?.remakes === "number", "remake count missing");
    const { body: follow } = await request("POST", `/social/users/${owner.user.id}/follow`, undefined, actor.accessToken);
    assert(follow.data?.following === true, "follow did not toggle on");

    const { body: summary } = await request("GET", "/notifications/summary", undefined, owner.accessToken);
    const rows = summary.data || [];
    const unreadByType = Object.fromEntries(rows.map((row) => [row.key, row.unread]));
    assert(unreadByType.like >= 1, "like notification missing");
    assert(unreadByType.favorite >= 1, "favorite notification missing");
    assert(unreadByType.remake >= 1, "remake notification missing");
    assert(unreadByType.follow >= 1, "follow notification missing");

    const { body: likeMessages } = await request("GET", "/notifications/like", undefined, owner.accessToken);
    assert((likeMessages.data || []).some((item) => item.content.includes("smoke-social-work")), "like message content missing");

    await request("DELETE", `/social/users/${owner.user.id}/follow`, undefined, actor.accessToken);
    await request("DELETE", `/works/${workId}?action=delete`, undefined, owner.accessToken);
  });

  await step("payments recharge and membership", async () => {
    const login = await request("POST", "/auth/wechat/login", { code: `mock-smoke-payments-${Date.now()}` });
    const payer = login.body.data;
    assert(payer?.accessToken, "payment smoke token missing");

    const { body: beforeBalance } = await request("GET", "/credits/balance", undefined, payer.accessToken);
    const initialCredits = beforeBalance.data?.credits;
    assert(typeof initialCredits === "number", "initial credits missing");

    const { body: bootstrap } = await request("GET", "/app/bootstrap");
    const tier = (bootstrap.data?.rechargeTiers || []).find((item) => item.enabled !== false) || bootstrap.data?.rechargeTiers?.[0];
    const plan = (bootstrap.data?.memberPlans || []).find((item) => item.enabled !== false) || bootstrap.data?.memberPlans?.[0];
    assert(tier?.id, "recharge tier missing");
    assert(plan?.id, "member plan missing");

    const { body: rechargeOrder } = await request(
      "POST",
      "/payments/recharge/orders",
      { tierId: tier.id },
      payer.accessToken
    );
    assert(rechargeOrder.data?.status === "pending", "recharge order did not start pending");
    assert(rechargeOrder.data?.credits === tier.credits, "recharge order credits mismatch");

    if (rechargeOrder.data?.paymentParams?.provider !== "mock") {
      assert(rechargeOrder.data?.paymentParams?.provider === "wechat", "unexpected recharge payment provider");
      assert(rechargeOrder.data?.paymentParams?.configured === false, "unconfigured wechat payment should be explicit");
      console.log("recharge completion skipped (mock payment disabled)");
    } else {
      const { body: paidRecharge } = await request(
        "POST",
        `/payments/${rechargeOrder.data.id}/mock-complete`,
        undefined,
        payer.accessToken
      );
      assert(paidRecharge.data?.status === "paid", "recharge order was not paid");

      const { body: afterRechargeBalance } = await request("GET", "/credits/balance", undefined, payer.accessToken);
      const expectedCredits = initialCredits + tier.credits + (tier.bonus || 0);
      assert(afterRechargeBalance.data?.credits === expectedCredits, "recharge credits were not applied");
    }

    const { body: memberOrder } = await request(
      "POST",
      "/payments/membership/orders",
      { planId: plan.id },
      payer.accessToken
    );
    assert(memberOrder.data?.status === "pending", "membership order did not start pending");
    assert(memberOrder.data?.memberDays > 0, "membership order days missing");

    if (memberOrder.data?.paymentParams?.provider !== "mock") {
      assert(memberOrder.data?.paymentParams?.provider === "wechat", "unexpected membership payment provider");
      assert(memberOrder.data?.paymentParams?.configured === false, "unconfigured wechat payment should be explicit");
      console.log("membership completion skipped (mock payment disabled)");
      return;
    }

    const { body: paidMember } = await request(
      "POST",
      `/payments/${memberOrder.data.id}/mock-complete`,
      undefined,
      payer.accessToken
    );
    assert(paidMember.data?.status === "paid", "membership order was not paid");

    const [{ body: memberStatus }, { body: earnRecords }] = await Promise.all([
      request("GET", "/membership/status", undefined, payer.accessToken),
      request("GET", "/credits/records?type=earn&page=1&pageSize=10", undefined, payer.accessToken)
    ]);
    assert(memberStatus.data?.isMember === true, "membership status was not activated");
    assert(memberStatus.data?.memberPlan, "membership plan name missing");
    assert(
      (earnRecords.data?.items || []).some((item) => item.type === "membership" && item.refId === paidMember.data.id),
      "membership credit transaction missing"
    );
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
