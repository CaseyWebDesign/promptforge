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
    // Step 1: Try ClawHub direct login/auth URLs
    console.log('Trying ClawHub auth endpoints...');

    for (const url of [
      'https://clawhub.ai/login',
      'https://clawhub.ai/auth',
      'https://clawhub.ai/publish',
      'https://clawhub.ai/submit',
      'https://clawhub.ai/new',
    ]) {
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => null);
      if (resp && resp.status() < 400) {
        console.log(`${url} -> ${page.url()} (${resp.status()})`);
        break;
      }
    }

    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-1.png' });

    // Step 2: Check page for all links containing auth/login/submit/publish/github
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent?.trim().slice(0, 80),
        href: a.href,
      })).filter(l =>
        l.href.includes('github') || l.href.includes('auth') ||
        l.href.includes('login') || l.href.includes('submit') ||
        l.href.includes('publish') || l.href.includes('sign') ||
        (l.text && (l.text.toLowerCase().includes('log in') ||
         l.text.toLowerCase().includes('sign') ||
         l.text.toLowerCase().includes('publish') ||
         l.text.toLowerCase().includes('submit')))
      );
    });
    console.log('Auth-related links:', JSON.stringify(allLinks, null, 2));

    // Step 3: Also check buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, [role="button"]')).map(b => ({
        text: b.textContent?.trim().slice(0, 80),
        type: b.getAttribute('type'),
        onclick: b.getAttribute('onclick'),
      })).filter(b => b.text && b.text.length > 0);
    });
    console.log('Buttons:', JSON.stringify(buttons.slice(0, 10), null, 2));

    // Step 4: Check the ClawHub GitHub repo for submission instructions
    console.log('\nChecking ClawHub GitHub for publish instructions...');
    await page.goto('https://github.com/openclaw/clawhub', { waitUntil: 'networkidle2', timeout: 15000 });
    console.log('GitHub page:', page.url());

    // Read the README
    const readme = await page.evaluate(() => {
      const article = document.querySelector('article');
      return article?.textContent?.slice(0, 2000) || '';
    });
    console.log('README excerpt:', readme.slice(0, 1000));

    await page.screenshot({ path: 'C:\\Users\\casey\\WebDesignBiz\\promptforge\\debug-2.png' });

    // Keep open briefly
    await new Promise(r => setTimeout(r, 5000));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
