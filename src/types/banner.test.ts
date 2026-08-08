import { describe, expect, it } from "vitest";
import {
  BannerCreateSchema,
  BannerUpdateSchema,
  isBannerActive,
  isBannerScheduled,
  resolveBannerVariant,
  type BannerVariant,
} from "./banner";

const variant = (locale: string, caption = `${locale} caption`) =>
  ({ locale, caption, body: `${locale} body` }) as BannerVariant;

describe("resolveBannerVariant", () => {
  it("prefers the exact locale", () => {
    const banner = { variants: [variant("en"), variant("fr")] };
    expect(resolveBannerVariant(banner, "fr")?.caption).toBe("fr caption");
  });

  it("falls back to english when the locale is missing", () => {
    const banner = { variants: [variant("en"), variant("fr")] };
    expect(resolveBannerVariant(banner, "ja")?.caption).toBe("en caption");
  });

  it("falls back to the first variant when english is missing", () => {
    const banner = { variants: [variant("fr"), variant("ko")] };
    expect(resolveBannerVariant(banner, "ja")?.caption).toBe("fr caption");
  });

  it("returns null when there is nothing to show", () => {
    expect(resolveBannerVariant({ variants: [] }, "en")).toBeNull();
  });
});

describe("isBannerActive", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  const before = new Date("2026-01-01T00:00:00Z");
  const after = new Date("2026-02-01T00:00:00Z");

  it("hides disabled banners even inside their window", () => {
    expect(
      isBannerActive({ enabled: false, startAt: before, endAt: after }, now),
    ).toBe(false);
  });

  it("shows enabled banners with no window", () => {
    expect(
      isBannerActive({ enabled: true, startAt: null, endAt: null }, now),
    ).toBe(true);
  });

  it("hides banners that have not started yet", () => {
    expect(
      isBannerActive({ enabled: true, startAt: after, endAt: null }, now),
    ).toBe(false);
  });

  it("hides banners whose window has closed", () => {
    expect(
      isBannerActive({ enabled: true, startAt: null, endAt: before }, now),
    ).toBe(false);
  });

  it("shows banners inside their window", () => {
    expect(
      isBannerActive({ enabled: true, startAt: before, endAt: after }, now),
    ).toBe(true);
  });

  it("treats the end boundary as already over", () => {
    expect(
      isBannerActive({ enabled: true, startAt: null, endAt: now }, now),
    ).toBe(false);
  });

  it("treats the start boundary as already open", () => {
    expect(
      isBannerActive({ enabled: true, startAt: now, endAt: null }, now),
    ).toBe(true);
  });
});

describe("isBannerScheduled", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("flags an enabled banner that starts later", () => {
    const startAt = new Date("2026-02-01T00:00:00Z");
    expect(isBannerScheduled({ enabled: true, startAt }, now)).toBe(true);
  });

  it("does not flag a banner that has already started", () => {
    const startAt = new Date("2026-01-01T00:00:00Z");
    expect(isBannerScheduled({ enabled: true, startAt }, now)).toBe(false);
    expect(isBannerScheduled({ enabled: true, startAt: null }, now)).toBe(
      false,
    );
  });

  it("does not flag disabled banners", () => {
    const startAt = new Date("2026-02-01T00:00:00Z");
    expect(isBannerScheduled({ enabled: false, startAt }, now)).toBe(false);
  });
});

describe("BannerCreateSchema", () => {
  const base = { variants: [variant("en")] };

  it("defaults enabled and resetState", () => {
    const parsed = BannerCreateSchema.parse(base);
    expect(parsed.enabled).toBe(true);
    expect(parsed.resetState).toBe(false);
  });

  it("accepts an optional subtitle", () => {
    const parsed = BannerCreateSchema.parse({
      variants: [{ ...variant("en"), subtitle: "v1.2.0" }],
    });
    expect(parsed.variants[0].subtitle).toBe("v1.2.0");
  });

  it("coerces date strings", () => {
    const parsed = BannerCreateSchema.parse({
      ...base,
      startAt: "2026-01-01T00:00:00Z",
    });
    expect(parsed.startAt).toBeInstanceOf(Date);
  });

  it("rejects an end date at or before the start date", () => {
    const startAt = "2026-02-01T00:00:00Z";
    expect(
      BannerCreateSchema.safeParse({ ...base, startAt, endAt: startAt })
        .success,
    ).toBe(false);
    expect(
      BannerCreateSchema.safeParse({
        ...base,
        startAt,
        endAt: "2026-01-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate locales", () => {
    expect(
      BannerCreateSchema.safeParse({
        variants: [variant("en"), variant("en", "other")],
      }).success,
    ).toBe(false);
  });

  it("rejects an empty variant list", () => {
    expect(BannerCreateSchema.safeParse({ variants: [] }).success).toBe(false);
  });

  it("rejects unsupported locales", () => {
    expect(
      BannerCreateSchema.safeParse({ variants: [variant("de")] }).success,
    ).toBe(false);
  });

  it("rejects a variant with an empty body", () => {
    expect(
      BannerCreateSchema.safeParse({
        variants: [{ locale: "en", caption: "Hi", body: "  " }],
      }).success,
    ).toBe(false);
  });
});

describe("BannerUpdateSchema", () => {
  const id = "00000000-0000-4000-8000-000000000000";

  it("allows a partial update", () => {
    const parsed = BannerUpdateSchema.parse({ id, enabled: false });
    expect(parsed.enabled).toBe(false);
    expect(parsed.variants).toBeUndefined();
  });

  it("distinguishes clearing a date from leaving it alone", () => {
    expect(BannerUpdateSchema.parse({ id, endAt: null }).endAt).toBeNull();
    expect(BannerUpdateSchema.parse({ id }).endAt).toBeUndefined();
  });

  it("still rejects an inverted date window", () => {
    expect(
      BannerUpdateSchema.safeParse({
        id,
        startAt: "2026-02-01T00:00:00Z",
        endAt: "2026-01-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("requires a uuid", () => {
    expect(BannerUpdateSchema.safeParse({ id: "nope" }).success).toBe(false);
  });
});
