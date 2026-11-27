import { expect, test, type Page } from '@playwright/test';

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

interface PitchCircleGeom {
  kind: 'player' | 'ghost';
  x: number;
  y: number;
  r: number;
  text: string;
}

async function readPitchCircles(page: Page): Promise<PitchCircleGeom[]> {
  return page.locator('svg.pitch-svg').first().evaluate((svg) => {
    const circles: PitchCircleGeom[] = [];

    // Rendered player token body circles (positioned via parent g.pitch-token transform)
    svg.querySelectorAll('g.pitch-token').forEach((group) => {
      const body = group.querySelector('circle.pitch-token-body');
      if (!body) return;
      const styleTransform = (group as SVGElement).style.transform || '';
      const match = styleTransform.match(/translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\s*\)/);
      const x = match ? Number(match[1]) : Number.NaN;
      const y = match ? Number(match[2]) : Number.NaN;
      const r = Number(body.getAttribute('r') ?? '0');
      circles.push({
        kind: 'player',
        x,
        y,
        r,
        text: group.textContent?.trim() ?? '',
      });
    });

    // Rendered ghost baseline circles (positioned via cx/cy/r)
    svg.querySelectorAll('circle[cx][cy][r]').forEach((circle) => {
      if (!circle.getAttribute('stroke-dasharray')) return;
      const x = Number(circle.getAttribute('cx'));
      const y = Number(circle.getAttribute('cy'));
      const r = Number(circle.getAttribute('r'));
      circles.push({ kind: 'ghost', x, y, r, text: 'ghost' });
    });

    return circles;
  });
}

function assertAllCirclesStrictlyInPitch(circles: PitchCircleGeom[], context: string) {
  for (const c of circles) {
    expect(Number.isFinite(c.x), `${context} ${c.kind} (${c.text}) finite x`).toBe(true);
    expect(Number.isFinite(c.y), `${context} ${c.kind} (${c.text}) finite y`).toBe(true);
    expect(c.r, `${context} ${c.kind} (${c.text}) radius > 0`).toBeGreaterThan(0);
    expect(c.x - c.r, `${context} ${c.kind} (${c.text}) left edge >= 0`).toBeGreaterThanOrEqual(0);
    expect(c.x + c.r, `${context} ${c.kind} (${c.text}) right edge <= 105`).toBeLessThanOrEqual(
      105,
    );
    expect(c.y - c.r, `${context} ${c.kind} (${c.text}) top edge >= 0`).toBeGreaterThanOrEqual(0);
    expect(c.y + c.r, `${context} ${c.kind} (${c.text}) bottom edge <= 68`).toBeLessThanOrEqual(
      68,
    );
  }
}

async function readPitchArrows(page: Page) {
  return page.locator('svg.pitch-svg line[marker-end]').evaluateAll((nodes) =>
    nodes.map((node) => ({
      x1: Number(node.getAttribute('x1')),
      y1: Number(node.getAttribute('y1')),
      x2: Number(node.getAttribute('x2')),
      y2: Number(node.getAttribute('y2')),
    })),
  );
}

