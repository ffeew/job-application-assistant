import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./support/fixtures";
import {
  anonymousRequest,
  expectedFail,
  hold,
  revokeSessions,
} from "./support/helpers";

const REPOSITORY = "https://github.com/ffeew/job-application-assistant";
const PHONE = { width: 390, height: 844 };

function banner(page: Page) {
  return page.getByRole("banner");
}

function bannerLink(page: Page, name: string) {
  return banner(page).getByRole("link", { name, exact: true });
}

async function expectSignedOutHeader(page: Page) {
  await expect(bannerLink(page, "Sign in")).toBeVisible();
  await expect(bannerLink(page, "Create account")).toBeVisible();
  await expect(bannerLink(page, "Open dashboard")).toHaveCount(0);
}

function demo(page: Page) {
  // The listing tabs and the page they tailor share this parent.
  return page
    .getByRole("group", { name: "Example job listings", exact: true })
    .locator("..");
}

function revisions(page: Page) {
  return demo(page)
    .getByText("Revisions", { exact: true })
    .locator("xpath=following-sibling::dd");
}

function html(page: Page) {
  return page.locator("html");
}

async function chooseTheme(page: Page, theme: "System" | "Light" | "Dark") {
  await page.getByRole("button", { name: "Change theme", exact: true }).click();
  await page.getByRole("menuitem", { name: theme, exact: true }).click();
}

function storedTheme(page: Page) {
  return page.evaluate(() => localStorage.getItem("theme"));
}

