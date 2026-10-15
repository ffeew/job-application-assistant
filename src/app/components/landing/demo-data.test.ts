import { describe, expect, it } from "vitest";
import {
  demoListings,
  demoProfile,
  splitByPhrases,
  tailorRoles,
} from "./demo-data";

const allBulletIds = demoProfile.roles.flatMap((role) =>
  role.bullets.map((bullet) => bullet.id),
);

describe("landing demo data", () => {
  it.each(demoListings)("$id only uses entries from the profile", (listing) => {
    for (const id of listing.bulletIds) expect(allBulletIds).toContain(id);
    for (const skill of listing.skills)
      expect(demoProfile.skills).toContain(skill);
    expect(new Set(listing.bulletIds).size).toBe(listing.bulletIds.length);
  });

  it.each(demoListings)("$id marks every listing phrase", (listing) => {
    const marked = splitByPhrases(listing.body, listing.phrases)
      .filter((segment) => segment.marked)
      .map((segment) => segment.text);
    expect(new Set(marked)).toEqual(new Set(listing.phrases));
  });

  it.each(demoListings)(
    "$id marks every matched phrase on the page",
    (listing) => {
      const pageText = [
        listing.summary,
        ...tailorRoles(listing).flatMap((role) =>
          role.bullets.map((bullet) => bullet.text),
        ),
        ...listing.skills,
      ];
      const marked = new Set(
        pageText.flatMap((text) =>
          splitByPhrases(text, listing.matched)
            .filter((segment) => segment.marked)
            .map((segment) => segment.text),
        ),
      );
      expect(marked).toEqual(new Set(listing.matched));
    },
  );

  it("keeps bullets grouped by role in profile order", () => {
    const [platform] = demoListings;
    if (!platform) throw new Error("Expected a first listing");
    expect(tailorRoles(platform).map((role) => role.id)).toEqual([
      "r1",
      "r2",
      "r3",
    ]);
  });
});

describe("splitByPhrases", () => {
  it("matches whole words only", () => {
    expect(splitByPhrases("Going with Go.", ["Go"])).toEqual([
      { text: "Going with ", marked: false },
      { text: "Go", marked: true },
      { text: ".", marked: false },
    ]);
  });

  it("prefers the longest phrase", () => {
    expect(
      splitByPhrases("CI/CD pipelines", ["CI/CD", "CI/CD pipelines"]),
    ).toEqual([{ text: "CI/CD pipelines", marked: true }]);
  });

  it("returns the text unchanged without phrases", () => {
    expect(splitByPhrases("Plain", [])).toEqual([
      { text: "Plain", marked: false },
    ]);
  });
});
