import { expect, test } from '@playwright/test';

test('Stay Wider widens the focus winger against the baseline', async ({ page }) => {
  await page.goto('/instructions/player/stay_wider');
  const lab = page.getByTestId('pitch-lab');
  await expect(lab.locator('canvas')).toBeVisible();

  await lab.getByRole('tab', { name: 'View' }).click();
  await lab.getByRole('switch', { name: 'Compare with baseline' }).click();
  await lab.getByRole('tab', { name: 'Player' }).click();
  await lab.getByRole('switch', { name: 'Stay wider' }).click();

  await expect(lab.locator('[data-metric="avgWidth"]')).toHaveAttribute('data-sign', 'pos', { timeout: 15_000 });
  await expect(lab.locator('[data-metric="avgWidth"]')).toHaveText(/^\+/);
});
