const API_BASE = (process.env.API_BASE || "http://127.0.0.1:3000/api").replace(/\/+$/, "");
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SMOKE_GENERATE_MOCK = process.env.SMOKE_GENERATE_MOCK === "true";

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
    const [{ body: bootstrap }, { body: hotSearches }, { body: announcements }] = await Promise.all([
      request("GET", "/app/bootstrap"),
      request("GET", "/config/hot-searches"),
      request("GET", "/config/announcements")
    ]);
    assert(Array.isArray(bootstrap.data?.gameplays), "bootstrap gameplays missing");
    assert(Array.isArray(bootstrap.data?.announcements), "bootstrap announcements missing");
    assert(Array.isArray(hotSearches.data), "hot searches missing");
    assert(Array.isArray(announcements.data), "announcements missing");
  });

  const user = await step("mock user login", async () => {
    const code = `mock-smoke-${Date.now()}`;
    const { body } = await request("POST", "/auth/wechat/login", { code });
    assert(body.data?.accessToken, "access token missing");
    assert(body.data?.refreshToken, "refresh token missing");
    return body.data;
  });

  await step("auth refresh and logout", async () => {
    const { body: refreshed } = await request("POST", "/auth/refresh", { refreshToken: user.refreshToken });
    assert(refreshed.data?.accessToken, "refreshed access token missing");
    assert(refreshed.data?.refreshToken, "rotated refresh token missing");
    assert(refreshed.data.refreshToken !== user.refreshToken, "refresh token was not rotated");

    const oldRefresh = await request("POST", "/auth/refresh", { refreshToken: user.refreshToken }, undefined, true);
    assert(oldRefresh.status === 401 || oldRefresh.body?.code !== 0, "old refresh token should be revoked");

    const { body: loggedOut } = await request("POST", "/auth/logout", { refreshToken: refreshed.data.refreshToken });
    assert(loggedOut.data?.ok === true, "logout did not succeed");

    const afterLogout = await request("POST", "/auth/refresh", { refreshToken: refreshed.data.refreshToken }, undefined, true);
    assert(afterLogout.status === 401 || afterLogout.body?.code !== 0, "logged out refresh token should be revoked");
  });

  await step("profile and credits", async () => {
    const [{ body: me }, { body: credits }] = await Promise.all([
      request("GET", "/users/me", undefined, user.accessToken),
      request("GET", "/credits/balance", undefined, user.accessToken)
    ]);
    assert(me.data?.id, "profile id missing");
    assert(typeof credits.data?.credits === "number", "credits missing");
  });

  await step("profile update", async () => {
    const suffix = String(Date.now()).slice(-8);
    const nextProfile = {
      nickname: `smoke-user-${suffix}`,
      bio: "profile smoke test",
      gender: "female",
      phone: `139${suffix}`,
      avatarUrl: `https://example.com/avatar-${suffix}.png`
    };
    const { body: updated } = await request("PATCH", "/users/me", nextProfile, user.accessToken);
    assert(updated.data?.nickname === nextProfile.nickname, "profile nickname did not update");
    assert(updated.data?.bio === nextProfile.bio, "profile bio did not update");
    assert(updated.data?.gender === nextProfile.gender, "profile gender did not update");
    assert(updated.data?.phone === nextProfile.phone, "profile phone did not update");
    assert(updated.data?.avatarUrl === nextProfile.avatarUrl, "profile avatar URL did not update");

    const { body: reloaded } = await request("GET", "/users/me", undefined, user.accessToken);
    assert(reloaded.data?.nickname === nextProfile.nickname, "profile update did not persist");
    assert(reloaded.data?.phone === nextProfile.phone, "profile phone did not persist");
  });

  await step("upload policy and complete", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
    const { body: policy } = await request(
      "POST",
      "/uploads/policy",
      { scene: "feedback", filename: "smoke.png", contentType: "image/png", sizeBytes: png.byteLength },
      user.accessToken
    );
    assert(policy.data?.uploadUrl, "upload URL missing");
    assert(policy.data?.ossKey?.startsWith("uploads/feedback/"), "upload oss key scene mismatch");

    const uploaded = await fetch(policy.data.uploadUrl, {
      method: "PUT",
      headers: policy.data.headers,
      body: png
    });
    assert(uploaded.ok, `OSS PUT failed with HTTP ${uploaded.status}`);

    const { body: completed } = await request(
      "POST",
      "/uploads/complete",
      { ossKey: policy.data.ossKey, publicUrl: policy.data.publicUrl },
      user.accessToken
    );
    assert(completed.data?.ok === true, "upload complete did not succeed");
    assert(completed.data?.publicUrl === policy.data.publicUrl, "upload public URL mismatch");
  });

  await step("feedback", async () => {
    const { body } = await request(
      "POST",
      "/feedback",
      { type: "suggestion", content: "smoke test feedback", imageUrls: [], wechat: "" },
      user.accessToken
    );
    assert(body.data?.id, "feedback id missing");
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return;

    const { body: adminLogin } = await request("POST", "/admin/auth/login", {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    });
    assert(adminLogin.data?.accessToken, "admin token missing for feedback reply");
    const reply = `smoke feedback reply ${Date.now()}`;
    await request("POST", `/admin/feedback/${body.data.id}/reply`, { reply }, adminLogin.data.accessToken);
    const { body: messages } = await request("GET", "/notifications/service", undefined, user.accessToken);
    assert(
      Array.isArray(messages.data) && messages.data.some((item) => item.content === reply && item.unread === true),
      "feedback reply notification missing"
    );

    const { body: marked } = await request("PATCH", "/notifications/service/read", undefined, user.accessToken);
    assert(marked.data?.ok === true, "service notification mark-read failed");
    const { body: summary } = await request("GET", "/notifications/summary", undefined, user.accessToken);
    const serviceRow = (summary.data || []).find((item) => item.key === "service");
    assert(serviceRow?.unread === 0, "service notification unread count did not clear");
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

    const anonymousDetail = await request("GET", `/works/${workId}`, undefined, undefined, true);
    assert(anonymousDetail.status === 404 || anonymousDetail.body?.code !== 0, "draft work should not be public");

    const { body: detail } = await request("GET", `/works/${workId}`, undefined, user.accessToken);
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

    const { body: detailBeforeFollow } = await request("GET", `/works/${workId}`);
    assert(detailBeforeFollow.data?.author?.id === owner.user.id, "work detail author missing");
    assert(typeof detailBeforeFollow.data?.author?.worksCount === "number", "work detail author worksCount missing");
    assert(typeof detailBeforeFollow.data?.author?.likesCount === "number", "work detail author likesCount missing");
    assert(typeof detailBeforeFollow.data?.author?.followers === "number", "work detail author followers missing");
    const { body: filteredPlaza } = await request("GET", "/works/plaza?modelIds=smoke-model&ratios=1%3A1&qualities=1K&page=1&pageSize=20");
    assert((filteredPlaza.data?.items || []).some((item) => item.id === workId), "filtered plaza should include matching work");
    const { body: filteredOutPlaza } = await request("GET", "/works/plaza?modelIds=missing-smoke-model&page=1&pageSize=20");
    assert(!(filteredOutPlaza.data?.items || []).some((item) => item.id === workId), "filtered plaza should exclude non-matching work");

    const { body: like } = await request("POST", `/social/works/${workId}/like`, undefined, actor.accessToken);
    assert(like.data?.liked === true, "like did not toggle on");
    const { body: favorite } = await request("POST", `/social/works/${workId}/favorite`, undefined, actor.accessToken);
    assert(favorite.data?.favorited === true, "favorite did not toggle on");
    const { body: favorites } = await request("GET", "/social/favorites?page=1&pageSize=10", undefined, actor.accessToken);
    assert((favorites.data?.items || []).some((item) => item.id === workId), "favorited work missing from favorites list");
    const { body: remake } = await request("POST", `/social/works/${workId}/remake`, undefined, actor.accessToken);
    assert(typeof remake.data?.remakes === "number", "remake count missing");
    const { body: follow } = await request("POST", `/social/users/${owner.user.id}/follow`, undefined, actor.accessToken);
    assert(follow.data?.following === true, "follow did not toggle on");
    const { body: detailAfterFollow } = await request("GET", `/works/${workId}`);
    assert(
      detailAfterFollow.data?.author?.followers === follow.data.followers,
      "work detail author followers did not reflect follow result"
    );

    const { body: publicProfile } = await request("GET", `/social/users/${owner.user.id}/profile`);
    assert(publicProfile.data?.id === owner.user.id, "public user profile should be readable without login");
    assert(publicProfile.data?.isFollowing === false, "public user profile should not imply following without login");

    const { body: publicWorks } = await request("GET", `/social/users/${owner.user.id}/works?page=1&pageSize=10`);
    assert((publicWorks.data?.items || []).some((item) => item.id === workId), "public user works should include approved work");

    const { body: authedProfile } = await request("GET", `/social/users/${owner.user.id}/profile`, undefined, actor.accessToken);
    assert(authedProfile.data?.isFollowing === true, "authed user profile should include follow state");

    const { body: summary } = await request("GET", "/notifications/summary", undefined, owner.accessToken);
    const rows = summary.data || [];
    const unreadByType = Object.fromEntries(rows.map((row) => [row.key, row.unread]));
    assert(unreadByType.like >= 1, "like notification missing");
    assert(unreadByType.favorite >= 1, "favorite notification missing");
    assert(unreadByType.remake >= 1, "remake notification missing");
    assert(unreadByType.follow >= 1, "follow notification missing");

    const { body: likeMessages } = await request("GET", "/notifications/like", undefined, owner.accessToken);
    assert((likeMessages.data || []).some((item) => item.content.includes("smoke-social-work")), "like message content missing");

    const { body: markedLike } = await request("PATCH", "/notifications/like/read", undefined, owner.accessToken);
    assert(markedLike.data?.ok === true, "like notification mark-read failed");
    const { body: afterReadSummary } = await request("GET", "/notifications/summary", undefined, owner.accessToken);
    const likeRow = (afterReadSummary.data || []).find((item) => item.key === "like");
    assert(likeRow?.unread === 0, "like notification unread count did not clear");

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

  await step("checkin and invite rewards", async () => {
    const inviterLogin = await request("POST", "/auth/wechat/login", { code: `mock-smoke-inviter-${Date.now()}` });
    const inviteeLogin = await request("POST", "/auth/wechat/login", { code: `mock-smoke-invitee-${Date.now()}` });
    const inviter = inviterLogin.body.data;
    const invitee = inviteeLogin.body.data;
    assert(inviter?.accessToken && invitee?.accessToken, "invite smoke tokens missing");

    const { body: checkinStatus } = await request("GET", "/checkin/status", undefined, invitee.accessToken);
    assert(typeof checkinStatus.data?.checkedToday === "boolean", "checkin status missing");

    const { body: beforeCheckinBalance } = await request("GET", "/credits/balance", undefined, invitee.accessToken);
    const { body: checked } = await request("POST", "/checkin", undefined, invitee.accessToken);
    assert(checked.data?.checked === true, "first checkin did not succeed");
    assert(checked.data?.credits > 0, "checkin credits missing");
    assert(checked.data?.balance === beforeCheckinBalance.data.credits + checked.data.credits, "checkin balance mismatch");

    const { body: checkedAgain } = await request("POST", "/checkin", undefined, invitee.accessToken);
    assert(checkedAgain.data?.checked === false, "second same-day checkin should be idempotent");

    const { body: inviterSummary } = await request("GET", "/invite/summary", undefined, inviter.accessToken);
    const inviteCode = inviterSummary.data?.inviteCode;
    assert(inviteCode, "invite code missing");

    const { body: bindResult } = await request("POST", "/invite/bind", { code: inviteCode }, invitee.accessToken);
    assert(bindResult.data?.ok === true, "invite bind failed");
    assert(bindResult.data?.rewardCredits > 0, "invitee reward missing");

    const { body: updatedSummary } = await request("GET", "/invite/summary", undefined, inviter.accessToken);
    assert(updatedSummary.data?.invitedCount >= inviterSummary.data.invitedCount + 1, "invited count did not increase");
    assert(updatedSummary.data?.totalReward >= inviterSummary.data.totalReward + updatedSummary.data.rewardPerInvite, "inviter reward missing");

    const duplicate = await request("POST", "/invite/bind", { code: inviteCode }, invitee.accessToken, true);
    assert(duplicate.status >= 400 || duplicate.body?.code !== 0, "duplicate invite bind should fail");
  });

  await step("history and report", async () => {
    const ownerLogin = await request("POST", "/auth/wechat/login", { code: `mock-smoke-report-owner-${Date.now()}` });
    const viewerLogin = await request("POST", "/auth/wechat/login", { code: `mock-smoke-report-viewer-${Date.now()}` });
    const owner = ownerLogin.body.data;
    const viewer = viewerLogin.body.data;
    assert(owner?.accessToken && viewer?.accessToken, "history/report smoke tokens missing");

    const { body: created } = await request(
      "POST",
      "/works",
      {
        title: "smoke-history-report-work",
        description: "history report smoke",
        prompt: "history report prompt",
        imageUrl: "https://example.com/smoke-history-report-work.png",
        ratio: "1:1",
        quality: "1K",
        modelId: "smoke-model",
        style: "smoke-style",
        isPublic: true
      },
      owner.accessToken
    );
    const workId = created.data?.id;
    assert(workId, "history/report work id missing");

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
      assert(adminLogin.data?.accessToken, "admin token missing for history/report approval");
      await request("POST", `/admin/reviews/${workId}/approve`, {}, adminLogin.data.accessToken);
    }

    const { body: viewed } = await request("POST", `/social/works/${workId}/view`, undefined, viewer.accessToken);
    assert(viewed.data?.viewed === true, "work view was not recorded");

    const { body: history } = await request("GET", "/social/history?page=1&pageSize=10", undefined, viewer.accessToken);
    assert((history.data?.items || []).some((item) => item.id === workId), "viewed work missing from history");

    const { body: report } = await request(
      "POST",
      `/social/works/${workId}/report`,
      { reason: "smoke-test", description: "smoke report" },
      viewer.accessToken
    );
    assert(report.data?.id, "report id missing");
    assert(report.data?.duplicated === false, "first report should not be duplicated");

    const { body: duplicateReport } = await request(
      "POST",
      `/social/works/${workId}/report`,
      { reason: "smoke-test", description: "smoke report duplicate" },
      viewer.accessToken
    );
    assert(duplicateReport.data?.duplicated === true, "duplicate report should be idempotent");

    await request("DELETE", "/social/history", undefined, viewer.accessToken);
    const { body: clearedHistory } = await request("GET", "/social/history?page=1&pageSize=10", undefined, viewer.accessToken);
    assert(!(clearedHistory.data?.items || []).some((item) => item.id === workId), "history was not cleared");

    await request("DELETE", `/works/${workId}?action=delete`, undefined, owner.accessToken);
  });

  await step("reverse prompt", async () => {
    const login = await request("POST", "/auth/wechat/login", { code: `mock-smoke-reverse-${Date.now()}` });
    const user = login.body.data;
    assert(user?.accessToken, "reverse prompt token missing");

    const { body: beforeBalance } = await request("GET", "/credits/balance", undefined, user.accessToken);
    const { body: reversed } = await request(
      "POST",
      "/generate/reverse-prompt",
      {
        imageUrl: "https://example.com/anime-portrait-smoke.png",
        hint: "anime portrait"
      },
      user.accessToken
    );
    assert(reversed.data?.prompt?.includes("anime"), "reverse prompt text missing expected style hint");
    assert(reversed.data?.costCredits > 0, "reverse prompt cost missing");
    assert(reversed.data?.creditsAfter === beforeBalance.data.credits - reversed.data.costCredits, "reverse prompt credits mismatch");
  });

  if (SMOKE_GENERATE_MOCK) {
    await step("generate mock completion", async () => {
      const login = await request("POST", "/auth/wechat/login", { code: `mock-smoke-generate-${Date.now()}` });
      const user = login.body.data;
      assert(user?.accessToken, "generate smoke token missing");

      const { body: bootstrap } = await request("GET", "/app/bootstrap");
      const model = (bootstrap.data?.models || []).find((item) => item.enabled !== false) || bootstrap.data?.models?.[0];
      const ratio = (bootstrap.data?.ratios || []).find((item) => item.enabled !== false) || bootstrap.data?.ratios?.[0];
      const quality = (bootstrap.data?.qualities || []).find((item) => item.enabled !== false) || bootstrap.data?.qualities?.[0];
      assert(model?.id, "generate model missing");
      assert(ratio?.label, "generate ratio missing");
      assert(quality?.label, "generate quality missing");

      const { body: beforeBalance } = await request("GET", "/credits/balance", undefined, user.accessToken);
      const { body: created } = await request(
        "POST",
        "/generate/jobs",
        {
          mode: "text-to-image",
          modelId: model.id,
          prompt: "smoke mock generate draft",
          style: "smoke",
          ratio: ratio.label,
          quality: quality.label,
          count: 1
        },
        user.accessToken
      );
      const job = created.data?.job;
      assert(created.data?.status === "succeeded", "mock generate did not finish immediately");
      assert(job?.results?.[0]?.workId, "mock generate did not auto-save draft");
      assert(created.data?.creditsAfter === beforeBalance.data.credits - created.data.costCredits, "generate credits mismatch");

      const { body: detail } = await request("GET", `/generate/jobs/${created.data.jobId}`, undefined, user.accessToken);
      assert(detail.data?.status === "succeeded", "generated job detail status mismatch");
      assert(detail.data?.results?.[0]?.workId === job.results[0].workId, "generated job result work mismatch");

      const { body: drafts } = await request("GET", "/works/me/drafts?page=1&pageSize=20", undefined, user.accessToken);
      assert((drafts.data?.items || []).some((item) => item.id === job.results[0].workId), "generated draft missing from drafts");

      const workId = job.results[0].workId;
      const { body: submitted } = await request(
        "PATCH",
        `/works/${workId}`,
        {
          title: "smoke mock generated published work",
          description: "published from generated draft in smoke test",
          isPublic: true
        },
        user.accessToken
      );
      assert(["pending", "published"].includes(submitted.data?.status), "generated draft was not submitted for publishing");

      if (submitted.data?.status === "pending") {
        assert(ADMIN_USERNAME && ADMIN_PASSWORD, "admin credentials required to approve generated publish smoke");
        const { body: adminLogin } = await request("POST", "/admin/auth/login", {
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD
        });
        assert(adminLogin.data?.accessToken, "admin token missing for generated publish approval");
        await request("POST", `/admin/reviews/${workId}/approve`, {}, adminLogin.data.accessToken);
      }

      const [{ body: publishedDetail }, { body: publishedPlaza }] = await Promise.all([
        request("GET", `/works/${workId}`),
        request("GET", "/works/plaza?page=1&pageSize=20")
      ]);
      assert(
        publishedDetail.data?.status === "published" && publishedDetail.data?.isPublic === true,
        "approved generated work is not public"
      );
      assert((publishedPlaza.data?.items || []).some((item) => item.id === workId), "approved generated work missing from plaza");

      const { body: editedWork } = await request(
        "PATCH",
        `/works/${workId}`,
        { title: "smoke managed generated work", description: "edited by smoke work management flow", style: "managed" },
        user.accessToken
      );
      assert(editedWork.data?.title === "smoke managed generated work", "managed work title did not update");

      const { body: movedDraft } = await request("DELETE", `/works/${workId}?action=draft`, undefined, user.accessToken);
      assert(movedDraft.data?.ok === true && movedDraft.data?.action === "draft", "managed work did not move back to draft");

      const [{ body: draftDetail }, { body: afterDrafts }, { body: plazaAfterDraft }] = await Promise.all([
        request("GET", `/works/${workId}`, undefined, user.accessToken),
        request("GET", "/works/me/drafts?page=1&pageSize=20", undefined, user.accessToken),
        request("GET", "/works/plaza?page=1&pageSize=20")
      ]);
      assert(draftDetail.data?.status === "draft" && draftDetail.data?.isPublic === false, "managed work draft state mismatch");
      assert((afterDrafts.data?.items || []).some((item) => item.id === workId), "managed work missing from drafts after takedown");
      assert(!(plazaAfterDraft.data?.items || []).some((item) => item.id === workId), "drafted managed work still visible in plaza");

      const { body: deletedWork } = await request("DELETE", `/works/${workId}?action=delete`, undefined, user.accessToken);
      assert(deletedWork.data?.ok === true && deletedWork.data?.action === "delete", "managed work delete failed");
      const deletedDetail = await request("GET", `/works/${workId}`, undefined, undefined, true);
      assert(deletedDetail.status === 404 || deletedDetail.body?.code === 40004, "deleted managed work should not be readable");
    });
  } else {
    console.log("- generate mock completion skipped (set SMOKE_GENERATE_MOCK=true with GENERATE_ALLOW_MOCK=true API)");
  }

  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    const admin = await step("admin login", async () => {
      const { body } = await request("POST", "/admin/auth/login", { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
      assert(body.data?.accessToken, "admin token missing");
      return body.data;
    });

    await step("admin dashboard", async () => {
      const { body } = await request("GET", "/admin/dashboard/summary", undefined, admin.accessToken);
      assert(body.data, "admin dashboard summary missing");
      assert(typeof body.data.todos?.pendingReports === "number", "admin pending reports missing");
      assert(typeof body.data.todos?.pendingFeedback === "number", "admin pending feedback missing");
    });

    await step("admin system settings", async () => {
      const { body: settings } = await request("GET", "/admin/settings", undefined, admin.accessToken);
      assert(settings.data && typeof settings.data === "object", "admin settings missing");
      const next = {
        reviewMode: typeof settings.data.reviewMode === "string" ? settings.data.reviewMode : "auto",
        manualReviewEnabled: settings.data.manualReviewEnabled === undefined ? true : settings.data.manualReviewEnabled === "true"
      };
      const { body: saved } = await request("PUT", "/admin/settings", next, admin.accessToken);
      assert(saved.data?.reviewMode === next.reviewMode, "admin settings reviewMode did not persist");
      assert(String(saved.data?.manualReviewEnabled) === String(next.manualReviewEnabled), "admin settings manualReviewEnabled did not persist");
    });

    await step("admin push notification", async () => {
      const content = `smoke push notification ${Date.now()}`;
      const { body: created } = await request(
        "POST",
        "/admin/pushes",
        { title: "smoke push", content, target: String(user.user.id), status: "draft" },
        admin.accessToken
      );
      assert(created.data?.id, "push id missing");

      const { body: sent } = await request("POST", `/admin/pushes/${created.data.id}/send`, undefined, admin.accessToken);
      assert(sent.data?.status === "sent", "push status did not become sent");
      assert(sent.data?.deliveredCount === 1, "push delivered count mismatch");

      const { body: messages } = await request("GET", "/notifications/system", undefined, user.accessToken);
      assert(
        Array.isArray(messages.data) && messages.data.some((item) => item.content === content && item.unread === true),
        "pushed system notification missing"
      );

      const { body: revoked } = await request("POST", `/admin/pushes/${created.data.id}/revoke`, undefined, admin.accessToken);
      assert(revoked.data?.status === "revoked", "push revoke failed");
    });

    await step("admin announcement sync", async () => {
      const title = `smoke announcement ${Date.now()}`;
      const { body: created } = await request(
        "POST",
        "/admin/announcements",
        { title, summary: "smoke public announcement", action: "create", popup: true, rangeText: "smoke", enabled: true },
        admin.accessToken
      );
      assert(created.data?.id, "announcement id missing");

      const [{ body: publicList }, { body: bootstrap }] = await Promise.all([
        request("GET", "/config/announcements"),
        request("GET", "/app/bootstrap")
      ]);
      assert((publicList.data || []).some((item) => item.id === created.data.id && item.title === title), "public announcement missing");
      assert((bootstrap.data?.announcements || []).some((item) => item.id === created.data.id && item.popup === true), "bootstrap announcement missing");

      await request("DELETE", `/admin/announcements/${created.data.id}`, undefined, admin.accessToken);
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
