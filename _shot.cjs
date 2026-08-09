const puppeteer = require('puppeteer-core');
const fs = require('fs');
const AT = fs.readFileSync('C:/zaminex/_tok.at','utf8').trim();
const RT = fs.readFileSync('C:/zaminex/_tok.rt','utf8').trim();
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:5174";

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((at, rt) => {
    localStorage.setItem('zeminex.at', at);
    localStorage.setItem('zeminex.rt', rt);
    localStorage.setItem('zeminex.theme', 'dark');
  }, AT, RT);

  const shoot = async (w, h, name) => {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await page.goto(BASE + '/app/team', { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1800));
    await page.screenshot({ path: 'C:/zaminex/_shots/' + name, fullPage: true });
    console.log('saved', name, w + 'x' + h);
  };
  await shoot(390, 844, 'team-mobile.png');
  await shoot(820, 900, 'team-tablet.png');
  await shoot(1280, 900, 'team-desktop.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
