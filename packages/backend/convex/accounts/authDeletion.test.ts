/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, describe, expect, it, vi } from "vitest"
import { hashPassword } from "better-auth/crypto"
import aggregateTest from "@convex-dev/aggregate/test"

import { api, components, internal } from "../_generated/api"
import schema from "../schema"
import authSchema from "../betterAuth/schema"

vi.hoisted(() => {
  vi.stubEnv("CONVEX_SITE_URL", "https://auth-test.convex.site")
  vi.stubEnv("SITE_URL", "http://localhost:3000")
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "isolated-account-deletion-test-secret-123456789"
  )
})

const modules = import.meta.glob(["/convex/**/*.ts", "!/convex/betterAuth/**"])
const authModules = import.meta.glob("../betterAuth/**/*.ts")

function backend() {
  const t = convexTest(schema, modules)
  aggregateTest.register(t, "publicDiscovery")
  t.registerComponent("betterAuth", authSchema, authModules)
  return t
}

async function fixture(t: ReturnType<typeof backend>) {
  const now = Date.now()
  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        name: "Deletion Test",
        email: "delete@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    },
  })
  await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "account",
      data: {
        accountId: user._id,
        userId: user._id,
        providerId: "credential",
        password: await hashPassword("delete-test-password"),
        createdAt: now,
        updatedAt: now,
      },
    },
  })
  const identity = {
    subject: user._id,
    issuer: "https://auth-test.convex.site",
    tokenIdentifier: `https://auth-test.convex.site|${user._id}`,
    email: "delete@example.com",
    emailVerified: true,
  }
  const client = t.withIdentity(identity)
  const { memberId } = await client.mutation(api.members.completeOnboarding, {
    role: "fan",
    handle: "deletion-test",
    displayName: "Deletion Test",
  })
  const response = await t.fetch("/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      email: identity.email,
      password: "delete-test-password",
    }),
  })
  expect(response.status).toBe(200)
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ")
  expect(cookie).toContain("session_token=")
  return { user, client, memberId, cookie, identity }
}

function deleteRequest(
  t: ReturnType<typeof backend>,
  cookie: string,
  body: object = {}
) {
  return t.fetch("/api/auth/delete-user", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      cookie,
    },
    body: JSON.stringify(body),
  })
}

afterEach(() => vi.useRealTimers())

describe("native Better Auth self-deletion", () => {
  it("requires authentication and rejects a wrong password without deleting content", async () => {
    const t = backend()
    const { cookie, memberId } = await fixture(t)
    expect((await deleteRequest(t, "")).status).toBe(401)
    const denied = await deleteRequest(t, cookie, {
      password: "wrong-password",
    })
    expect(denied.status).toBe(400)
    await expect(
      t.run((ctx) => ctx.db.get("members", memberId))
    ).resolves.toMatchObject({ status: "active" })
    await expect(
      t.run((ctx) => ctx.db.query("accountDeletions").take(1))
    ).resolves.toEqual([])
  })

  it("deletes through the native endpoint, invokes the component trigger and revokes stale JWTs", async () => {
    vi.useFakeTimers()
    const t = backend()
    const { cookie, memberId, client, identity, user } = await fixture(t)
    const response = await deleteRequest(t, cookie)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true })
    await expect(client.query(api.members.current, {})).resolves.toEqual({
      state: "anonymous",
    })
    await expect(
      client.mutation(api.members.completeOnboarding, {
        role: "fan",
        handle: "resurrected",
        displayName: "Old JWT",
      })
    ).rejects.toThrow("UNAUTHENTICATED")
    await expect(
      client.mutation(api.members.updateMyProfile, {
        handle: "resurrected",
        displayName: "Old JWT",
      })
    ).rejects.toThrow("UNAUTHENTICATED")
    await expect(
      t.mutation(internal.admin.setAccountSuspension, {
        memberId,
        suspended: false,
      })
    ).rejects.toThrow("ACCOUNT_UNAVAILABLE")
    await expect(
      t.query(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: user._id }],
      })
    ).resolves.toBeNull()
    for (const model of ["session", "account"] as const) {
      await expect(
        t.query(components.betterAuth.adapter.findOne, {
          model,
          where: [{ field: "userId", value: user._id }],
        })
      ).resolves.toBeNull()
    }
    await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    await expect(
      t.run((ctx) => ctx.db.get("members", memberId))
    ).resolves.toBeNull()
    await expect(
      t.run((ctx) => ctx.db.query("accountDeletions").take(2))
    ).resolves.toMatchObject([{ authUserId: identity.tokenIdentifier }])
    // Same email is not the security key: a genuinely new auth id may onboard.
    await expect(
      t
        .withIdentity({
          ...identity,
          subject: "new-auth-id",
          tokenIdentifier: "https://auth-test.convex.site|new-auth-id",
        })
        .mutation(api.members.completeOnboarding, {
          role: "fan",
          handle: "deletion-test",
          displayName: "New account",
        })
    ).resolves.toHaveProperty("memberId")
  })

  it("requires reauthentication for an old session but accepts the current password", async () => {
    vi.useFakeTimers()
    const t = backend()
    const { cookie, memberId } = await fixture(t)
    vi.advanceTimersByTime(25 * 60 * 60 * 1000)
    const stale = await deleteRequest(t, cookie)
    expect(stale.status).toBe(400)
    await expect(stale.json()).resolves.toMatchObject({
      code: "SESSION_EXPIRED",
    })
    await expect(
      t.run((ctx) => ctx.db.get("members", memberId))
    ).resolves.toMatchObject({ status: "active" })
    const confirmed = await deleteRequest(t, cookie, {
      password: "delete-test-password",
    })
    expect(confirmed.status).toBe(200)
    await t.finishAllScheduledFunctions(() => vi.runAllTimers())
    await expect(
      t.run((ctx) => ctx.db.get("members", memberId))
    ).resolves.toBeNull()
  })
})