test.describe('FM27 Tactical Bible SPA', () => {
  test('1. loads Tactics Board with 4-item Sidebar, crisp SVG pitch above fold, and 0-reload instant switching', async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Track any unexpected full page reloads after initial load
    let reloadCount = 0;
    page.on('load', () => {
      reloadCount += 1;
    });
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__spaSentinel = 'no-reload-sentinel';
    });

    const nav = page.locator('aside.sidebar nav[aria-label="Primary navigation"]');
    await expect(nav).toBeVisible();
    for (const label of ['Tactics Board', 'Roles', 'Instructions', 'Guides']) {
      await expect(nav.getByRole('button', { name: label })).toBeVisible();
    }

    const pitch = page.locator('svg.pitch-svg').first();
    await expect(pitch).toBeVisible();

    const box = await pitch.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(260);
    expect(box!.width).toBeGreaterThan(400);
    expect(box!.height).toBeGreaterThan(250);

    const circles = await readPitchCircles(page);
    const playerCircles = circles.filter((c) => c.kind === 'player');
    expect(playerCircles.length).toBe(11);
    assertAllCirclesStrictlyInPitch(circles, 'Initial Tactics Board');

    // Switch across all 4 sections with zero page reloads
    await nav.getByRole('button', { name: 'Roles' }).click();
    await expect(page.getByRole('radio', { name: 'Browse Roles' })).toBeVisible();

    await nav.getByRole('button', { name: 'Instructions' }).click();
    await expect(page.getByRole('radio', { name: 'Team IP' })).toBeVisible();

    await nav.getByRole('button', { name: 'Guides' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await nav.getByRole('button', { name: 'Tactics Board' }).click();
    await expect(page.locator('svg.pitch-svg').first()).toBeVisible();

    const sentinel = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__spaSentinel,
    );
    expect(sentinel).toBe('no-reload-sentinel');
    expect(reloadCount).toBe(0);
    expect(errors).toEqual([]);
  });

  test('2. Tactics Board modes: 3x3 Zones, Coverage swap on Low-Block 5-4-1, and Import/Export dialog', async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Switch to 3x3 Zones and click a ball zone directly on the pitch
    await page.getByRole('radio', { name: '3×3 Zones' }).click();
    const attLeftZone = page.locator(
      'svg.pitch-svg [aria-label="Set ball zone to Att third, Left lane"]',
    );
    await expect(attLeftZone).toBeVisible();
    await attLeftZone.click();
    await expect(page.getByText('Ball in Final Third · Left Lane')).toBeVisible();

    // Load Low-Block 5-4-1 preset and switch to Coverage mode
    await page.getByRole('combobox', { name: 'Tactical preset' }).click();
    await page.getByRole('option', { name: 'Low-Block 5-4-1' }).click();

    await page.getByRole('radio', { name: 'Coverage' }).click();
    await expect(page.getByRole('heading', { name: /Zone Coverage/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Role-Swap Suggestions/i })).toBeVisible();

    const applySwapBtn = page.getByRole('button', { name: 'Apply swap' }).first();
    await expect(applySwapBtn).toBeVisible();
    await applySwapBtn.click();

    // Open Import / Export dialog
    await page.getByRole('button', { name: 'Import / Export' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Import \/ Export Tactic/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    expect(errors).toEqual([]);
  });

  test('3. Instructions view: full Attacking Width sweep stays strictly in 105x68 & Attack the Defensive Line has forward-only arrows', async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await page
      .locator('aside.sidebar nav[aria-label="Primary navigation"]')
      .getByRole('button', { name: 'Instructions' })
      .click();

    // Select Attacking Width TI and sweep all 5 options
    await page.getByRole('button', { name: /Attacking Width/i }).first().click();

    const widthOptions = ['Much Narrower', 'Narrower', 'Balanced', 'Wider', 'Much Wider'] as const;
    const spreads: Record<string, number> = {};

    for (const option of widthOptions) {
      const optControl = page
        .getByRole('radio', { name: option, exact: true })
        .or(page.getByRole('button', { name: option, exact: true }))
        .first();
      await optControl.click();

      const circles = await readPitchCircles(page);
      const players = circles.filter((c) => c.kind === 'player');
      expect(players.length).toBeGreaterThanOrEqual(8);
      assertAllCirclesStrictlyInPitch(circles, `Attacking Width (${option})`);

      const ys = players.map((p) => p.y);
      spreads[option] = Math.max(...ys) - Math.min(...ys);
    }

    expect(spreads['Much Wider']).toBeGreaterThan(spreads['Much Narrower']);

    // Switch to Player Instructions -> Attack the Defensive Line
    const piSwitch = page
      .getByRole('radio', { name: /^Player$|Player Instructions/i })
      .or(page.getByRole('tab', { name: /^Player$|Player Instructions/i }))
      .or(page.getByRole('button', { name: /^Player$|Player Instructions/i }))
      .first();
    await piSwitch.click();

    await page.getByRole('button', { name: /Attack the Defensive Line/i }).first().click();

    const piCircles = await readPitchCircles(page);
    expect(piCircles.filter((c) => c.kind === 'player').length).toBeGreaterThanOrEqual(1);
    assertAllCirclesStrictlyInPitch(piCircles, 'Attack the Defensive Line');

    const arrows = await readPitchArrows(page);
    expect(arrows.length).toBeGreaterThanOrEqual(1);
    for (const a of arrows) {
      expect(a.x2).toBeGreaterThan(a.x1);
      expect(a.x1).toBeGreaterThanOrEqual(0);
      expect(a.x2).toBeLessThanOrEqual(105);
      expect(a.y1).toBeGreaterThanOrEqual(0);
      expect(a.y2).toBeLessThanOrEqual(68);
    }

    expect(errors).toEqual([]);
  });

  test('4. Roles view: browse/filter, Role Fit Finder with archetype + FM27 ME-Weighted, and Compare Roles + Swap', async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await page
      .locator('aside.sidebar nav[aria-label="Primary navigation"]')
      .getByRole('button', { name: 'Roles' })
      .click();

    // Browse & filter roles
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Mezzala');
    await expect(page.getByText(/Channel Midfielder/i).first()).toBeVisible();
    await searchInput.fill('');

    // Open Role Fit Finder
    await page
      .getByRole('radio', { name: /Role Fit Finder/i })
      .or(page.getByRole('tab', { name: /Role Fit Finder/i }))
      .first()
      .click();

    // Pick an archetype preset and toggle FM27 ME-Weighted
    const archetypeBtn = page
      .getByRole('button', {
        name: /Pressing Channel Striker|Creative Number 10|Inverted|Wing-Back|Playmaker|Centre-Back/i,
      })
      .first();
    await archetypeBtn.click();

    const meToggle = page
      .getByRole('radio', { name: /FM27 ME/i })
      .or(page.getByRole('switch', { name: /FM27 ME/i }))
      .or(page.getByRole('button', { name: /FM27 ME/i }))
      .first();
    await meToggle.click();

    // Open Compare Roles and verify Swap actually exchanges Role A and Role B
    await page
      .getByRole('radio', { name: /Compare Roles/i })
      .or(page.getByRole('tab', { name: /Compare Roles/i }))
      .first()
      .click();

    const roleATrigger = page.getByRole('combobox', { name: 'Select Role A' });
    const roleBTrigger = page.getByRole('combobox', { name: 'Select Role B' });
    const beforeA = (await roleATrigger.innerText()).trim();
    const beforeB = (await roleBTrigger.innerText()).trim();
    expect(beforeA).not.toEqual(beforeB);

    const swapBtn = page.getByRole('button', { name: /Swap/i }).first();
    await expect(swapBtn).toBeVisible();
    await swapBtn.click();

    await expect(roleATrigger).toHaveText(beforeB);
    await expect(roleBTrigger).toHaveText(beforeA);

    expect(errors).toEqual([]);
  });

  test('5. Guides view and Ctrl+K SearchModal quick-jump work with 0 errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Navigate to Guides
    await page
      .locator('aside.sidebar nav[aria-label="Primary navigation"]')
      .getByRole('button', { name: 'Guides' })
      .click();

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Open global SearchModal with Ctrl+K and quick-jump to a role
    await page.keyboard.press('Control+k');
    const searchBox = page
      .getByRole('combobox', {
        name: /Search roles, instructions, attributes, and guides/i,
      })
      .or(page.getByPlaceholder(/Search roles, FM24 equivalents/i))
      .first();
    await expect(searchBox).toBeVisible();
    await searchBox.fill('Inside Full-Back');
    await page.keyboard.press('Enter');

    await expect(page.getByText(/Inside Full-Back/i).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
