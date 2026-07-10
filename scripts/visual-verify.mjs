/**
 * UI/UX 視覺驗證：載入各頁並截圖。
 * 用法：node scripts/visual-verify.mjs [--base http://localhost:5173]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:5173';

const OUT_DIR = join(import.meta.dirname, '..', 'docs', 'screenshots', 'ux-2026-07-10');
const RIDE_ID = process.env.RIDE_ID ?? '4';

const pages = [
  { name: '01-login', path: '/login', auth: false, waitFor: 'text=Fleet 派遣後台' },
  { name: '02-dashboard', path: '/', auth: true, waitFor: 'text=營運總覽' },
  { name: '03-fleet', path: '/fleet', auth: true, waitFor: 'text=即時車隊' },
  { name: '04-orders', path: '/orders', auth: true, waitFor: 'text=訂單管理' },
  { name: '05-order-detail', path: `/orders/${RIDE_ID}`, auth: true, waitFor: 'text=訂單 #' },
  { name: '06-drivers', path: '/drivers', auth: true, waitFor: 'text=司機管理' },
  { name: '07-reports', path: '/reports', auth: true, waitFor: 'text=日報表' },
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('帳號').fill('admin');
  await page.getByPlaceholder('密碼').fill('admin');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === '/' || url.pathname === '', { timeout: 20_000 });
  await page.waitForSelector('text=營運總覽', { timeout: 15_000 });
}

async function waitForPageReady(page, spec) {
  await page.waitForFunction(
    () => !document.querySelector('.ant-spin-spinning'),
    { timeout: 20_000 },
  ).catch(() => {});

  await page.waitForSelector(spec.waitFor, { timeout: 20_000 });

  if (spec.name.includes('orders') || spec.name.includes('drivers') || spec.name.includes('reports') || spec.name.includes('dashboard')) {
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.ant-table-row').length > 0 ||
        document.querySelector('.ant-empty') !== null ||
        document.querySelector('[data-testid="kpi-today"]') !== null,
      { timeout: 15_000 },
    ).catch(() => {});
  }

  if (spec.name.includes('fleet') || spec.name.includes('order-detail')) {
    await page.waitForSelector('.maplibregl-canvas', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = [];
  let loggedIn = false;

  for (const spec of pages) {
    const url = `${BASE}${spec.path}`;
    const shotPath = join(OUT_DIR, `${spec.name}.png`);
    const entry = { page: spec.name, url, screenshot: shotPath, status: 'pending', notes: '' };

    try {
      if (spec.auth && !loggedIn) {
        await login(page);
        loggedIn = true;
      }
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForPageReady(page, spec);

      if (spec.name.includes('orders') || spec.name.includes('drivers') || spec.name.includes('reports')) {
        entry.tableRows = await page.locator('.ant-table-row').count();
      }
      if (spec.name.includes('fleet')) {
        entry.mapCanvas = (await page.locator('.maplibregl-canvas').count()) > 0;
      }

      await page.screenshot({ path: shotPath, fullPage: true });
      entry.status = 'pass';
    } catch (err) {
      entry.status = 'fail';
      entry.notes += String(err?.message ?? err);
      await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
    }

    results.push(entry);
    console.log(`${entry.status === 'pass' ? '✅' : '❌'} ${spec.name} → ${shotPath}`);
  }

  const summary = {
    date: '2026-07-10',
    base: BASE,
    rideId: RIDE_ID,
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    results,
  };

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));
  console.log(`\n報告：${summary.passed}/${results.length} 通過`);

  await browser.close();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