test.describe(
  "Landing page: content, section anchors and calls to action (signed out)",
  { tag: "@landing-signed-out" },
  () => {
    test.use({ authenticated: false });

    test("shows the product, its sections and the signed-out header", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page).toHaveTitle("Job Application Assistant");
      await expectSignedOutHeader(page);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: /Paste the job listing\./,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "How a resume gets made",
          exact: true,
        }),
      ).toBeVisible();
      for (const step of [
        "Add your record once",
        "Add the job",
        "Preview the page",
        "Save and download",
      ])
        await expect(
          page.getByRole("heading", { level: 3, name: step, exact: true }),
        ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Also on the desk", exact: true }),
      ).toBeVisible();
      const table = page.getByRole("table", {
        name: "Example applications",
        exact: true,
      });
      await expect(
        table.getByRole("row").filter({ has: page.getByRole("cell") }),
      ).toHaveCount(5);
      await expect(
        page.getByRole("heading", { name: "Runs on your server", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Start with your profile",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("section links and the hero button jump to their sections", async ({
      page,
    }) => {
      await page.goto("/");
      const sections = page.getByRole("navigation", {
        name: "Page sections",
        exact: true,
      });
      await sections
        .getByRole("link", { name: "How it works", exact: true })
        .click();
      await expect(page).toHaveURL(/\/#how-it-works$/);
      await expect(
        page.getByRole("heading", {
          name: "How a resume gets made",
          exact: true,
        }),
      ).toBeInViewport();

      await sections
        .getByRole("link", { name: "Self-hosting", exact: true })
        .click();
      await expect(page).toHaveURL(/\/#self-hosting$/);
      await expect(
        page.getByRole("heading", { name: "Runs on your server", exact: true }),
      ).toBeInViewport();

      await page
        .getByRole("main")
        .getByRole("link", { name: "See how it works", exact: true })
        .click();
      await expect(page).toHaveURL(/\/#how-it-works$/);
      await expect(
        page.getByRole("heading", {
          name: "How a resume gets made",
          exact: true,
        }),
      ).toBeInViewport();
    });

    test("every Create account button leads to sign up, and Sign in to sign in", async ({
      page,
    }) => {
      await page.goto("/");
      const createAccount = [
        bannerLink(page, "Create account"),
        page
          .getByRole("main")
          .getByRole("link", { name: "Create account", exact: true }),
        page
          .getByRole("contentinfo")
          .getByRole("link", { name: "Create account", exact: true }),
      ];
      for (const link of createAccount)
        await expect(link).toHaveAttribute("href", "/sign-up");

      await bannerLink(page, "Create account").click();
      await expect(page).toHaveURL(/\/sign-up$/);
      await expect(
        page.getByRole("heading", { name: "Create account", exact: true }),
      ).toBeVisible();

      await page.goBack();
      await bannerLink(page, "Sign in").click();
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("heading", { name: "Sign in", exact: true }),
      ).toBeVisible();

      await page.goto("/");
      await page
        .getByRole("contentinfo")
        .getByRole("link", { name: "Create account", exact: true })
        .click();
      await expect(page).toHaveURL(/\/sign-up$/);
    });

    test("outbound links open in a new tab without access to this page", async ({
      page,
    }) => {
      await page.goto("/");
      const projectLinks = page.getByRole("navigation", {
        name: "Project links",
        exact: true,
      });
      const links: [Locator, string][] = [
        [
          page
            .getByRole("navigation", { name: "Page sections", exact: true })
            .getByRole("link", { name: "GitHub", exact: true }),
          REPOSITORY,
        ],
        [
          page.getByRole("link", { name: "deployment guide", exact: true }),
          `${REPOSITORY}/blob/main/docs/deployment.md`,
        ],
        [
          page.getByRole("link", {
            name: "View source on GitHub",
            exact: true,
          }),
          REPOSITORY,
        ],
        [
          projectLinks.getByRole("link", { name: "GitHub", exact: true }),
          REPOSITORY,
        ],
        [
          projectLinks.getByRole("link", {
            name: "Documentation",
            exact: true,
          }),
          `${REPOSITORY}#readme`,
        ],
        [
          projectLinks.getByRole("link", { name: "Issues", exact: true }),
          `${REPOSITORY}/issues`,
        ],
        [
          projectLinks.getByRole("link", { name: "Releases", exact: true }),
          `${REPOSITORY}/releases`,
        ],
      ];
      for (const [link, href] of links) {
        await expect(link).toHaveAttribute("href", href);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    });

    test("a never-answered session check keeps placeholders but leaves the page usable", async ({
      page,
    }) => {
      const pending = await hold(page, "**/api/auth/get-session*", "GET");
      await page.goto("/");
      // The placeholders are server-rendered, so they prove nothing until the
      // check is actually in flight.
      await expect.poll(() => pending.requests.length).toBeGreaterThan(0);
      await expect(banner(page).getByRole("status")).toHaveCount(2);
      await expect(bannerLink(page, "Sign in")).toHaveCount(0);
      await page
        .getByRole("main")
        .getByRole("link", { name: "See how it works", exact: true })
        .click();
      await expect(page).toHaveURL(/\/#how-it-works$/);
      pending.release();
      await expectSignedOutHeader(page);
      await expect(banner(page).getByRole("status")).toHaveCount(0);
    });

    test.describe("with a session cookie", () => {
      test.use({ authenticated: true });

      test("a revoked session shows the signed-out header", async ({
        page,
        database,
        candidate,
      }) => {
        await revokeSessions(database, candidate.id);
        await page.goto("/");
        await expectSignedOutHeader(page);
      });

      test("a failed session check falls back to the signed-out header", async ({
        page,
      }) => {
        let checks = 0;
        await page.route("**/api/auth/get-session*", (route) => {
          checks += 1;
          return route.fulfill({ status: 500, json: {} });
        });
        await page.goto("/");
        await expectSignedOutHeader(page);
        expect(checks).toBeGreaterThan(0);
      });

      test("an unreachable session check falls back to the signed-out header", async ({
        page,
      }) => {
        let checks = 0;
        await page.route("**/api/auth/get-session*", (route) => {
          checks += 1;
          return route.abort("internetdisconnected");
        });
        await page.goto("/");
        await expectSignedOutHeader(page);
        expect(checks).toBeGreaterThan(0);
      });
    });
  },
);

test.describe(
  "Landing page header for a signed-in user ('Open dashboard')",
  { tag: "@landing-signed-in" },
  () => {
    test("the header offers the dashboard instead of the account buttons", async ({
      page,
    }) => {
      await page.goto("/");
      const openDashboard = bannerLink(page, "Open dashboard");
      await expect(openDashboard).toBeVisible();
      await expect(bannerLink(page, "Sign in")).toHaveCount(0);
      await expect(bannerLink(page, "Create account")).toHaveCount(0);
      await openDashboard.click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole("heading", { name: "Dashboard", exact: true }),
      ).toBeVisible();
    });

    test("the hero and footer calls to action still lead to sign up", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(bannerLink(page, "Open dashboard")).toBeVisible();
      for (const region of [
        page.getByRole("main"),
        page.getByRole("contentinfo"),
      ]) {
        const createAccount = region.getByRole("link", {
          name: "Create account",
          exact: true,
        });
        await expect(createAccount).toBeVisible();
        await expect(createAccount).toHaveAttribute("href", "/sign-up");
      }
    });
  },
);

