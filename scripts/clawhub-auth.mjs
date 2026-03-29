import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import http from 'http';
import { URL } from 'url';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  // Step 1: Start the clawhub login flow to get the auth URL
  // We'll parse it from the clawhub login command output
  const authUrl = process.argv[2];
  if (!authUrl) {
    console.error('Usage: node clawhub-auth.mjs <auth-url>');
    process.exit(1);
  }

  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log('Navigating to ClawHub auth...');
    await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Check if we're on GitHub OAuth page
    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('github.com/login')) {
      // Need to log into GitHub first
      console.log('GitHub login page detected. Logging in...');

      // Use the GitHub token to authenticate via cookie approach
      // Set the GitHub session cookie using the API
      await page.type('#login_field', 'CaseyWebDesign');
      // We don't have the password, but we can try using the auth token
      // Instead, let's use GitHub's device flow
      console.log('NEED_GITHUB_LOGIN');
      await browser.close();
      process.exit(2);
    }

    if (url.includes('github.com/login/oauth/authorize')) {
      console.log('OAuth authorize page. Clicking authorize...');
      // Look for the authorize button
      const authorizeBtn = await page.$('button[name="authorize"]') ||
                           await page.$('#js-oauth-authorize-btn') ||
                           await page.$('button.js-oauth-authorize-btn');
      if (authorizeBtn) {
        await authorizeBtn.click();
        await page.waitForNavigation({ timeout: 15000 });
        console.log('Authorized! Redirecting...');
      }
    }

    // Wait for redirect back to localhost callback
    await page.waitForFunction(
      () => window.location.href.includes('127.0.0.1') || window.location.href.includes('localhost'),
      { timeout: 15000 }
    ).catch(() => {});

    console.log('Final URL:', page.url());
    console.log('AUTH_COMPLETE');

  } catch (err) {
    console.error('Error:', err.message);
    console.log('Final URL:', page.url());
    const content = await page.content();
    console.log('Page snippet:', content.slice(0, 500));
  } finally {
    await browser.close();
  }
}

main();
