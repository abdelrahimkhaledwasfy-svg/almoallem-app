// اختبارات تلقائية لأبليكيشن المعلم (عملاء + مناديب) — بتتشغل قبل أي تحديث:  node tests/run.js
// مبتلمسش أي بيانات حقيقية: Firebase متبدل بنسخة وهمية بتسجل بس الأبليكيشن طلب إيه.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'index.html');
const results = [];
async function test(name, fn) { try { await fn(); results.push([true, name]); } catch (e) { results.push([false, name, e.message]); } }
function assert(c, msg) { if (!c) throw new Error(msg || 'assert'); }

(async () => {
  const browser = await chromium.launch();
  async function open(mode) {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage(); p.__errs = []; p.__loads = 0;
    p.on('pageerror', e => p.__errs.push(e.message));
    await p.route('**/*', r => { const u = r.request().url(); if (u.startsWith('https://x.test/')) { p.__loads++; return r.fulfill({ body: fs.readFileSync(FILE, 'utf8'), contentType: 'text/html' }); } return r.abort(); });
    await p.addInitScript((mode) => {
      if (mode !== 'customer') { localStorage.setItem('app_rep_mode', '1'); localStorage.setItem('app_current_rep', JSON.stringify({ code: 'R1', name: 'مندوب', type: mode })); }
      window.__subs = [];
      const q = (name) => { const o = { where: () => o, orderBy: () => o, limit: () => o, doc: () => o, collection: (n) => q(n),
        onSnapshot() { window.__subs.push(name); return () => {}; }, get: () => new Promise(() => {}), set: () => Promise.resolve(), update: () => Promise.resolve() }; return o; };
      const fsdb = { collection: q, batch: () => ({ set() {}, commit: () => Promise.resolve() }), runTransaction: () => new Promise(() => {}) };
      const f = () => fsdb; f.FieldValue = { serverTimestamp: () => 0, increment: () => 0, arrayUnion: () => 0 };
      window.firebase = { initializeApp() {}, firestore: f, auth: () => ({ onAuthStateChanged(cb) { cb(null); return () => {}; }, currentUser: null, signOut: () => Promise.resolve() }), messaging: () => ({}) };
      window.OneSignalDeferred = [];
    }, mode);
    await p.goto('https://x.test/app/index.html'); await p.waitForTimeout(4000);
    return p;
  }
  const subs = p => p.evaluate(() => [...new Set(window.__subs)]);

  const c = await open('customer');
  await test('أبليكيشن العميل بيفتح من غير أخطاء', async () => { assert(!c.__errs.length, c.__errs.join(' | ')); });

  const s = await open('sales');
  await test('مندوب البيع: لما يفتح وهو داخل أصلاً، الزيارات والطلبيات والتارجت بيتحملوا (من غير خروج ودخول)', async () => {
    const l = await subs(s); ['customerVisitRecords', 'customerOrders', 'meta', 'customerRecords'].forEach(n => assert(l.includes(n), 'ناقص: ' + n + ' — اللي اتحمل: ' + l));
  });
  await test('مندوب البيع: بيفتح من غير أخطاء', async () => { assert(!s.__errs.length, s.__errs.join(' | ')); });
  await test('مفيش زرار تحديث (التحديث بالسحب)', async () => { assert(await s.locator('[onclick="repManualRefresh()"]').count() === 0); });
  const cdp = await s.context().newCDPSession(s);
  async function drag(dist) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 200 }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 200 + dist * i / 10 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await s.waitForTimeout(1500);
  }
  await test('سحبة صغيرة لتحت مبتعملش تحديث', async () => { const b = s.__loads; await drag(40); assert(s.__loads === b, 'اتحدث'); });
  await test('سحبة طويلة وفيه طلبية شغالة مبتعملش تحديث', async () => { const b = s.__loads; await s.evaluate(() => { repTargetCustomer = { code: 'C1' }; }); await drag(160); await s.evaluate(() => { repTargetCustomer = null; }); assert(s.__loads === b, 'اتحدث والطلبية شغالة'); });
  await test('سحبة طويلة لتحت بتعمل تحديث', async () => { const b = s.__loads; await drag(160); await s.waitForTimeout(1500); assert(s.__loads > b, 'ما اتحدثش'); });

  const d = await open('delivery');
  await test('مندوب التسليم: لما يفتح وهو داخل أصلاً، الطلبيات والتحصيل بيتحملوا', async () => {
    const l = await subs(d); ['customerOrders', 'deliveryCollectionRecords', 'meta'].forEach(n => assert(l.includes(n), 'ناقص: ' + n + ' — اللي اتحمل: ' + l));
  });
  await test('مندوب التسليم: بيفتح من غير أخطاء', async () => { assert(!d.__errs.length, d.__errs.join(' | ')); });
  await browser.close();

  let bad = 0; results.forEach(([ok, n, e]) => { if (!ok) bad++; console.log((ok ? '✓ ' : '✗ ') + n + (ok ? '' : '  ←  ' + e)); });
  console.log(bad ? `\n${bad} اختبار فشل — ما ترفعش التحديث` : `\nكل الاختبارات نجحت (${results.length})`);
  process.exit(bad ? 1 : 0);
})();