test.describe(
  "Landing mobile menu sheet",
  { tag: "@landing-mobile-menu" },
  () => {
    test.use({ authenticated: false, viewport: PHONE });

    function menu(page: Page) {
      return page.getByRole("dialog", { name: "Menu", exact: true });
    }

    async function openMenu(page: Page) {
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
      await expect(menu(page)).toBeVisible();
    }

    test("the menu replaces the header links and takes the visitor where they choose", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page.getByRole("button", { name: "Open menu", exact: true }),
      ).toBeVisible();
      // Hidden elements are included so toBeHidden cannot pass on a missing one.
      const sections = page.getByRole("navigation", {
        name: "Page sections",
        exact: true,
        includeHidden: true,
      });
      await expect(sections).toHaveCount(1);
      await expect(sections).toBeHidden();
      const headerSignIn = banner(page).getByRole("link", {
        name: "Sign in",
        exact: true,
        includeHidden: true,
      });
      await expect(headerSignIn).toHaveCount(1);
      await expect(headerSignIn).toBeHidden();

      await openMenu(page);
      for (const name of [
        "How it works",
        "Self-hosting",
        "GitHub",
        "Create account",
        "Sign in",
      ])
        await expect(
          menu(page).getByRole("link", { name, exact: true }),
        ).toBeVisible();
      await menu(page)
        .getByRole("link", { name: "Sign in", exact: true })
        .click();
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("heading", { name: "Sign in", exact: true }),
      ).toBeVisible();
    });

    test("a section link closes the menu at that section", async ({ page }) => {
      await page.goto("/");
      await openMenu(page);
      await menu(page)
        .getByRole("link", { name: "How it works", exact: true })
        .click();
      await expect(menu(page)).toBeHidden();
      await expect(page).toHaveURL(/\/#how-it-works$/);
      expectedFail(
        "src/app/components/landing/mobile-menu.tsx:40: the click also closes the Sheet, and closing it undoes the jump, so the section heading ends with viewport ratio 0",
      );
      await expect(
        page.getByRole("heading", {
          name: "How a resume gets made",
          exact: true,
        }),
      ).toBeInViewport({ timeout: 2_000 });
    });

    test("Close and Escape dismiss the menu without navigating", async ({
      page,
    }) => {
      await page.goto("/");
      await openMenu(page);
      await menu(page)
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await expect(menu(page)).toBeHidden();
      await openMenu(page);
      await page.keyboard.press("Escape");
      await expect(menu(page)).toBeHidden();
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("button", { name: "Open menu", exact: true }),
      ).toBeVisible();
    });

    test("GitHub opens the repository in a new tab and leaves the menu open", async ({
      page,
    }) => {
      // The new tab must not reach the real site.
      await page
        .context()
        .route(`${REPOSITORY}**`, (route) =>
          route.fulfill({ contentType: "text/html", body: "" }),
        );
      await page.goto("/");
      await openMenu(page);
      const opened = page.context().waitForEvent("page");
      await menu(page)
        .getByRole("link", { name: "GitHub", exact: true })
        .click();
      const tab = await opened;
      await expect(tab).toHaveURL(REPOSITORY);
      await tab.close();
      await expect(menu(page)).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
    });

    test.describe("signed in", () => {
      test.use({ authenticated: true });

      test("the menu offers the dashboard instead of the account links", async ({
        page,
      }) => {
        await page.goto("/");
        await openMenu(page);
        const openDashboard = menu(page).getByRole("link", {
          name: "Open dashboard",
          exact: true,
        });
        await expect(openDashboard).toBeVisible();
        for (const name of ["Sign in", "Create account"])
          await expect(
            menu(page).getByRole("link", { name, exact: true }),
          ).toHaveCount(0);
        await openDashboard.click();
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(
          page.getByRole("heading", { name: "Dashboard", exact: true }),
        ).toBeVisible();
      });
    });
  },
);

