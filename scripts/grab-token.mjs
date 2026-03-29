import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function main() {
  const b = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const p = await b.newPage();
  await p.goto('https://clawhub.ai', { waitUntil: 'networkidle2', timeout: 15000 });

  const cookies = await p.cookies();
  const localStorage = await p.evaluate(() => {
    const items = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      items[key] = window.localStorage.getItem(key);
    }
    return items;
  });

  console.log('ALL COOKIES:', JSON.stringify(cookies.map(c => c.name)));
  console.log('LOCAL STORAGE KEYS:', JSON.stringify(Object.keys(localStorage)));

  // Check for auth tokens in cookies
  for (const c of cookies) {
    if (c.name.includes('token') || c.name.includes('auth') || c.name.includes('session') || c.value.length > 50) {
      console.log(`COOKIE: ${c.name} = ${c.value.slice(0, 60)}...`);
    }
  }

  // Check localStorage for tokens
  for (const [k, v] of Object.entries(localStorage)) {
    if (k.includes('token') || k.includes('auth') || k.includes('session') || k.includes('user')) {
      console.log(`STORAGE: ${k} = ${String(v).slice(0, 100)}...`);
    }
  }

  await b.close();
}

main().catch(e => console.error(e.message));
