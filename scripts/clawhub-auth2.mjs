import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
// Use Chrome's user data dir to get existing GitHub sessions
const USER_DATA = process.env.LOCALAPPDATA + '\\Google\\Chrome\\User Data';

async function main() {
  const authUrl = process.argv[2];
  if (!authUrl) {
    console.error('Usage: node clawhub-auth2.mjs <auth-url>');
    process.exit(1);
  }

  console.log('Launching Chrome with existing profile (has GitHub session)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // Need visible browser for OAuth
    userDataDir: USER_DATA + '_puppeteer', // Copy to avoid lock conflicts
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log('Step 1: Navigate to ClawHub auth...');
    await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded:', page.url());

    // Take screenshot for debugging
    const content = await page.content();

    // Look for GitHub login button on ClawHub page
    const githubBtn = await page.$('a[href*="github"]') ||
                      await page.$('button:has-text("GitHub")') ||
                      await page.$('[data-provider="github"]');

    if (githubBtn) {
      console.log('Step 2: Found GitHub button, clicking...');
      await githubBtn.click();
      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
      console.log('After click:', page.url());
    }

    // If we're on GitHub, check if we need to log in or just authorize
    let currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // If on GitHub login page
    if (currentUrl.includes('github.com/login') && !currentUrl.includes('oauth')) {
      console.log('Step 3: GitHub login page...');
      await page.waitForSelector('#login_field', { timeout: 5000 });
      await page.type('#login_field', 'CaseyWebDesign');
      // Try clicking "Sign in with a passkey" or token-based auth
      // Or check if there's a token/SSO option
      console.log('NEED_PASSWORD');
    }

    // If on GitHub OAuth authorize page
    if (currentUrl.includes('github.com/login/oauth')) {
      console.log('Step 3: OAuth page, looking for authorize button...');
      await page.waitForSelector('button[name="authorize"], #js-oauth-authorize-btn, button.btn-primary', { timeout: 5000 });
      const authBtn = await page.$('button[name="authorize"]') ||
                      await page.$('#js-oauth-authorize-btn') ||
                      await page.$('form[action*="authorize"] button.btn-primary');
      if (authBtn) {
        console.log('Clicking authorize...');
        await authBtn.click();
        await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
      }
    }

    // Wait and log final state
    await new Promise(r => setTimeout(r, 5000));
    console.log('Final URL:', page.url());

    // Check for success indicators
    const finalContent = await page.content();
    if (finalContent.includes('success') || finalContent.includes('authorized') || finalContent.includes('token')) {
      console.log('AUTH_SUCCESS');
    } else {
      console.log('Page title:', await page.title());
      console.log('Content preview:', finalContent.slice(0, 800));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