test.describe(
  "Landing resume demo: switch example job listings",
  { tag: "@landing-resume-demo" },
  () => {
    test.use({ authenticated: false });

    test("each listing tab shows its own tailored page", async ({ page }) => {
      await page.goto("/");
      const tab = (name: string) =>
        demo(page).getByRole("button", { name, exact: true });
      const arvo = tab("Platform engineer at Arvo Robotics");
      const mintline = tab("Backend engineer, payments at Mintline");
      const corbel = tab("Engineering manager at Corbel Health");
      await expect(arvo).toHaveAttribute("aria-pressed", "true");
      await expect(mintline).toHaveAttribute("aria-pressed", "false");
      await expect(corbel).toHaveAttribute("aria-pressed", "false");
      await expect(
        demo(page).getByText("Platform engineer", { exact: true }),
      ).toBeVisible();
      await expect(revisions(page)).toHaveText("1");
      await expect(
        demo(page).getByText("6 of 14 bullets kept", { exact: true }),
      ).toBeVisible();
      await expect(
        demo(page).getByText("8 of 16 skills listed, most relevant first", {
          exact: true,
        }),
      ).toBeVisible();

      await mintline.click();
      await expect(mintline).toHaveAttribute("aria-pressed", "true");
      await expect(arvo).toHaveAttribute("aria-pressed", "false");
      await expect(
        demo(page).getByText("Backend engineer, payments", { exact: true }),
      ).toBeVisible();
      await expect(
        demo(page).getByText("Platform engineer", { exact: true }),
      ).toHaveCount(0);
      await expect(revisions(page)).toHaveText("2");

      await corbel.click();
      await expect(corbel).toHaveAttribute("aria-pressed", "true");
      await expect(
        demo(page).getByText("Engineering manager", { exact: true }),
      ).toBeVisible();
      await expect(revisions(page)).toHaveText("0");
      await expect(
        demo(page).getByText("Alex Example", { exact: true }),
      ).toBeVisible();
      await expect(
        demo(page).getByText("Fits 1 page", { exact: true }),
      ).toBeVisible();
    });
  },
);

test.describe(
  "Theme toggle (landing header and dashboard header)",
  { tag: "@theme-toggle" },
  () => {
    test.use({ colorScheme: "light" });

    test("follows the system until a theme is chosen, then keeps it after a reload", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(html(page)).toHaveClass(/\blight\b/);
      await chooseTheme(page, "Dark");
      await expect(html(page)).toHaveClass(/\bdark\b/);
      await expect.poll(() => storedTheme(page)).toBe("dark");
      await page.reload();
      await expect(html(page)).toHaveClass(/\bdark\b/);
      await expect(html(page)).not.toHaveClass(/\blight\b/);
    });

    test("auth pages have no toggle but use the saved theme", async ({
      page,
    }) => {
      await page.goto("/");
      await chooseTheme(page, "Dark");
      await expect(html(page)).toHaveClass(/\bdark\b/);
      await page.goto("/sign-in");
      await expect(
        page.getByRole("heading", { name: "Sign in", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Change theme", exact: true }),
      ).toHaveCount(0);
      await expect(html(page)).toHaveClass(/\bdark\b/);
    });

    test("the dashboard toggle can go back to following the system", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard", exact: true }),
      ).toBeVisible();
      await chooseTheme(page, "Dark");
      await expect(html(page)).toHaveClass(/\bdark\b/);
      await chooseTheme(page, "System");
      await expect(html(page)).toHaveClass(/\blight\b/);
      await expect.poll(() => storedTheme(page)).toBe("system");
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(html(page)).toHaveClass(/\bdark\b/);
    });
  },
);

test.describe("404 pages", { tag: "@not-found" }, () => {
  test("an unknown page answers 404 with the not-found page", async ({
    page,
  }) => {
    const response = await page.goto("/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "404", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "This page could not be found.",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("an unknown dashboard page is a 404 when signed in", async ({
    page,
  }) => {
    const response = await page.goto("/dashboard/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(/\/dashboard\/does-not-exist$/);
    await expect(
      page.getByRole("heading", {
        name: "This page could not be found.",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("unknown API paths answer 404", async ({
    playwright,
    extraHTTPHeaders,
  }) => {
    const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
    try {
      for (const path of ["/api/does-not-exist", "/api/auth/does-not-exist"])
        expect((await anonymous.get(path)).status()).toBe(404);
    } finally {
      await anonymous.dispose();
    }
  });

  test.describe("signed out", () => {
    test.use({ authenticated: false });

    test("an unknown dashboard path sends the visitor to sign in", async ({
      page,
    }) => {
      await page.goto("/dashboard/does-not-exist");
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("heading", { name: "Sign in", exact: true }),
      ).toBeVisible();
    });
  });
});

test.describe("Health check endpoint", { tag: "@health" }, () => {
  test("answers ok without a session and is never cached", async ({
    playwright,
    extraHTTPHeaders,
  }) => {
    const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
    try {
      const response = await anonymous.get("/api/health");
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ status: "ok" });
      expect(response.headers()["cache-control"]).toContain("no-store");
    } finally {
      await anonymous.dispose();
    }
  });

  test("accepts only GET", async ({ playwright, extraHTTPHeaders }) => {
    const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
    try {
      expect((await anonymous.post("/api/health")).status()).toBe(405);
    } finally {
      await anonymous.dispose();
    }
  });
});
