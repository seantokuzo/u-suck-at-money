import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("login page loads with correct content", async ({ page }) => {
    await page.goto("/login");

    // App title is visible
    await expect(page.getByRole("heading", { name: "U Suck At Money" })).toBeVisible();

    // Subtitle is visible
    await expect(page.getByText("Let's fix that.")).toBeVisible();

    // GitHub sign-in button is visible
    await expect(page.getByRole("button", { name: /sign in with github/i })).toBeVisible();
  });

  test("unauthenticated users are redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");

    await expect(page).toHaveURL(/\/login/);
  });

  test("protected routes redirect unauthenticated users to /login", async ({ page }) => {
    await page.goto("/accounts");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("export API redirects unauthenticated requests to login", async ({ request }) => {
    const response = await request.get("/api/export?type=transactions");
    // Middleware redirects unauthenticated API requests to /login
    expect(response.url()).toContain("/login");
  });

  test("all protected routes redirect to login", async ({ page }) => {
    const protectedRoutes = ["/budget", "/settings", "/investments"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL("**/login");
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
