import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Belajar dari materi/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
});

test("dashboard redirects unauthenticated users", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: /Belajar dari materi/i })).toBeVisible();
});

test("new thread route redirects unauthenticated users", async ({ page }) => {
  await page.goto("/threads/new");
  await expect(page).toHaveURL(/\/\?next=%2Fthreads%2Fnew/);
});

test("thread workspace redirects unauthenticated users", async ({ page }) => {
  await page.goto("/threads/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(
    /\/\?next=%2Fthreads%2F00000000-0000-4000-8000-000000000000/,
  );
});

test("mobile landing does not overlap primary sign-in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
});
