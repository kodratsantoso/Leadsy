const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  console.log('Navigating to page...');
  // We don't have a valid session, but the error happens on click. 
  // Wait, if it redirects to /login, we can't see the error.
  await page.goto('http://localhost:3000/leads/942');
  
  await page.waitForTimeout(3000);
  
  await browser.close();
})();
