import puppeteer from 'puppeteer-core';
import { execSync, spawn } from 'child_process';
import { readFileSync } from 'fs';
import http from 'http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  // Step 1: Kill any existing Chrome instances (needed to use profile)
  try { execSync('taskkill /F /IM chrome.exe 2>nul', { stdio: 'ignore' }); } catch {}
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Launch Chrome with the user's actual profile (has GitHub cookies)
  console.log('Launching Chrome with your profile...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // Visible so user can see what's happening
    userDataDir: 'C:\\Users\\casey\\AppData\\Local\\Google\\Chrome\\User Data',
    args: [
      '--no-sandbox',
      '--profile-directory=Default',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    // Step 3: Check if we're logged into GitHub
    console.log('Checking GitHub session...');
    await page.goto('https://github.com', { waitUntil: 'networkidle2', timeout: 15000 });
    const url = page.url();
    console.log('GitHub URL:', url);

    // Check if logged in by looking for avatar/profile menu
    const loggedIn = await page.$('.AppHeader-user, [data-login], .Header-link--profile, img.avatar').catch(() => null);
    console.log('GitHub logged in:', !!loggedIn);

    if (!loggedIn) {
      console.log('Not logged into GitHub. Please log in manually in the browser window...');
      // Wait for user to log in
      await page.waitForSelector('.AppHeader-user, [data-login], img.avatar', { timeout: 120000 });
      console.log('GitHub login detected!');
    }

    // Step 4: Start ClawHub login in background - capture the auth URL
    console.log('Starting ClawHub login flow...');

    // Create a promise that resolves when we get the callback
    let callbackResolve;
    const callbackPromise = new Promise(resolve => { callbackResolve = resolve; });

    // Start a local server to catch the callback
    const server = http.createServer((req, res) => {
      console.log('Callback received:', req.url);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorized! You can close this tab.</h1>');
      callbackResolve(req.url);
    });

    // Find the port clawhub uses
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log('Callback server on port:', port);
    });

    // Navigate to ClawHub auth page directly
    console.log('Navigating to ClawHub auth...');
    await page.goto('https://clawhub.ai/cli/auth', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('ClawHub page:', page.url());

    // Look for GitHub OAuth button
    const currentUrl = page.url();

    if (currentUrl.includes('github.com/login/oauth')) {
      console.log('On GitHub OAuth page...');
      // Look for authorize button
      await page.waitForSelector('button[name="authorize"], #js-oauth-authorize-btn, button.btn-primary', { timeout: 10000 });
      const authBtn = await page.$('button[name="authorize"]') ||
                      await page.$('#js-oauth-authorize-btn');
      if (authBtn) {
        console.log('Clicking Authorize...');
        await authBtn.click();
        await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        console.log('After authorize:', page.url());
      }
    } else if (currentUrl.includes('clawhub.ai')) {
      // Look for login/GitHub button on ClawHub page
      const githubBtn = await page.$('a[href*="github"], button:has-text("GitHub"), [data-provider="github"], a:has-text("GitHub"), a:has-text("Log in"), a:has-text("Sign in")');
      if (githubBtn) {
        console.log('Found auth button, clicking...');
        await githubBtn.click();
        await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        console.log('After click:', page.url());

        // May be on OAuth authorize page now
        if (page.url().includes('github.com/login/oauth')) {
          const authBtn2 = await page.$('button[name="authorize"]') ||
                           await page.$('#js-oauth-authorize-btn');
          if (authBtn2) {
            await authBtn2.click();
            await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
          }
        }
      }
    }

    // Screenshot for debugging
    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-screenshot.png' });
    console.log('Screenshot saved to debug-screenshot.png');
    console.log('Final page URL:', page.url());
    console.log('Final page title:', await page.title());

    // Check if we got a token on the page
    const pageContent = await page.content();
    const tokenMatch = pageContent.match(/token['":\s]+([a-zA-Z0-9_-]{20,})/i);
    if (tokenMatch) {
      console.log('TOKEN_FOUND:', tokenMatch[1]);
    }

    // Wait a moment and check page state
    await new Promise(r => setTimeout(r, 5000));
    console.log('Page URL after wait:', page.url());

    server.close();

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-error.png' }).catch(() => {});
  } finally {
    // Don't close browser - leave it open so user can see
    await browser.close();
  }
}

main().catch(console.error);
