import { test, expect } from '@playwright/test';

test.describe('Lead Intelligence Features E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Capture page console logs
    page.on('console', msg => console.log(`[PAGE LOG] ${msg.text()}`));

    // Capture leads API responses
    page.on('response', async response => {
      if (response.url().includes('/api/leads') && !response.url().includes('/intelligence') && !response.url().includes('/progress') && !response.url().includes('/activities')) {
        console.log(`[API RESPONSE] URL: ${response.url()}`);
        try {
          const json = await response.json();
          const names = Array.isArray(json.data) ? json.data.map((l: any) => `${l.id}: ${l.company_name}`) : [];
          console.log(`[API RESPONSE] Leads list returned:`, JSON.stringify(names));
        } catch (e) {
          // Ignore non-json responses or bodies
        }
      }
    });

    // Disable product tour to prevent overlay from blocking interactions
    await page.addInitScript(() => {
      window.localStorage.setItem('leadsy-product-tour-completed', 'true');
      window.localStorage.setItem('leadsy-product-tour-active', 'false');
    });

    // 1. Log in
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@prasetia.co.id');
    await page.fill('input[type="password"]', 'ChangeMe!123');
    await page.click('button[type="submit"]');

    // Wait for the redirect to complete
    await expect(page).not.toHaveURL(/.*\/login.*/);
    await page.waitForLoadState('networkidle');
    console.log('Logged in successfully, current URL:', page.url());

    // Navigate to /leads using the sidebar link to preserve context
    const leadsLink = page.getByRole('link', { name: 'Leads', exact: true });
    await expect(leadsLink).toBeVisible();
    await leadsLink.click();
    await page.waitForLoadState('networkidle');
    console.log('After clicking Leads link, current URL:', page.url());

    // Search for Nestle to bring it to the first page
    const searchInput = page.locator('input[placeholder="Search company, industry, or email"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Nestle');
    await page.waitForLoadState('networkidle');
    console.log('After searching Nestle, current URL:', page.url());

    // Wait for the leads table to load and find the Nestle Indonesia lead link.
    const nestleLink = page.getByRole('link', { name: 'PT. Nestle Indonesia - Kejayan Factory', exact: false }).first();
    await expect(nestleLink).toBeVisible({ timeout: 15000 });
    await nestleLink.click();
    
    // Wait for the lead detail page queries to finish
    await page.waitForLoadState('networkidle');
    console.log('After clicking Nestle link, current URL:', page.url());
    
    // Confirm we are on the lead detail page
    await expect(page.locator('h1')).toContainText('PT. Nestle Indonesia');
  });

  test('should trigger all buttons in the Intelligence Tab successfully', async ({ page }) => {
    // Click the Intelligence Tab
    const intelligenceTab = page.getByRole('button', { name: 'Intelligence', exact: true });
    await expect(intelligenceTab).toBeVisible();
    await intelligenceTab.click();
    
    // Wait for the tab content to stabilize
    await expect(page.getByText('Run Intelligence Functions')).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // 1. Test "Rescore Lead"
    const rescoreButton = page.getByRole('button', { name: 'Rescore Lead', exact: true });
    await expect(rescoreButton).toBeVisible();
    const rescorePromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/rescore') && response.status() === 200,
      { timeout: 40000 }
    );
    await rescoreButton.click();
    await rescorePromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Rescore Lead API trigger successful');

    // 2. Test "Re-qualify"
    const qualifyButton = page.getByRole('button', { name: 'Re-qualify', exact: true });
    await expect(qualifyButton).toBeVisible();
    const qualifyPromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/qualify') && response.status() === 201,
      { timeout: 40000 }
    );
    await qualifyButton.click();
    await qualifyPromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Re-qualify API trigger successful');

    // 3. Test "Run ICP Match"
    const icpButton = page.getByRole('button', { name: 'Run ICP Match', exact: true }).first();
    await expect(icpButton).toBeVisible();
    const icpMatchPromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/icp-match') && response.status() === 200,
      { timeout: 40000 }
    );
    await icpButton.click();
    await icpMatchPromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Run ICP Match API trigger successful');

    // 4. Test "Run AI Analysis"
    const analysisButton = page.getByRole('button', { name: 'Run AI Analysis', exact: true }).first();
    await expect(analysisButton).toBeVisible();
    const aiAnalysisPromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/revenue-analysis') && response.status() === 201,
      { timeout: 40000 }
    );
    await analysisButton.click();
    await aiAnalysisPromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Run AI Analysis API trigger successful');

    // 5. Test "Run Product Match"
    const productMatchButton = page.getByRole('button', { name: 'Run Product Match', exact: true }).first();
    await expect(productMatchButton).toBeVisible();
    const productMatchPromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/match-products') && response.status() === 201,
      { timeout: 40000 }
    );
    await productMatchButton.click();
    await productMatchPromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Run Product Match API trigger successful');
  });

  test('should trigger all buttons in the Revenue Tab successfully', async ({ page }) => {
    // Click the Revenue Tab
    const revenueTab = page.getByRole('button', { name: 'Revenue', exact: true });
    await expect(revenueTab).toBeVisible();
    await revenueTab.click();

    // Wait for the loader to clear and the buttons to be rendered
    const icpButton = page.getByRole('button', { name: 'Run ICP Match', exact: true }).first();
    await expect(icpButton).toBeVisible({ timeout: 40000 });
    await page.waitForLoadState('networkidle');

    // 1. Test "Run ICP Match"
    const icpMatchPromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/icp-match') && response.status() === 200,
      { timeout: 40000 }
    );
    await icpButton.click();
    await icpMatchPromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Run ICP Match API trigger successful');

    // 2. Test "Predict Conversion"
    const predictButton = page.getByRole('button', { name: 'Predict Conversion', exact: true });
    await expect(predictButton).toBeVisible();
    const predictPromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/predict-conversion') && response.status() === 200,
      { timeout: 40000 }
    );
    await predictButton.click();
    await predictPromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Predict Conversion API trigger successful');

    // 3. Test "Get Prescription"
    const prescribeButton = page.getByRole('button', { name: 'Get Prescription', exact: true });
    await expect(prescribeButton).toBeVisible();
    const prescribePromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/prescribe') && response.status() === 200,
      { timeout: 40000 }
    );
    await prescribeButton.click();
    await prescribePromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Get Prescription API trigger successful');

    // 4. Test "Run AI Analysis"
    const analysisButton = page.getByRole('button', { name: 'Run AI Analysis', exact: true }).first();
    await expect(analysisButton).toBeVisible();
    const aiAnalysisPromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/revenue-analysis') && response.status() === 201,
      { timeout: 40000 }
    );
    await analysisButton.click();
    await aiAnalysisPromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Run AI Analysis API trigger successful');

    // 5. Test "Record Outcome" modal workflow
    const recordOutcomeButton = page.getByRole('button', { name: 'Record Outcome', exact: true });
    await expect(recordOutcomeButton).toBeVisible();
    await recordOutcomeButton.click();
    
    // Check if the Record Deal Outcome modal appears
    await expect(page.getByText('Record Deal Outcome')).toBeVisible();

    // Select options or fill in notes if necessary
    await page.fill('textarea[placeholder="What happened? What did you learn?"]', 'Closed successfully via Playwright E2E automation test.');

    const outcomePromise = page.waitForResponse(
      response => response.url().includes('/api/leads/15/outcome') && response.status() === 201,
      { timeout: 40000 }
    );
    await page.getByRole('button', { name: 'Save Outcome', exact: true }).click();
    await outcomePromise;
    await page.waitForLoadState('networkidle');
    console.log('✓ Record Outcome API trigger and modal save successful');

    // Verify modal is closed
    await expect(page.getByText('Record Deal Outcome')).not.toBeVisible();
  });
});
