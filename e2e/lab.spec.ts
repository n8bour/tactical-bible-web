import { expect, test } from '@playwright/test';

test('tactics board: Much Wider spreads the team against the default team', async ({ page }) => {
  await page.goto('/tactics?tab=ip&ti=width:4');
  const board = page.getByTestId('tactics-board');
  await expect(board.locator('canvas')).toBeVisible();
  const width = board.locator('.metrics div', { hasText: 'Team avg width' }).locator('dd');
  await expect(width).toHaveAttribute('data-sign', 'pos', { timeout: 15_000 });
});

test('role explorer: lowering Vision lists what the player stops seeing', async ({ page }) => {
  await page.goto('/roles/iw_ip');
  const explorer = page.getByTestId('role-explorer');
  await expect(explorer.locator('canvas')).toBeVisible();
  const vision = explorer.locator('input[aria-label="Vision"]');
  await vision.focus();
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft');
  const diff = explorer.locator('.diff');
  await expect(diff).toContainText('Sees through balls');
  await expect(diff).toContainText('Pass range considered');
});
