import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  // Step 1: Start clawhub login, capture the auth URL
  console.log('Starting clawhub login...');

  let authUrl = null;
  const proc = spawn('clawhub', ['login'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  // Capture the auth URL from stdout/stderr
  const urlPromise = new Promise((resolve) => {
    const handler = (data) => {
      const text = data.toString();
      console.log('CLI:', text.trim());
      const match = text.match(/(https:\/\/clawhub\.ai\/cli\/auth[^\s]+)/);
      if (match) resolve(match[1]);
    };
    proc.stdout.on('data', handler);
    proc.stderr.on('data', handler);
    setTimeout(() => resolve(null), 10000);
  });

  authUrl = await urlPromise;

  if (!authUrl) {
    console.error('Failed to get auth URL from CLI');
    proc.kill();
    process.exit(1);
  }

  console.log('Auth URL:', authUrl);

  // Step 2: Open Chrome (not headless — user needs to see it for GitHub login)
  console.log('Opening Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ['--no-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  try {
    // Step 3: Navigate to the auth URL
    console.log('Going to auth URL...');
    await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Page loaded:', page.url());

    // Step 4: If on GitHub login, user needs to log in manually
    if (page.url().includes('github.com/login') && !page.url().includes('/oauth')) {
      console.log('');
      console.log('>>> GITHUB LOGIN NEEDED <<<');
      console.log('>>> Log into GitHub in the Chrome window <<<');
      console.log('>>> Waiting up to 3 minutes... <<<');
      console.log('');

      // Wait until we're past the login page
      await page.waitForFunction(
        () => !window.location.href.includes('github.com/login/') ||
              window.location.href.includes('github.com/login/oauth'),
        { timeout: 180000 }
      );
      console.log('Login detected! Now at:', page.url());
    }

    // Step 5: Handle OAuth authorize
    if (page.url().includes('github.com/login/oauth')) {
      console.log('OAuth page — clicking authorize...');
      await new Promise(r => setTimeout(r, 2000));

      await page.evaluate(() => {
        const btn = document.querySelector('button[name="authorize"]') ||
                    document.querySelector('#js-oauth-authorize-btn') ||
                    Array.from(document.querySelectorAll('button')).find(b =>
                      b.textContent.toLowerCase().includes('authorize'));
        if (btn) btn.click();
      });

      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
      console.log('After authorize:', page.url());
    }

    // Step 6: Wait for redirect back to localhost (the CLI catches this)
    console.log('Waiting for redirect to localhost callback...');
    await page.waitForFunction(
      () => window.location.href.includes('127.0.0.1') ||
            window.location.href.includes('localhost') ||
            document.body.textContent.includes('authorized') ||
            document.body.textContent.includes('success'),
      { timeout: 30000 }
    ).catch(() => {});

    console.log('Final URL:', page.url());
    console.log('DONE — CLI should have received the token');

  } catch (err) {
    console.error('Browser error:', err.message);
  } finally {
    await browser.close();
  }

  // Step 7: Wait for CLI to finish
  console.log('Waiting for CLI to complete...');
  await new Promise((resolve) => {
    proc.on('close', (code) => {
      console.log('CLI exited with code:', code);
      resolve();
    });
    setTimeout(() => {
      proc.kill();
      resolve();
    }, 15000);
  });
}

main().catch(console.error);
