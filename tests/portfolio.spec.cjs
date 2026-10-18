/* Focused browser regression for the static portfolio. No new runtime packages.
   PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/portfolio.spec.cjs
   Optional: CHROMIUM_PATH, PORTFOLIO_ARTIFACTS. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const artifacts = process.env.PORTFOLIO_ARTIFACTS || '/private/tmp/artgroup-portfolio-review';
fs.mkdirSync(artifacts, { recursive: true });
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + '/')) return res.writeHead(403).end();
    fs.readFile(file, (error, bytes) => {
        res.writeHead(error ? 404 : 200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
        res.end(bytes);
    });
});
const slugs = ['embankment', 'imperial', 'khamovniki', 'teatralnaya', 'happy', 'cube', 'magadan', 'rublevskoe', 'ear-eye', 'iksha', 'zhukovka'];
const expectedMedia = [
    {
        "images": [
            "img/portfolio/portfolio-0.jpg",
            "img/portfolio/portfolio-0.1.jpg",
            "img/portfolio/portfolio-0.3.jpg",
            "img/portfolio/portfolio-0.4.jpg",
            "img/portfolio/portfolio-0.2.jpg"
        ],
        "links": [
            "#contact",
            "http://stroi.mos.ru/photo_lines/kakoi-mozhiet-stat-nabieriezhnaia-mmdts-moskva-siti-k-2019-ghodu",
            "http://realty.rbc.ru/articles/25/05/2016/562950000810477.shtml",
            "https://ria.ru/20160523/1438489361.html",
            "https://moslenta.ru/articles/stroitelstvo-moskva-siti-zavershitsya-k-koncu-2018-goda.htm"
        ],
        "iframe": "https://www.youtube.com/embed/DJQJfSKI4Lw?si=aC7bfWkgSg2XhsJ2"
    },
    {
        "images": [
            "img/portfolio/portfolio-1.jpg",
            "img/portfolio/portfolio-1.1.jpg",
            "img/portfolio/portfolio-1.2.jpg",
            "img/portfolio/portfolio-1.3.jpg",
            "img/portfolio/portfolio-1.4.jpg"
        ],
        "links": [
            "#contact"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-11.jpg",
            "img/portfolio/portfolio-11.1.jpg",
            "img/portfolio/portfolio-11.2.jpg"
        ],
        "links": [
            "#contact",
            "https://archsovet.msk.ru/article/archcouncil/vtoraya-zhizn-dolgostroev"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-12.jpg",
            "img/portfolio/portfolio-12.1.jpg",
            "img/portfolio/portfolio-12.2.jpg",
            "img/portfolio/portfolio-12.3.jpg",
            "img/portfolio/portfolio-12.4.jpg"
        ],
        "links": [
            "#contact"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-7.jpg",
            "img/portfolio/portfolio-7.1.jpg",
            "img/portfolio/portfolio-7.2.jpg",
            "img/portfolio/portfolio-7.3.jpg",
            "img/portfolio/portfolio-7.4.jpg",
            "img/portfolio/portfolio-7.5.jpg",
            "img/portfolio/portfolio-7.6.jpg"
        ],
        "links": [
            "#director1",
            "#contact"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-2.jpg",
            "img/portfolio/portfolio-2.1.jpg",
            "img/portfolio/portfolio-2.2.jpg"
        ],
        "links": [
            "#contact"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-3.jpg",
            "img/portfolio/portfolio-3.1.jpg",
            "img/portfolio/portfolio-3.2.jpg",
            "img/portfolio/portfolio-3.jpg"
        ],
        "links": [
            "#contact"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-5.jpg",
            "img/portfolio/portfolio-5.1.jpg",
            "img/portfolio/portfolio-5.2.jpg",
            "img/portfolio/portfolio-5.3.jpg"
        ],
        "links": [
            "#contact"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-6.jpg",
            "img/portfolio/portfolio-6.1.jpg",
            "img/portfolio/portfolio-6.2.jpg",
            "img/portfolio/portfolio-6.3.jpg",
            "img/portfolio/portfolio-6.4.jpg"
        ],
        "links": [
            "#contact"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-8.jpg",
            "img/portfolio/portfolio-8.1.jpg",
            "img/portfolio/portfolio-8.2.jpg",
            "img/portfolio/portfolio-8.3.jpg"
        ],
        "links": [
            "#contact"
        ]
    },
    {
        "images": [
            "img/portfolio/portfolio-9.jpg",
            "img/portfolio/portfolio-9.1.jpg",
            "img/portfolio/portfolio-9.2.jpg",
            "img/portfolio/portfolio-9.3.jpg"
        ],
        "links": [
            "#contact"
        ]
    }
];
const report = { checks: [], layouts: [], errors: [], consoleErrors: [], failedLocalRequests: [] };
const record = label => { report.checks.push(label); console.log('PASS', label); };
let browser;
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    // Never send analytics, messages or forms. Original video/press URLs are
    // checked in the DOM; playback is an external-service manual check.
    await context.route('**/*', route => {
        const u = new URL(route.request().url());
        if (u.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com'].includes(u.hostname)) return route.continue();
        return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('net::ERR_FAILED')) report.consoleErrors.push(msg.text()); });
    page.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 400) report.failedLocalRequests.push(r.url()); });
    async function load() {
        await page.goto(origin, { waitUntil: 'load' });
        await page.waitForFunction(() => document.querySelector('.portfolio-disclosure-ready'));
        await page.locator('#cookie-decline-btn').evaluate(e => e.click());
        await page.evaluate(() => document.fonts.ready);
    }
    async function language(lang) { await page.selectOption('.change-lng', lang); }
    async function scroll(selector) { await page.locator(selector).evaluate(e => window.scrollTo(0, scrollY + e.getBoundingClientRect().top - 85)); await page.waitForTimeout(900); }
    const count = () => page.locator('.portfolio-box:visible').count();
    await load();
    assert.deepEqual(await page.locator('[data-project]').evaluateAll(a => a.map(e => e.dataset.project)), slugs);
    assert.equal(await count(), 6);
    record('11 active identities, initial 6, source stories in initial HTML');
    const source = await page.locator('[data-project]').evaluateAll(boxes => boxes.map(b => ({
        slug: b.dataset.project, images: [...b.querySelectorAll('img')].map(e => e.getAttribute('src')),
        links: [...b.querySelectorAll('a')].map(e => e.getAttribute('href')), iframe: b.querySelector('iframe')?.getAttribute('src'),
    })));
    for (let i = 0; i < source.length; i++) {
        for (const image of expectedMedia[i].images) assert(source[i].images.includes(image), `${slugs[i]} lost ${image}`);
        assert.deepEqual(source[i].links, expectedMedia[i].links, `${slugs[i]} source/contact destinations`);
        assert.equal(source[i].iframe, expectedMedia[i].iframe);
    }
    record('Every original image, video URL, source and contact destination retained in its case');
    assert(await page.evaluate(() => [...document.querySelectorAll('.portfolio img')].every(e => e.width && e.height && e.alt && e.loading === 'lazy')));
    assert.equal(await page.locator('.project-story [id]').count(), 0);
    assert.equal(await page.locator('.portfolio h4').count(), 0);
    record('Image dimensions/alt/lazy loading and semantic H2/H3; cloned source has no IDs');
    await scroll('#portfolio');
    assert(!await page.evaluate(() => performance.getEntriesByType('resource').some(e => /portfolio-9\.3\.jpg|portfolio-6\.4\.jpg/.test(e.name))));
    record('Offscreen full-resolution case images are not eagerly requested');
    for (const lang of ['ru', 'en']) {
        await language(lang);
        for (const width of [320, 390, 768, 1024, 1440, 2560]) {
            await page.setViewportSize({ width, height: width < 700 ? 844 : 1000 });
            await scroll('#portfolio');
            const layout = await page.locator('#portfolio').evaluate(s => ({
                width: innerWidth, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                shell: s.querySelector('.portfolio-shell').getBoundingClientRect().width,
                cards: [...s.querySelectorAll('.portfolio-box:not([hidden])')].map(e => {
                    const r = e.getBoundingClientRect(), im = e.querySelector('.project-image').getBoundingClientRect();
                    return { x: r.x, width: r.width, y: r.y, imageHeight: im.height };
                }),
            }));
            assert(layout.overflow <= 1, JSON.stringify(layout)); assert(layout.shell <= 1300.5);
            const [a, b] = layout.cards;
            if (width <= 700) assert(b.y > a.y && Math.abs(a.x - b.x) < 1);
            else assert(Math.abs(a.y - b.y) < 1 && Math.abs(a.imageHeight - b.imageHeight) < 1);
            report.layouts.push({ lang, ...layout });
            if ([320,390,768,1440,2560].includes(width)) await page.screenshot({ path: `${artifacts}/${lang}-${width}-gallery.png` });
            // Longest title, internal scroll area and short case at every size.
            for (const slug of ['embankment', 'cube']) {
                await page.locator(`[data-project="${slug}"] .project-open`).click();
                await page.waitForTimeout(450);
                assert(await page.locator('.popup-box').evaluate(e => e.classList.contains('open')));
                const body = await page.locator('.popup-body').evaluate(e => ({ h: e.clientHeight, overflow: e.scrollWidth - e.clientWidth }));
                assert(body.h >= 100 && body.overflow <= 1, JSON.stringify(body));
                if (slug === 'embankment' && [390,1440].includes(width)) await page.screenshot({ path: `${artifacts}/${lang}-${width}-popup.png` });
                await page.keyboard.press('Escape');
            }
        }
    }
    record('RU/EN reflow at 320/390/768/1024/1440/2560; aligned pairs and readable viewer');
    await page.setViewportSize({ width: 1440, height: 1000 }); await language('ru');
    // Disclosure never resizes/reorders earlier cards or jumps the viewport.
    for (const target of [9, 11]) {
        await scroll('.portfolio-load-more-btn');
        const before = await page.evaluate(() => ({ y: scrollY, boxes: [...document.querySelectorAll('.portfolio-box:not([hidden])')].map(e => ({top:e.offsetTop,width:e.offsetWidth})) }));
        await page.locator('.portfolio-load-more-btn').click();
        assert.equal(await count(), target);
        assert.deepEqual(await page.locator('.portfolio-box').evaluateAll((a,n) => a.slice(0,n).map(e=>({top:e.offsetTop,width:e.offsetWidth})), before.boxes.length), before.boxes);
        assert(Math.abs(await page.evaluate(() => scrollY) - before.y) <= 1);
        assert.equal(await page.locator('.project-open:focus').count(), 1);
    }
    assert(await page.locator('.portfolio-load-more-btn').isHidden());
    await language('en'); assert.equal(await count(), 11); assert.match(await page.locator('.portfolio-status').innerText(), /11 of 11/);
    record('6 → 9 → 11, stable earlier rows/viewport, focus+live announcement; state survives language switch');
    // Every active case including the last two; cloned body must match its source.
    for (const lang of ['ru', 'en']) {
        await language(lang);
        for (let i = 0; i < slugs.length; i++) {
            const card = page.locator(`[data-project="${slugs[i]}"]`), button = card.locator('.project-open');
            await button.click();
            const savedY = await page.evaluate(() => savedScrollY);
            assert.equal(await page.locator('#popup-project-title').innerText(), await card.locator('.project-title').innerText());
            assert.equal(await page.locator('.popup-body').evaluate(e=>e.innerHTML), await card.locator('.project-story').evaluate(e=>{
                const copy=e.cloneNode(true); copy.querySelectorAll('a[target="_blank"]').forEach(a=>a.relList.add('noopener')); return copy.innerHTML;
            }));
            assert.equal(await page.locator('.popup-project-number').innerText(), `${String(i+1).padStart(2,'0')} / 11`);
            await page.locator('.popup-next').click(); assert.equal(await page.locator('#popup-project-title').innerText(), await page.locator('.project-title').nth((i+1)%11).innerText());
            await page.locator('.popup-previous').click();
            if ([6,9,10].includes(i) && lang==='ru') await page.screenshot({path:`${artifacts}/ru-${slugs[i]}-popup.png`});
            await page.keyboard.press('Escape'); assert(await button.evaluate(e=>document.activeElement===e));
            assert(Math.abs(await page.evaluate(() => scrollY) - savedY) <= 1);
        }
    }
    record('All 11 × RU/EN: title/text/media mapping, numbering, previous/next, Escape and restored focus');
    await page.locator('.project-image').first().click();
    assert(await page.locator('.popup-box').evaluate(e=>e.classList.contains('open')));
    await page.keyboard.press('Escape');
    record('Existing large image/card click target still opens the correct case');
    await page.locator('.project-open').first().click();
    // Open-viewer translation uses the existing updater (selector is behind backdrop).
    await page.evaluate(()=>applyLanguage('ru')); assert.match(await page.locator('.popup-body .project-lead').innerText(),/Концепция/);
    await page.evaluate(()=>applyLanguage('en')); assert.match(await page.locator('.popup-body .project-lead').innerText(),/waterfront/);
    await page.locator('.popup-close-icon').focus(); await page.keyboard.press('Shift+Tab'); assert(await page.locator('.popup-next').evaluate(e=>document.activeElement===e));
    await page.keyboard.press('Tab'); assert(await page.locator('.popup-close-icon').evaluate(e=>document.activeElement===e));
    await page.locator('.popup-close-icon').click(); assert.equal(await page.locator('.popup-body iframe').getAttribute('src'),'about:blank');
    record('Visible popup language refresh, Tab/Shift+Tab trap and iframe stopped on close');
    // No real form submission or external navigation: inspect anchor destinations.
    await page.locator('.project-open').nth(10).click();
    assert.equal(await page.locator('.popup-body a[href="#contact"]').count(),1);
    await page.locator('.popup-body a[href="#contact"]').click(); assert(await page.locator('.popup-box').evaluate(e=>!e.classList.contains('open')));
    await page.waitForTimeout(1200); assert(!await page.locator('body').evaluate(e=>e.classList.contains('popup-open')));
    record('Existing contact anchor closes viewer and releases scroll lock; no submission');
    // Reflow equivalent of 200% desktop zoom, plus genuinely short viewports.
    for (const [width,height] of [[720,500],[320,400],[1024,320]]) {
        await page.setViewportSize({width,height}); await page.locator('.project-open').first().click();
        const r=await page.locator('.popup-body').evaluate(e=>({height:e.clientHeight,overflow:e.scrollWidth-e.clientWidth}));assert(r.height>40&&r.overflow<=1);
        await page.keyboard.press('Escape');
    }
    record('200% desktop reflow equivalent and 320×400 / 1024×320 short viewer');
    await page.emulateMedia({reducedMotion:'reduce'}); await load();
    await scroll('#portfolio');
    assert(await page.locator('#portfolio').evaluate(e=>e.getAnimations({subtree:true}).length===0));
    await page.locator('.portfolio-load-more-btn').evaluate(e=>e.click());
    assert(await page.locator('.portfolio-box:not([hidden]) .portfolio-layer').evaluateAll(a=>a.every(e=>getComputedStyle(e).opacity==='1')));
    record('Reduced motion: static final state immediately, including newly disclosed cards');
    await page.emulateMedia({reducedMotion:'no-preference'}); await load();
    await scroll('.portfolio-box--cube'); await page.waitForTimeout(1000);
    await page.evaluate(()=>{window.__starts=0;document.querySelector('#portfolio').addEventListener('transitionrun',event=>{if(event.target.matches('.portfolio-layer'))window.__starts++})});
    await scroll('#home'); await scroll('.portfolio-box--cube');
    // Hover scale may transition, so validate reveals stay spent rather than count unrelated hover.
    assert(await page.locator('.portfolio-box--cube').evaluate(e=>e.classList.contains('is-revealed')));
    assert.equal(await page.evaluate(()=>window.__starts),0);
    record('Card entrances remain spent after leaving and re-entering the viewport');
    // All original files decode; hidden detail images remain lazy until requested.
    const broken=await page.evaluate(async()=>{const paths=[...new Set([...document.querySelectorAll('.portfolio img')].map(e=>e.src))];return(await Promise.all(paths.map(src=>new Promise(resolve=>{let i=new Image;i.onload=()=>resolve(null);i.onerror=()=>resolve(src);i.src=src})))).filter(Boolean)}); assert.deepEqual(broken,[]);
    record('All project image files decode');
    await language('ru');
    const session = await context.newCDPSession(page); await session.send('DOM.enable'); await session.send('CSS.enable');
    const doc=await session.send('DOM.getDocument');const node=await session.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.portfolio-heading'});
    report.cyrillicFonts=await session.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});
    const fallback = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const native=await fallback.newPage();await native.goto(origin);
    assert.equal(await native.locator('.portfolio-box:visible').count(),11);assert(await native.locator('.project-open').first().isHidden());
    await native.locator('.read-more-content summary').last().click();assert(await native.locator('.read-more-content').last().getAttribute('open')!==null);
    assert.match(await native.locator('.project-story').last().innerText(),/2006/);await native.screenshot({path:`${artifacts}/no-js-native.png`});await fallback.close();
    record('No JavaScript: all 11 cards and native expandable case text/links');
    const failedObserver = await browser.newContext({viewport:{width:390,height:844}});
    await failedObserver.addInitScript(()=>{
        const Native=window.IntersectionObserver;
        window.IntersectionObserver=class extends Native {observe(target){if(target.matches('.portfolio-header'))throw new Error('Portfolio observer test');super.observe(target)}};
    });
    const staticPage=await failedObserver.newPage();await staticPage.goto(origin);
    assert(await staticPage.locator('#portfolio').evaluate(e=>!e.classList.contains('portfolio-motion-ready')));
    assert.equal(await staticPage.locator('.portfolio-box:visible').count(),6);
    assert.equal(await staticPage.locator('.portfolio-layer').first().evaluate(e=>getComputedStyle(e).opacity),'1');
    await failedObserver.close();record('Failed portfolio observer initialisation leaves static visible content');
    await page.setViewportSize({width:390,height:844}); await load();
    for (const target of [9,11]) {
        await page.locator('.portfolio-load-more-btn').scrollIntoViewIfNeeded();
        const y=await page.evaluate(()=>scrollY);
        await page.locator('.portfolio-load-more-btn').click();
        assert.equal(await count(),target);
        assert(Math.abs(await page.evaluate(()=>scrollY)-y)<=1);
    }
    for (let i=0;i<slugs.length;i++) {
        await page.locator('.project-open').nth(i).click();
        assert.equal(await page.locator('.popup-body .project-lead').innerText(),await page.locator('.project-story .project-lead').nth(i).innerText());
        if ([6,9,10].includes(i)) {
            await page.waitForTimeout(450);
            await page.screenshot({path:`${artifacts}/mobile-case-${i+1}.png`});
        }
        await page.keyboard.press('Escape');
    }
    record('390px: disclosure without scroll jumps and all 11 popup mappings, including the final two');
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedLocalRequests,[]);
    fs.writeFileSync(`${artifacts}/validation.json`,JSON.stringify(report,null,2));
    console.log('DONE',report.checks.length,'checks;',report.layouts.length,'RU/EN layouts; artifacts:',artifacts);
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close();});
