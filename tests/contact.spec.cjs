/* Focused local contact regression. Every feedback request is intercepted.
   PLAYWRIGHT_MODULE=/absolute/path/to/playwright node tests/contact.spec.cjs
   CONTACT_ARTIFACTS optionally chooses the screenshot/report directory.
   Mock acceptance verifies UI behavior, not real Telegram delivery. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const artifacts = process.env.CONTACT_ARTIFACTS || '/private/tmp/artgroup-contact-review/verified';
fs.mkdirSync(artifacts, { recursive: true });
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const server = http.createServer((req,res)=>{
    const name = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
    if (!name.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(name,(err,data)=>{
        if (err) { res.writeHead(404).end(); return; }
        res.writeHead(200,{'Content-Type':mime[path.extname(name)] || 'application/octet-stream'}).end(data);
    });
});
const report = { checks:[], layouts:[], errors:[], mocked:true };
const check = text => { report.checks.push(text); console.log('PASS',text); };
let browser;
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({headless:true});
    async function session(options={}) {
        const ctx = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',...options.browser});
        await ctx.addInitScript(({consent})=>{
            // Context init scripts also run inside opaque third-party
            // frames; only seed storage where the browser permits it.
            try {
                if (consent) localStorage.setItem('cookieConsent',consent);
                localStorage.setItem('lang','ru');
            } catch (_) {}
        },{consent:options.consent===undefined?'declined':options.consent});
        const api = [], queue = [], badges = [];
        let held;
        await ctx.route('https://api.artgroup.fun/**',async route=>{
            const req=route.request();
            api.push({method:req.method(),type:req.headers()['content-type'],fields:Object.fromEntries(new URLSearchParams(req.postData()))});
            const next=queue.shift() || 'reject';
            if(next==='hold'){held=route;return;}
            if(next==='network'){await route.abort('failed');return;}
            await route.fulfill({status:next==='success'?200:400,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({success:next==='success'})});
        });
        await ctx.route('**/metrika/**',route=>route.abort());
        await ctx.route('https://yandex.ru/sprav/widget/rating-badge/**',route=>{
            badges.push(route.request().url());
            return options.blockBadge ? route.abort() : route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><title>Mock third-party badge</title><body></body></html>'});
        });
        if(options.noContactScript) await ctx.route('**/js/contact.js?*',route=>route.abort());
        if(options.noDeliveryScript) await ctx.route('**/js/app.js?*',route=>route.abort());
        if(options.observerFailure) await ctx.addInitScript(()=>{
            const Native=window.IntersectionObserver;
            window.IntersectionObserver=class extends Native { observe(target){if(target.matches('#contact .contact-study'))throw Error('Simulated contact observer failure');super.observe(target);} };
        });
        const p=await ctx.newPage();
        p.on('pageerror',e=>report.errors.push(e.message));
        let navigation = 0;
        async function load(hash='#contact'){
            // A unique query makes this a fresh document, not just a hash
            // navigation that correctly preserves a successful form's state.
            await p.goto(origin+'/?contactTest='+ ++navigation+hash,{waitUntil:'domcontentloaded'});
            if(!options.noContactScript && !options.noDeliveryScript && options.browser?.javaScriptEnabled!==false) await p.waitForFunction(()=>document.querySelector('#contact').classList.contains('contact-ready'));
        }
        await load(options.hash===undefined?'#contact':options.hash);
        return {ctx,p,api,queue,badges,load,held:()=>held};
    }
    const main=await session(), {p,api,queue}=main;
    const value={phone:'8 (000) 000-00-00',name:'Проверка интерфейса',comment:'Тестовая задача: оценить варианты использования участка.'};
    const fields=()=>p.locator('#contact-form input:not(.hp-field), #contact-form textarea');
    async function fill(){for(const [name,text]of Object.entries(value))await p.locator(`#contact-form [name="${name}"]`).fill(text);}
    async function submit(){await p.locator('#contact-form').evaluate(form=>form.requestSubmit());}
    async function waitFailure(text){await p.waitForFunction(text=>document.querySelector('#contact-feedback').textContent.includes(text),text);}
    async function shot(name){await p.evaluate(()=>document.activeElement?.blur());await p.locator('#contact').screenshot({path:`${artifacts}/${name}.png`,style:'.header {visibility:hidden !important}'});}
    assert.equal(await p.locator('#contact h2').count(),1);
    const attrs=await fields().evaluateAll(nodes=>nodes.map(n=>({id:n.id,label:n.labels.length,required:n.required,max:n.maxLength,autocomplete:n.autocomplete,font:parseFloat(getComputedStyle(n).fontSize)})));
    assert.deepEqual(attrs.map(n=>n.max),[20,50,300]);assert(attrs.every(n=>n.label===1&&n.required&&n.font>=16));assert.equal(attrs[0].autocomplete,'tel');assert.equal(attrs[1].autocomplete,'name');
    assert.equal(await p.locator('#contact [name=website]').getAttribute('tabindex'),'-1');
    assert.equal(await p.locator('#contact [name=website]').getAttribute('aria-hidden'),'true');
    assert.equal(await p.locator('#contact [name=website]').inputValue(),'');
    await p.locator('#contact-phone').focus();
    for(const id of ['contact-name','contact-comment']){await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),id);}
    await p.keyboard.press('Tab');assert(await p.locator('#contact .send-btn').evaluate(e=>e===document.activeElement));
    check('Labels, required rules, autocomplete, 16px field text, keyboard order and honeypot');
    await submit();assert.equal(api.length,0);assert.equal(await p.evaluate(()=>document.activeElement.id),'contact-phone');assert(await p.locator('#contact-phone-error').isVisible());
    await p.selectOption('.change-lng','en');assert.match(await p.locator('#contact-phone-error').innerText(),/phone number/);
    await p.selectOption('.change-lng','ru');
    await p.locator('#contact-phone').fill('   ');await submit();assert.equal(api.length,0);
    await fill();
    await p.locator('#contact-name').evaluate(n=>{n.value='x'.repeat(51);});await submit();assert.equal(api.length,0);assert.match(await p.locator('#contact-name-error').innerText(),/50/);await p.locator('#contact-name').fill(value.name);
    await shot('invalid-correcting');
    check('First-invalid focus, whitespace/length validation and localized errors without a request');
    queue.push('reject');await submit();await waitFailure('Не удалось отправить');assert.equal(api.length,1);
    assert.deepEqual(api[0].fields,{name:value.name,phone:value.phone,message:value.comment,website:''});assert.equal(api[0].method,'POST');assert.match(api[0].type,/application\/x-www-form-urlencoded/);
    for(const[name,text]of Object.entries(value))assert.equal(await p.locator(`#contact-form [name=${name}]`).inputValue(),text);
    await shot('http-rejection');check('Mock HTTP rejection preserves every value and the existing URL-encoded field mapping');
    let before=await p.locator('.contact-form-panel').evaluate(e=>e.offsetHeight);
    queue.push('hold');await submit();await p.waitForFunction(()=>document.querySelector('.send-btn').disabled);
    await submit();await submit();assert.equal(api.length,2);
    assert(await p.locator('#contact-form').isVisible());assert(await p.locator('#contact-confirmation').isHidden());
    await p.selectOption('.change-lng','en');assert.equal(await p.locator('[data-contact-submit]').innerText(),'Sending…');assert(await p.locator('#contact .send-btn').isDisabled());assert.equal(await p.locator('#contact-name').inputValue(),value.name);
    assert.equal(await p.locator('.form-spinner').evaluate(e=>getComputedStyle(e).animationName),'none');await shot('pending-en');before=await p.locator('.contact-form-panel').evaluate(e=>e.offsetHeight);
    await main.held().fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:'{"success":true}'});
    await p.locator('#contact-success-title').waitFor({state:'visible'});assert.equal(await p.evaluate(()=>document.activeElement.id),'contact-success-title');assert(await p.locator('#contact-form').isHidden());
    assert(await p.locator('.contact-form-panel').evaluate((e,h)=>e.offsetHeight>=h,before));assert.match(await p.locator('#contact-announcement').innerText(),/Enquiry sent/);
    assert.equal(await p.locator('#contact-name').inputValue(),'');await p.selectOption('.change-lng','ru');assert(await p.locator('#contact-form').isHidden());assert.match(await p.locator('#contact-success-title').innerText(),/Заявка отправлена/);
    await shot('confirmed-success');check('Retry, rapid duplicate guard, pending RU/EN state, immediate mock acceptance, reset/hide/focus and stable panel area');
    await main.load();await fill();queue.push('network');await submit();await waitFailure('Не удалось подтвердить');assert(await p.locator('#contact-form').isVisible());assert.equal(await p.locator('#contact-comment').inputValue(),value.comment);await shot('network-unknown');
    await p.selectOption('.change-lng','en');assert.match(await p.locator('#contact-feedback').innerText(),/couldn’t confirm/);
    check('Mock network failure is unknown delivery and preserves data in both languages');
    await main.load();await fill();queue.push('hold');const started=Date.now();await submit();await waitFailure('Не удалось подтвердить');assert(Date.now()-started>=14500);assert(await p.locator('#contact .send-btn').isEnabled());assert.equal(await p.locator('#contact-phone').inputValue(),value.phone);await main.held().abort().catch(()=>{});
    check('Real 15-second client abort with a held mock request; no automatic retry or false success');
    await main.load();await fill();await p.evaluate(()=>{window.fetch=()=>Promise.resolve({ok:false,status:0,type:'opaque'});});await submit();await waitFailure('Не удалось подтвердить');assert(await p.locator('#contact-confirmation').isHidden());
    check('Opaque/status-zero response never becomes success');
    await main.load();
    const reviewURL='https://yandex.ru/maps/org/art_grupp/193271132090/?ll=37.588189%2C55.760054&utm_campaign=v1&utm_medium=rating&utm_source=badge&z=16';
    assert.equal(await p.locator('[data-contact-text=contact-review]').getAttribute('href'),reviewURL);
    assert.equal(await p.locator('#contact .contact-telegram').getAttribute('href'),'https://t.me/ElizaHappyLife');assert.equal(await p.locator('#contact a[href="mailto:infoartgroupp@yandex.ru"]').count(),2);
    assert.equal(await p.locator('.footer-site-credit a').getAttribute('href'),'https://t.me/jony2024');assert.equal(await p.locator('#contact a[data-unconfigured]').count(),0);
    assert.equal(await p.locator('#contact .contact-form-panel').evaluate(e=>getComputedStyle(e,'::before').content),'none');
    check('Existing phone/email/map/Telegram destinations, corrected Yandex organization link, retained VK source and owner-requested footer credit');
    for(const language of ['ru','en']){
        await p.selectOption('.change-lng',language);
        for(const width of [320,360,390,768,1024,1440,1920,2560,3840]){
            await p.setViewportSize({width,height:width<800?844:1000});
            const layout=await p.evaluate(()=>({language:document.documentElement.lang,width:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,shell:document.querySelector('.contact-shell').offsetWidth,panel:document.querySelector('.contact-form-panel').offsetWidth,section:document.querySelector('#contact').offsetHeight}));
            assert(layout.overflow<=1,JSON.stringify(layout));assert(layout.shell<=1301);assert(layout.panel<=621);report.layouts.push(layout);
            if([320,390,1440,3840].includes(width))await shot(`${language}-${width}`);
        }
        assert.equal(await p.locator('#footer-credit-link-label').innerText(),language==='en'?'here':'сюда');
    }
    check('RU/EN layouts at 320/360/390/768/1024/1440/1920/2560/3840px; bounded form/container and no horizontal overflow');
    for(const [width,height]of [[720,500],[844,390],[667,375],[1024,320]]){
        await p.setViewportSize({width,height});await p.locator('#contact-comment').focus();await p.waitForTimeout(100);
        const bounds=await p.evaluate(()=>({label:document.querySelector('label[for=contact-comment]').getBoundingClientRect().top,header:document.querySelector('.header').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth-innerWidth}));assert(bounds.label>=bounds.header,JSON.stringify(bounds));assert(bounds.overflow<=1);
    }
    check('200% desktop reflow equivalent (720×500) and short landscape focus/label visibility');
    await p.setViewportSize({width:1440,height:1000});await main.load('');
    await p.locator('.navbar a[href="#contact"]').click();await p.waitForTimeout(1000);assert(await p.locator('#contact-title').isVisible());
    await p.locator('.project-open').first().click();await p.locator('.popup-body a[href="#contact"]').first().click();await p.waitForTimeout(1000);assert(!await p.locator('body').evaluate(e=>e.classList.contains('popup-open')));
    await p.locator('#estimate-open').click();await p.locator('#estimate-form [name=name]').fill(value.name);await p.locator('#estimate-form [name=phone]').fill(value.phone);await p.locator('#estimate-form [name=comment]').fill(value.comment);
    queue.push('reject');await p.locator('.estimate-submit').click();await p.locator('.estimate-error').waitFor({state:'visible'});assert.equal(await p.locator('#estimate-form [name=comment]').inputValue(),value.comment);
    queue.push('success');await p.locator('.estimate-submit').click();await p.locator('.estimate-success').waitFor({state:'visible'});assert.match(api.at(-1).fields.message,/Запрос предварительной оценки/);
    await p.locator('.estimate-done').click();check('Navigation and project-popup contact links; shared Services assessment mock rejection/retry/success');
    await main.ctx.close();
    const motion=await session({hash:'',browser:{reducedMotion:'no-preference'}});
    await motion.p.evaluate(()=>{window.__contactStarts=[];document.querySelector('#contact').addEventListener('animationstart',e=>__contactStarts.push(e.animationName));});
    await motion.p.locator('.contact-study').scrollIntoViewIfNeeded();await motion.p.waitForFunction(()=>__contactStarts.includes('contact-trace'));await motion.p.waitForTimeout(200);await motion.p.locator('#contact').screenshot({path:`${artifacts}/motion-drawing.png`,style:'.header{visibility:hidden!important}'});await motion.p.waitForTimeout(1300);
    const starts=await motion.p.evaluate(()=>__contactStarts.length);assert(starts>0);
    await motion.p.evaluate(()=>scrollTo(0,0));await motion.p.locator('.contact-study').scrollIntoViewIfNeeded();await motion.p.waitForTimeout(400);assert.equal(await motion.p.evaluate(()=>__contactStarts.length),starts);
    await motion.p.locator('#contact-phone').fill(value.phone);await motion.p.evaluate(()=>scrollTo(0,0));await motion.p.locator('#contact-phone').scrollIntoViewIfNeeded();assert(!await motion.p.locator('.contact-form-panel').evaluate(e=>e.classList.contains('contact-visible')));
    check('Visible drawing on actual entry, one-time scroll animation, and no reanimation of a focused/filled form');await motion.ctx.close();
    const cookies=await session({consent:null,browser:{viewport:{width:390,height:844}}});
    await cookies.p.locator('#cookie-banner.is-visible').waitFor();await cookies.p.locator('#contact-phone').focus();await cookies.p.waitForTimeout(150);
    assert(await cookies.p.evaluate(()=>{const f=document.querySelector('#contact-phone').getBoundingClientRect(),b=document.querySelector('#cookie-banner').getBoundingClientRect();return f.bottom<b.top;}));assert.equal(cookies.badges.length,0);
    const badgeFinished=cookies.ctx.waitForEvent('requestfinished',{predicate:req=>req.url().includes('/sprav/widget/rating-badge/')});
    await cookies.p.locator('#cookie-accept-btn').click();await cookies.p.locator('.contact-review').scrollIntoViewIfNeeded();await cookies.p.waitForFunction(()=>document.querySelector('[data-contact-badge]').hasAttribute('src'));await badgeFinished;assert.equal(cookies.badges.length,1);
    await cookies.p.selectOption('.change-lng','en');await cookies.p.evaluate(()=>scrollTo(0,0));await cookies.p.locator('.contact-review').scrollIntoViewIfNeeded();assert.equal(cookies.badges.length,1);assert.match(await cookies.p.locator('[data-contact-badge]').getAttribute('title'),/ART GROUP/);
    check('Mobile cookie clearance; genuine organization badge loads once after consent, not on scroll/language changes');await cookies.ctx.close();
    for(const mode of [{noContactScript:true},{noDeliveryScript:true},{browser:{javaScriptEnabled:false}},{observerFailure:true},{consent:'accepted',blockBadge:true}]){
        const fallback=await session(mode);assert(await fallback.p.locator('#contact-title').isVisible());
        if(mode.noContactScript||mode.noDeliveryScript||mode.browser?.javaScriptEnabled===false){assert(await fallback.p.locator('.contact-js-note').isVisible());assert(await fallback.p.locator('#contact-phone').isDisabled());assert(await fallback.p.locator('#contact .send-btn').isDisabled());}
        else{assert(await fallback.p.locator('#contact-phone').isEnabled());}
        if(mode.browser?.javaScriptEnabled===false){
            await fallback.p.waitForLoadState('networkidle');
            // With JS disabled use a native viewport capture, avoiding
            // locator screenshot scrolling while lazy images settle.
            await fallback.p.screenshot({path:`${artifacts}/no-javascript.png`});
        }
        await fallback.ctx.close();
    }
    check('No-JavaScript/script-failure contact access; failed observer and blocked badge do not hide the section or prevent contact');
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync(`${artifacts}/validation.json`,JSON.stringify(report,null,2));console.log('DONE',report.checks.length,'checks;',report.layouts.length,'layouts;',artifacts);
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close();});
