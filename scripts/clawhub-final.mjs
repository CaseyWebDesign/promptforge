import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ['--no-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  try {
    // Step 1: Go to ClawHub
    console.log('Loading ClawHub...');
    await page.goto('https://clawhub.ai', { waitUntil: 'networkidle2', timeout: 20000 });

    // Step 2: Click "Sign in with GitHub"
    console.log('Clicking Sign in with GitHub...');
    const signInBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Sign in'));
    });

    if (signInBtn) {
      await signInBtn.asElement().click();
      console.log('Clicked! Waiting for navigation...');
      await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
    }

    console.log('URL after sign-in click:', page.url());
    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-signin.png' });

    // Step 3: Handle GitHub login if needed
    if (page.url().includes('github.com/login') && !page.url().includes('/oauth')) {
      console.log('GitHub login required. Please log into GitHub in the browser window...');
      console.log('Waiting up to 3 minutes...');
      await page.waitForNavigation({ timeout: 180000 });
      console.log('Navigation detected:', page.url());
    }

    // Step 4: Handle GitHub OAuth authorize
    if (page.url().includes('github.com/login/oauth')) {
      console.log('OAuth authorize page. Looking for authorize button...');
      await new Promise(r => setTimeout(r, 2000));

      const authorized = await page.evaluate(() => {
        const btn = document.querySelector('button[name="authorize"]') ||
                    document.querySelector('#js-oauth-authorize-btn') ||
                    Array.from(document.querySelectorAll('button')).find(b =>
                      b.textContent.toLowerCase().includes('authorize'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });

      if (authorized) {
        console.log('Clicked authorize!');
        await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
      }
    }

    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-after-auth.png' });

    // Step 5: Check if we're now logged into ClawHub
    await new Promise(r => setTimeout(r, 3000));

    if (page.url().includes('clawhub.ai')) {
      console.log('Back on ClawHub! Checking login state...');

      // Look for publish/submit button or user menu
      const loggedInState = await page.evaluate(() => {
        const body = document.body.textContent;
        return {
          hasPublish: body.includes('Publish') || body.includes('publish'),
          hasProfile: body.includes('Profile') || body.includes('profile'),
          hasSubmit: body.includes('Submit') || body.includes('submit'),
          url: window.location.href,
        };
      });
      console.log('Logged-in state:', JSON.stringify(loggedInState));

      // Try to navigate to publish page
      console.log('Navigating to publish page...');
      await page.goto('https://clawhub.ai/publish', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      console.log('Publish URL:', page.url());
      await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-publish.png' });

      // Get all form fields on publish page
      const formFields = await page.evaluate(() => {
        return {
          inputs: Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
            name: i.name || i.id,
            type: i.type,
            placeholder: i.placeholder,
          })),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean),
          pageText: document.body.textContent?.slice(0, 500),
        };
      });
      console.log('Form fields:', JSON.stringify(formFields, null, 2));
    }

    // Wait for user to see
    console.log('Keeping browser open for 60 seconds...');
    await new Promise(r => setTimeout(r, 60000));

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-error.png' }).catch(() => {});
    await new Promise(r => setTimeout(r, 30000));
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
