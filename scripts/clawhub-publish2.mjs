import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  // Launch a separate Chrome instance with a temp profile, but connect to user's GitHub session via cookies
  // First, copy cookies from the running Chrome

  // Actually, simplest approach: launch Chrome with remote debugging on existing instance
  // Or launch with a fresh temp profile and navigate to GitHub login

  console.log('Launching fresh Chrome instance...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  try {
    // Go to ClawHub directly - it will redirect to GitHub OAuth
    console.log('Step 1: Going to ClawHub...');
    await page.goto('https://clawhub.ai', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('ClawHub loaded:', page.url());

    // Screenshot
    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-1.png' });

    // Find login/sign-in link
    const links = await page.$$eval('a', els => els.map(a => ({ text: a.textContent.trim(), href: a.href })));
    console.log('Links found:', JSON.stringify(links.filter(l => l.text.toLowerCase().includes('log') || l.text.toLowerCase().includes('sign') || l.href.includes('auth') || l.href.includes('github')).slice(0, 10)));

    // Click login/sign in
    const loginLink = await page.$('a[href*="login"], a[href*="auth"], a[href*="github"], a:has-text("Log in"), a:has-text("Sign in")');
    if (loginLink) {
      const linkText = await page.evaluate(el => el.textContent, loginLink);
      const linkHref = await page.evaluate(el => el.href, loginLink);
      console.log('Clicking:', linkText.trim(), '->', linkHref);
      await loginLink.click();
      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    }

    console.log('Step 2: After click:', page.url());
    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-2.png' });

    // If on GitHub login page, wait for user to log in
    if (page.url().includes('github.com/login')) {
      console.log('GitHub login required. Waiting for you to log in...');
      console.log('>>> LOG INTO GITHUB IN THE CHROME WINDOW <<<');

      // Wait up to 3 minutes for login
      await page.waitForFunction(
        () => !window.location.href.includes('github.com/login/') || window.location.href.includes('github.com/login/oauth'),
        { timeout: 180000 }
      );
      console.log('Login detected! URL:', page.url());
    }

    // If on GitHub OAuth authorize page
    if (page.url().includes('github.com/login/oauth')) {
      console.log('Step 3: OAuth page. Clicking authorize...');
      await page.waitForSelector('button[name="authorize"], #js-oauth-authorize-btn, button.btn-primary', { timeout: 10000 });

      const authBtn = await page.$('button[name="authorize"]') || await page.$('#js-oauth-authorize-btn');
      if (authBtn) {
        await authBtn.click();
        console.log('Authorized! Waiting for redirect...');
        await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
      }
    }

    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-3.png' });
    console.log('Step 3 URL:', page.url());

    // Look for a token or success page
    const content = await page.content();

    // Try to find a token on the page
    const tokenPatterns = [
      /token['":\s=]+['"]?([a-zA-Z0-9_-]{20,})/i,
      /api[_-]?key['":\s=]+['"]?([a-zA-Z0-9_-]{20,})/i,
      /ch_[a-zA-Z0-9_-]{20,}/,
      /clh_[a-zA-Z0-9_-]{20,}/,
    ];

    for (const pattern of tokenPatterns) {
      const match = content.match(pattern);
      if (match) {
        console.log('TOKEN:', match[0]);
        break;
      }
    }

    // Wait for any redirects
    await new Promise(r => setTimeout(r, 5000));
    console.log('Final URL:', page.url());
    console.log('Page title:', await page.title());

    // Keep browser open for 30 seconds so user can interact
    console.log('Browser will stay open for 30 seconds...');
    await new Promise(r => setTimeout(r, 30000));

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-error.png' }).catch(() => {});
    await new Promise(r => setTimeout(r, 30000));
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
