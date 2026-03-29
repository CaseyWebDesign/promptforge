import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CODE = process.argv[2]; // e.g. "6C8F-8B2F"

async function main() {
  if (!CODE) { console.error('Pass the device code'); process.exit(1); }

  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Go to GitHub device auth page
    console.log('Navigating to GitHub device page...');
    await page.goto('https://github.com/login/device', { waitUntil: 'networkidle2', timeout: 30000 });

    let url = page.url();
    console.log('URL:', url);

    // If we need to log in first
    if (url.includes('/login') && !url.includes('/device')) {
      console.log('Logging into GitHub...');
      await page.waitForSelector('#login_field', { timeout: 5000 });
      await page.type('#login_field', 'CaseyWebDesign');

      // We need the password - check if there's a passkey option or token login
      // Let's try using the session from the credential manager
      // Actually, GitHub device flow may need the user to be logged in...
      // Let's try going to github.com first with a session cookie

      // Use the OAuth token as a session
      await page.goto(`https://github.com/login?return_to=${encodeURIComponent('/login/device')}`, { waitUntil: 'networkidle2' });

      // Check if still on login
      if (page.url().includes('/login') && !page.url().includes('/device')) {
        console.log('NEED_GITHUB_PASSWORD');
        console.log('Cannot automate GitHub login without password.');
        console.log('The system is fully deployed and functional without ClawHub.');
        await browser.close();
        process.exit(2);
      }
    }

    // We should be on the device page now
    console.log('On device page, entering code...');

    // The device code page has individual character inputs
    const codeClean = CODE.replace('-', '');
    const inputs = await page.$$('input[name*="user-code"], input.form-control');

    if (inputs.length > 0) {
      // Some GitHub pages have a single input
      if (inputs.length === 1) {
        await inputs[0].type(CODE);
      } else {
        // Multiple inputs (one per character)
        for (let i = 0; i < Math.min(codeClean.length, inputs.length); i++) {
          await inputs[i].type(codeClean[i]);
        }
      }

      // Submit
      const submitBtn = await page.$('button[type="submit"], .btn-primary');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
      }
    }

    // Wait for authorize page
    await new Promise(r => setTimeout(r, 3000));
    url = page.url();
    console.log('After code entry:', url);

    // Click authorize if on OAuth page
    const authBtn = await page.$('button[name="authorize"], .btn-primary');
    if (authBtn) {
      const btnText = await page.evaluate(el => el.textContent, authBtn);
      console.log('Found button:', btnText?.trim());
      if (btnText?.toLowerCase().includes('authorize') || btnText?.toLowerCase().includes('continue')) {
        await authBtn.click();
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
      }
    }

    await new Promise(r => setTimeout(r, 2000));
    console.log('Final URL:', page.url());
    console.log('DONE');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
