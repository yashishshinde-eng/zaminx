const puppeteer = require('puppeteer-core');
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:5173";
const API = "http://localhost:5000/api/v1";

async function jtok(res) {
  const j = await res.json();
  return j.data.tokens.accessToken;
}

(async () => {
  // 1. Login as admin.
  const adminAt = await jtok(await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@zeminex.local", password: "ChangeMe!2024" }),
  }));
  console.log("admin AT len", adminAt.length);

  // 2. Find a regular (non-admin) user to impersonate.
  const usersRes = await fetch(`${API}/admin/users?limit=20`, {
    headers: { Authorization: `Bearer ${adminAt}` },
  });
  const usersJson = await usersRes.json();
  const users = usersJson.data.users.items || usersJson.data.users.rows || usersJson.data.users;
  const target = (users).find((u) => u.role !== "admin");
  if (!target) { console.error("no non-admin user found"); process.exit(1); }
  console.log("impersonating", target.email, target.id);

  // 3. Impersonate → target tokens.
  const impRes = await fetch(`${API}/admin/users/${target.id}/impersonate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminAt}` },
  });
  const impJson = await impRes.json();
  const AT = impJson.data.tokens.accessToken;
  const RT = impJson.data.tokens.refreshToken;
  console.log("target AT len", AT.length);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log("PAGE ERR:", m.text().slice(0, 200)); });

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.evaluate((at, rt) => {
    localStorage.setItem("zeminex.at", at);
    localStorage.setItem("zeminex.rt", rt);
    localStorage.setItem("zeminex.theme", "dark");
  }, AT, RT);

  const shoot = async (w, h, name) => {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await page.goto(BASE + "/app/trade", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 6500));
    await page.screenshot({ path: "C:/zaminex/_shots/" + name, fullPage: true });
    console.log("saved", name, w + "x" + h, "url=", page.url());
  };

  await shoot(390, 844, "trade-mobile.png");
  await shoot(820, 1180, "trade-tablet.png");
  await shoot(1280, 900, "trade-desktop.png");
  await shoot(1536, 900, "trade-wide.png");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });