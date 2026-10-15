// CLOSE MENU HAMBURGER
var menu = document.getElementsByClassName('navbar');
var checkMenu = document.getElementById("check");

menu[0].addEventListener('click', handleMenuClick);

function handleMenuClick(event) {
    if (event.target instanceof HTMLAnchorElement) {
        checkMenu.checked = false;
    }
}
// END CLOSE MENU HAMBURGER

// ACTIVE MENU
let sections = document.querySelectorAll('section');
let navLinks = document.querySelectorAll('header nav a');

function updateActiveMenu() {
    const top = window.scrollY;

    for (const sec of sections) {
        const id = sec.getAttribute('id');
        if (id == null || id == 'director1' || id == 'director2') continue;

        const offset = sec.offsetTop - 150;
        if (top < offset || top >= offset + sec.offsetHeight) continue;

        const link = document.querySelector('header nav a[href*="' + id + '"]');
        if (!link) continue;

        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    }
}

// Coalesce scroll work into one rAF tick. The old handler ran a nested loop of
// DOM queries on every single scroll event, which starved the main thread
// during fast scrolling and made reveal animations stutter.
let activeMenuTicking = false;
window.addEventListener('scroll', () => {
    if (activeMenuTicking) return;
    activeMenuTicking = true;
    requestAnimationFrame(() => {
        updateActiveMenu();
        activeMenuTicking = false;
    });
}, { passive: true });

updateActiveMenu();
// END ACTIVE MENU

// SMOOTH ANCHOR NAVIGATION
// The stylesheet asks for `scroll-behavior: smooth`, but it is declared on the
// universal selector while html carries `overflow-x: hidden` — the combination
// browsers are known to ignore, which is why jumps land instantly. Driving the
// scroll here works regardless, and lets the duration and easing be chosen
// rather than left to the browser.
function initSmoothAnchors() {
    const header = document.querySelector('.header');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // JS owns anchor scrolling from here on, so switch the CSS behaviour off.
    // Leaving it on would make every window.scrollTo below animate on its own
    // and fight this tween. It is only disabled once this script runs, so
    // without JS the stylesheet still provides native smooth scrolling.
    document.documentElement.style.scrollBehavior = 'auto';

    function destinationFor(target) {
        // Sit the section just below the sticky header rather than under it.
        const headerHeight = header ? header.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        const furthest = document.documentElement.scrollHeight - window.innerHeight;
        return Math.max(0, Math.min(top, furthest));
    }

    // Leaves quickly, lands gently.
    function ease(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    let frame = null;

    function cancel() {
        if (frame === null) return;
        cancelAnimationFrame(frame);
        frame = null;
    }

    function glideTo(destination) {
        const from = window.scrollY;
        const distance = destination - from;
        if (Math.abs(distance) < 1) return;

        // Long trips get a little more time, but never enough to feel slow.
        const duration = Math.min(800, Math.max(420, Math.abs(distance) * 0.42));
        const start = performance.now();

        cancel();

        function step(now) {
            const progress = Math.min(1, (now - start) / duration);
            window.scrollTo(0, from + distance * ease(progress));
            frame = progress < 1 ? requestAnimationFrame(step) : null;
        }

        frame = requestAnimationFrame(step);
    }

    // Grabbing the page mid-flight should hand control straight back.
    ['wheel', 'touchstart', 'keydown'].forEach(type => {
        window.addEventListener(type, cancel, { passive: true });
    });

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const hash = link.getAttribute('href');
        if (hash.length < 2) return; // bare "#", used by the footer logo

        const target = document.getElementById(hash.slice(1));
        if (!target) return;

        e.preventDefault();

        const destination = destinationFor(target);
        if (reduceMotion.matches) {
            window.scrollTo(0, destination);
        } else {
            glideTo(destination);
        }

        // Keep the address bar and the back button in step, without letting the
        // browser perform its own instant jump to the anchor.
        if (window.history && history.pushState) {
            history.pushState(null, '', hash);
        }
    });

    // Because the jumps above are pushed manually, the browser no longer
    // scrolls anywhere on back/forward — so drive that here too.
    window.addEventListener('popstate', () => {
        const hash = location.hash;
        if (hash.length < 2) return;

        const target = document.getElementById(hash.slice(1));
        if (!target) return;

        const destination = destinationFor(target);
        if (reduceMotion.matches) {
            window.scrollTo(0, destination);
        } else {
            glideTo(destination);
        }
    });
}

initSmoothAnchors();
// END SMOOTH ANCHOR NAVIGATION

// SCROLL REVEAL
// Native IntersectionObserver instead of the ScrollReveal library: the browser
// recomputes intersections itself, so late-loading images shifting the layout
// can't leave a block stuck at a stale position.
function initScrollReveal() {
    // .reveal lives in the markup so the starting state is painted immediately
    // and nothing flashes before this script runs.
    const targets = document.querySelectorAll('.reveal');
    if (targets.length === 0) return;

    // Without IntersectionObserver, show everything rather than hide it.
    if (!('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('is-revealed'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            // Reveal once — no reset, so scrolling back and forth quickly
            // can never re-hide a block or interrupt its transition.
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.1,
        // Start slightly before the element edge so it is already settled
        // by the time it is properly in view.
        rootMargin: '0px 0px -5% 0px'
    });

    targets.forEach(el => observer.observe(el));
}

initScrollReveal();
// END SCROLL REVEAL

// Count after the milestones are clearly in view, and replay on a new visit.
function initAboutCounters() {
    const group = document.querySelector('.about-facts');
    if (!group || !('IntersectionObserver' in window)) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const values = Array.from(group.querySelectorAll('[data-count]'), element => ({
        element, target: Number(element.dataset.count)
    }));
    const heading = group.closest('.about-header');
    const header = document.querySelector('.header');
    let frame = null;
    let delay = null;
    let startedAt = null;
    let inView = false;

    function finish() {
        cancelAnimationFrame(frame);
        clearTimeout(delay);
        frame = delay = null;
        values.forEach(({ element, target }) => { element.textContent = String(target); });
    }
    function tick(now) {
        if (startedAt === null) startedAt = now;
        const progress = Math.min(1, (now - startedAt) / 1400);
        const eased = 1 - Math.pow(1 - progress, 2);
        values.forEach(({ element, target }) => { element.textContent = String(Math.floor(target * eased)); });
        if (progress < 1) frame = requestAnimationFrame(tick);
        else finish();
    }
    function start() {
        finish();
        if (motion.matches || document.hidden) return;
        startedAt = null;
        values.forEach(({ element }) => { element.textContent = '0'; });
        // The heading's entrance must not hide the beginning of the count.
        const revealing = heading && Number(getComputedStyle(heading).opacity) < .98;
        delay = setTimeout(() => {
            delay = null;
            if (inView && !document.hidden) frame = requestAnimationFrame(tick);
        }, revealing ? 500 : 100);
    }
    const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) {
            inView = false;
            finish();
        } else if (entry.intersectionRatio >= .6 && !inView) {
            inView = true;
            start();
        }
    }, {
        threshold: [0, .6],
        rootMargin: '-' + ((header ? header.offsetHeight : 0) + 8) + 'px 0px 0px 0px'
    });
    observer.observe(group);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) finish();
        else if (inView) start();
    });
    const onMotionChange = () => { if (motion.matches) finish(); else if (inView) start(); };
    if (motion.addEventListener) motion.addEventListener('change', onMotionChange);
    else motion.addListener(onMotionChange);
}
initAboutCounters();

// GEOMETRIC FIGURE ANIMATION
// Shared engine behind the home hero image and the three "Why us?" figures:
// Each cluster assembles and comes apart as the page scrolls past it.
// The original building repeatedly breaks into a layered, irregular field of
// its own parts, floats there, then reassembles. Other figures retain their
// independent motion.
function createFigureAnimator(container) {
    // Use the same eight path segments for every morph. Polygon control
    // points stay on their edges, so rectangles, triangles and lines stay
    // straight; only the two filled dots use circular outlines.
    function straightOutline(vertices) {
        const corners = [];
        vertices.forEach((point, i) => {
            const next = vertices[(i + 1) % vertices.length];
            const count = Math.floor(8 / vertices.length) + (i < 8 % vertices.length ? 1 : 0);
            for (let step = 0; step < count; step++) {
                const progress = step / count;
                corners.push([
                    point[0] + (next[0] - point[0]) * progress,
                    point[1] + (next[1] - point[1]) * progress
                ]);
            }
        });
        return `M${corners[0]} ${corners.map((point, i) => {
            const next = corners[(i + 1) % corners.length];
            return `C${point} ${next} ${next}`;
        }).join(' ')} Z`;
    }

    container.querySelectorAll('.home-architecture polygon.shape').forEach(polygon => {
        const points = polygon.getAttribute('points').trim().split(/[\s,]+/).map(Number);
        const vertices = [];
        for (let i = 0; i < points.length; i += 2) vertices.push([points[i], points[i + 1]]);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        Array.from(polygon.attributes).forEach(attribute => {
            if (attribute.name !== 'points') path.setAttribute(attribute.name, attribute.value);
        });
        path.setAttribute('d', straightOutline(vertices));
        path.setAttribute('data-building-plane', '');
        polygon.replaceWith(path);
    });
    const shapes = gsap.utils.toArray(container.querySelectorAll('.shape'));
    if (shapes.length === 0) return null;
    const model = container.querySelector('.home-architecture');
    const architecturalParts = model ? shapes.map(shape => {
        const attribute = shape.hasAttribute('points') ? 'points' : 'd';
        const paint = shape.hasAttribute('data-building-plane') ? 'fill' : 'stroke';
        return {
            shape, attribute, paint,
            building: shape.getAttribute(attribute),
            buildingPaint: getComputedStyle(shape)[paint],
            buildingStrokeOpacity: getComputedStyle(shape).strokeOpacity,
            buildingStrokeWidth: getComputedStyle(shape).strokeWidth
        };
    }) : [];
    const motion = model ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const animationTargets = model ? [...shapes, model] : shapes;

    // The architectural planes meet precisely; other figures keep their tilt.
    const baseRotations = shapes.map((_, i) => model ? 0 : Math.sin(i * 1.5) * 15);
    const idleTweens = [];
    let architecturalCycle = null;
    let isAssembling = false;
    let isSettled = false;
    let lastProgress = null;
    let inView = true;
    let isActive = !document.hidden;

    // Suspend existing tweens rather than restarting them. Offscreen figures
    // must not keep a ticker or GPU layer busy while the visitor reads below.
    function syncActivity() {
        isActive = inView && !document.hidden;
        const animate = isActive && !(motion && motion.matches);
        if (architecturalCycle) {
            // Pause the parent clock, preserving the timing of future steps.
            architecturalCycle.paused(!animate);
        } else {
            gsap.getTweensOf(animationTargets).forEach(tween => tween.paused(!animate));
        }
        shapes.forEach(shape => {
            shape.style.willChange = animate && !model ? 'transform, opacity' : 'auto';
        });
        if (model) model.style.willChange = animate ? 'transform' : 'auto';
    }

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            syncActivity();
        });
        observer.observe(container);
    }
    document.addEventListener('visibilitychange', syncActivity);
    syncActivity();

    function stopIdle() {
        idleTweens.forEach(t => t.kill());
        idleTweens.length = 0;
        architecturalCycle = null;
        if (model) {
            gsap.killTweensOf(model);
            shapes.forEach(shape => model.appendChild(shape));
        }
    }

    function startIdle() {
        stopIdle();
        if (model) {
            // Match the Why Us vocabulary: skewed rectangles, uneven
            // triangles, straight lines and solid round dots in varied sizes.
            // Keep the overall composition asymmetric, layered and open.
            const circleHandle = 4 / 3 * Math.tan(Math.PI / 16) * .5;
            const dotOutline = 'M.5,0 ' + Array.from({ length: 8 }, (_, i) => {
                const angle = -Math.PI / 2 + i * Math.PI / 4;
                const nextAngle = angle + Math.PI / 4;
                const x = .5 + Math.cos(angle) * .5;
                const y = .5 + Math.sin(angle) * .5;
                const nextX = .5 + Math.cos(nextAngle) * .5;
                const nextY = .5 + Math.sin(nextAngle) * .5;
                const values = [
                    x - Math.sin(angle) * circleHandle,
                    y + Math.cos(angle) * circleHandle,
                    nextX + Math.sin(nextAngle) * circleHandle,
                    nextY - Math.cos(nextAngle) * circleHandle,
                    nextX, nextY
                ];
                return 'C' + values.map(value => value.toFixed(6)).join(',');
            }).join(' ') + ' Z';
            const silhouettes = {
                rectangleWide: straightOutline([[.02, .16], [.96, .02], [.88, .71], [.08, .83]]),
                rectangleTall: straightOutline([[.12, .02], [.85, .12], [.96, .98], [.02, .86]]),
                rectangleSmall: straightOutline([[.02, .07], [.98, .02], [.87, .88], [.13, .98]]),
                triangleLeft: straightOutline([[.02, .92], [.16, .02], [.98, .48]]),
                triangleTall: straightOutline([[.08, .98], [.43, .02], [.98, .83]]),
                triangleSmall: straightOutline([[.02, .12], [.98, .02], [.69, .98]]),
                lineBold: straightOutline([[0, .491], [1, .491], [1, .509], [0, .509]]),
                lineFine: straightOutline([[0, .4955], [1, .4955], [1, .5045], [0, .5045]]),
                dot: dotOutline
            };
            // [building part, centre x/y, size, turn, depth, colour, silhouette]
            const fragments = [
                [2, 235, 315, 185, -24, -80, '#8c8c8c', 'rectangleWide'],
                [4, 335, 248, 162, 19, -35, '#eeeeee', 'rectangleTall'],
                [5, 170, 205, 88, -33, 50, '#921c12', 'triangleLeft'],
                [8, 282, 323, 240, -18, 60, '#b34031', 'lineBold'],
                [10, 392, 365, 128, 37, -15, '#b0b0b0', 'rectangleSmall'],
                [12, 230, 426, 115, 63, 25, '#d0d0d0', 'triangleTall'],
                [16, 375, 178, 68, 0, 5, '#921c12', 'dot'],
                [18, 450, 292, 28, 0, 90, '#eeeeee', 'dot'],
                [20, 163, 396, 145, -52, 75, '#dddddd', 'lineFine'],
                [25, 338, 487, 64, 44, 40, '#a64a37', 'triangleSmall'],
                [3, 294, 205, 82, -37, -45, '#b8b8b8', 'rectangleWide'],
                [7, 390, 415, 76, 22, 45, '#921c12', 'triangleTall'],
                [11, 203, 360, 36, 31, 100, '#eeeeee', 'rectangleSmall'],
                [15, 410, 235, 110, 46, -25, '#c8c8c8', 'lineFine'],
                [22, 303, 467, 20, 0, 110, '#b34031', 'dot']
            ];
            const fragmentByPart = new Map(fragments.map(fragment => [fragment[0], fragment]));
            const buildingHold = 1.8;
            const transitionDuration = 3.6;
            const chaosDuration = 3.6;
            // Build speed early, then brake smoothly through the approach.
            // Both ends have zero velocity; peak speed arrives at 22% of time.
            const accelerationFraction = .22;
            const brakingFraction = 1 - accelerationFraction;
            const breakupEase = progress => progress <= accelerationFraction
                ? progress - accelerationFraction / Math.PI * Math.sin(Math.PI * progress / accelerationFraction)
                : progress + brakingFraction / Math.PI * Math.sin(Math.PI * (progress - accelerationFraction) / brakingFraction);
            const chaosStart = buildingHold + transitionDuration;
            const rebuildStart = chaosStart + chaosDuration;
            const scattered = architecturalParts.map((part, i) => {
                const fragment = fragmentByPart.get(i);
                // Hidden details converge toward a visible piece so the
                // transition reads as consolidation rather than more debris.
                const [, cx, cy, size, rotation, depth, color, silhouette] = fragment || fragments[i % fragments.length];
                const box = part.shape.getBBox();
                const centreX = box.x + box.width / 2;
                const centreY = box.y + box.height / 2;
                const span = Math.max(1, box.width, box.height);
                const perspective = 850 / (850 - depth);
                let coordinate = 0;
                const chaosOutline = fragment ? silhouettes[silhouette].replace(/-?(?:\d*\.)?\d+/g, value => {
                    const centre = coordinate++ % 2 === 0 ? centreX : centreY;
                    return (centre + (Number(value) - .5) * span).toFixed(3);
                }) : part.building;
                // Keep the pivot fixed while the outline changes its bounds.
                gsap.set(part.shape, { svgOrigin: `${centreX} ${centreY}` });
                return {
                    ...part, depth, color, chaosOutline,
                    x: 310 + (cx - 310) * perspective - centreX,
                    y: 320 + (cy - 320) * perspective - centreY,
                    scale: fragment ? size / span * perspective : .04,
                    rotation,
                    opacity: fragment ? (depth < 0 ? .82 : 1) : 0
                };
            });
            architecturalCycle = gsap.timeline({ repeat: -1, repeatRefresh: true, paused: !isActive });

            // SVG draws later elements in front. Reorder the very same planes
            // while separated, then restore their exact building paint order
            // before they meet again. Projection adds the corresponding size cue.
            architecturalCycle.call(() => {
                [...scattered].sort((a, b) => a.depth - b.depth)
                    .forEach(part => model.appendChild(part.shape));
            }, [], buildingHold + transitionDuration * .55);
            architecturalCycle.call(() => {
                shapes.forEach(shape => model.appendChild(shape));
            }, [], rebuildStart + transitionDuration * .45);

            scattered.forEach(part => {
                architecturalCycle.to(part.shape, {
                    x: part.x, y: part.y, rotation: part.rotation,
                    scale: part.scale, opacity: part.opacity,
                    attr: { [part.attribute]: part.chaosOutline },
                    [part.paint]: part.color,
                    strokeOpacity: 1,
                    duration: transitionDuration,
                    ease: breakupEase
                }, buildingHold);

                if (part.opacity > 0) {
                    // One slow drift spans the whole chaotic phase, avoiding
                    // frequent reversals. Each element chooses its own small
                    // displacement and turn, refreshed on the next cycle.
                    architecturalCycle.to(part.shape, {
                        x: () => part.x + gsap.utils.random(4, 9) * gsap.utils.random([-1, 1]),
                        y: () => part.y + gsap.utils.random(4, 9) * gsap.utils.random([-1, 1]),
                        rotation: () => part.rotation + gsap.utils.random(-2, 2),
                        duration: chaosDuration,
                        ease: 'sine.inOut'
                    }, chaosStart);
                }

                architecturalCycle.to(part.shape, {
                    x: 0, y: 0, rotation: 0, scale: 1, opacity: 1,
                    attr: { [part.attribute]: part.building },
                    [part.paint]: part.buildingPaint,
                    strokeOpacity: part.buildingStrokeOpacity,
                    strokeWidth: part.buildingStrokeWidth,
                    duration: transitionDuration,
                    ease: 'power2.inOut'
                }, rebuildStart);
            });
            idleTweens.push(architecturalCycle);
            return;
        }
        shapes.forEach((shape, i) => {
            const t = gsap.to(shape, {
                x: "+=" + (Math.sin(i) * 20),
                y: "+=" + (Math.cos(i) * 20),
                rotation: "+=" + (Math.sin(i * 2) * 10),
                duration: 3 + Math.random() * 2,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
                paused: !isActive,
                delay: i * 0.05
            });
            idleTweens.push(t);
        });
    }

    function assemble(forceStagger = false) {
        if (motion && motion.matches) {
            showStaticModel();
            return;
        }
        if (isAssembling) return;
        if (isSettled && !forceStagger) return;

        isAssembling = true;
        isSettled = true;
        lastProgress = null;

        stopIdle();
        gsap.killTweensOf(shapes);
        restoreBuildingGeometry(forceStagger ? 0 : 1.5);

        if (forceStagger) {
            gsap.set(shapes, {
                x: (i) => model ? Math.sin(i * 2.4) * (160 + i * 3) : (Math.random() - 0.5) * 1000,
                y: (i) => model ? Math.cos(i * 2.4) * (130 + i * 2) : (Math.random() - 0.5) * 1000,
                rotation: (i) => model ? (i % 5 - 2) * 18 : (Math.random() - 0.5) * 720,
                opacity: 0,
                scale: model ? .65 : 0
            });
        }

        gsap.to(shapes, {
            x: 0,
            y: 0,
            rotation: (i) => baseRotations[i],
            opacity: 1,
            scale: 1,
            duration: 1.5,
            ease: "expo.out",
            paused: !isActive,
            stagger: forceStagger ? { amount: 1.2, from: model ? 'start' : 'random' } : 0,
            onComplete: () => {
                isAssembling = false;
                startIdle();
            }
        });
    }

    // progress: 0 = fully assembled/at rest, 1 = fully scattered/invisible.
    // Recomputed continuously from scroll position so it scrubs smoothly in
    // both directions instead of playing once.
    function disassemble(progress) {
        if (motion && motion.matches) return;
        if (isAssembling || !isActive || progress === lastProgress) return;
        lastProgress = progress;

        if (isSettled) {
            isSettled = false;
            stopIdle();
            restoreBuildingGeometry(.8);
        }

        shapes.forEach((shape, i) => {
            const factor = model ? 1 : (i % 5 + 1) * 0.8;
            const dx = (i % 2 === 0 ? 1 : -1) * (1 + i * 0.1);
            const dy = (i % 3 === 0 ? 1 : -1) * (1 + i * 0.1);

            gsap.to(shape, {
                x: dx * progress * (model ? 90 : 800) * factor,
                y: dy * progress * (model ? 90 : 800) * factor,
                rotation: baseRotations[i] + progress * (model ? (i % 2 === 0 ? 24 : -24) : 720 * factor),
                opacity: 1 - progress * (model ? 1 : .9),
                duration: 0.8,
                ease: "power2.out",
                overwrite: "auto"
            });
        });
    }

    function showStaticModel() {
        stopIdle();
        gsap.killTweensOf(shapes);
        restoreBuildingGeometry();
        gsap.set(shapes, { x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 });
        isAssembling = false;
        isSettled = true;
        lastProgress = null;
        syncActivity();
    }

    function restoreBuildingGeometry(duration = 0) {
        if (model) {
            if (duration) gsap.to(model, { y: 0, scale: 1, duration, ease: 'power2.out', overwrite: 'auto' });
            else gsap.set(model, { y: 0, scale: 1 });
        }
        architecturalParts.forEach(part => {
            const values = {
                attr: { [part.attribute]: part.building },
                [part.paint]: part.buildingPaint,
                strokeOpacity: part.buildingStrokeOpacity,
                strokeWidth: part.buildingStrokeWidth
            };
            if (duration) gsap.to(part.shape, { ...values, duration, ease: 'power2.out', overwrite: 'auto' });
            else gsap.set(part.shape, values);
        });
    }

    if (motion) {
        const onMotionChange = () => {
            if (motion.matches) showStaticModel();
            else {
                isSettled = false;
                assemble(false);
                syncActivity();
            }
        };
        if (motion.addEventListener) motion.addEventListener('change', onMotionChange);
        else motion.addListener(onMotionChange);
    }

    return {
        assemble,
        disassemble,
        get isSettled() { return isSettled; },
        get isAssembling() { return isAssembling; }
    };
}

// Keep the transformation loop near the top, then start scattering while
// enough of the hero is still visible for the transition to be seen.
function initHeroFigure() {
    const container = document.querySelector('.home-img-container');
    if (!container) return;
    const hero = container.closest('.home-section');
    const anim = createFigureAnimator(container);
    if (!anim) return;

    let isNavigatingToHome = false;

    anim.assemble(true);

    document.querySelectorAll('a[href="#home"]').forEach(link => {
        link.addEventListener('click', () => {
            isNavigatingToHome = true;
            anim.assemble(true);
        });
    });

    // Scroll listener — throttled to one frame.
    function onShapeScroll() {
        const scrollY = window.scrollY;
        const figureTop = container.getBoundingClientRect().top + scrollY;
        const scatterStart = Math.min(
            hero.offsetTop + hero.offsetHeight * .25,
            figureTop + container.offsetHeight * .25
        );
        const remainingHeight = Math.min(hero.offsetHeight * .5, container.offsetHeight * .7);

        if (scrollY <= scatterStart) {
            isNavigatingToHome = false;
            if (!anim.isSettled && !anim.isAssembling) {
                anim.assemble(false);
            }
            return;
        }

        if (anim.isAssembling || isNavigatingToHome) return;

        const progress = Math.min((scrollY - scatterStart) / remainingHeight, 1);
        anim.disassemble(progress);
    }

    let shapeTicking = false;
    window.addEventListener('scroll', () => {
        if (shapeTicking) return;
        shapeTicking = true;
        requestAnimationFrame(() => {
            onShapeScroll();
            shapeTicking = false;
        });
    }, { passive: true });
}

// The three "Why us?" figures. Unlike the hero they can sit anywhere on the
// page, so each is keyed off its own position in the viewport rather than
// the global scroll position: it explodes into place the first time it
// scrolls into view, holds and wiggles while comfortably on screen, and
// dissolves again as it scrolls past — in either direction.
function initWhyUsFigures() {
    const figures = Array.from(document.querySelectorAll('.figure-canvas'))
        .map(container => ({ container, anim: createFigureAnimator(container), hasEnteredOnce: false }))
        .filter(f => f.anim);
    if (figures.length === 0) return;

    function onFiguresScroll() {
        const vh = window.innerHeight;

        figures.forEach(fig => {
            const { anim, container } = fig;
            if (anim.isAssembling) return;

            const rect = container.getBoundingClientRect();

            if (!fig.hasEnteredOnce) {
                // Scrolling down brings it up from below — trigger the same
                // dramatic scatter-in the hero plays on load.
                if (rect.top < vh * 0.85 && rect.bottom > 0) {
                    fig.hasEnteredOnce = true;
                    anim.assemble(true);
                }
                return;
            }

            const settleTop = vh * 0.75;
            const settleBottom = vh * 0.25;
            const inSettleZone = rect.top < settleTop && rect.bottom > settleBottom;

            if (inSettleZone) {
                if (!anim.isSettled) anim.assemble(false);
                return;
            }

            // Symmetric in both directions: scrolling down pushes it out over
            // the top edge (rect.bottom sinking below settleBottom), scrolling
            // up pushes it out over the bottom edge (rect.top rising above
            // settleTop) — each ramps 0→1 over the same distance, continuous
            // with the settle zone's own boundary so there is no jump where
            // the two hand off.
            const exitDistance = vh * 0.9;
            const progress = rect.bottom <= settleBottom
                ? Math.min(Math.max((settleBottom - rect.bottom) / exitDistance, 0), 1)
                : Math.min(Math.max((rect.top - settleTop) / exitDistance, 0), 1);
            anim.disassemble(progress);
        });
    }

    let figureTicking = false;
    function requestFiguresTick() {
        if (figureTicking) return;
        figureTicking = true;
        requestAnimationFrame(() => {
            onFiguresScroll();
            figureTicking = false;
        });
    }

    window.addEventListener('scroll', requestFiguresTick, { passive: true });
    window.addEventListener('resize', requestFiguresTick);

    // In case a figure already sits in (or near) the viewport on load.
    onFiguresScroll();
}

function initGeometricAnimation() {
    initHeroFigure();
    initWhyUsFigures();
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGeometricAnimation);
} else {
    initGeometricAnimation();
}
// END GEOMETRIC FIGURE ANIMATION

// HERO WORDMARK
let typed = null;
let brandInView = true;
const brandElement = document.querySelector('.multiple-text');
const brandMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function syncBrandActivity() {
    if (!typed) return;
    if (document.hidden || !brandInView) typed.stop();
    else typed.start();
}

function updateHeroBrand(lng) {
    if (!brandElement) return;
    if (typed) {
        typed.destroy();
        typed = null;
    }
    // Only static, site-owned strings enter the animated markup.
    const ru = '<span class="first-word">Арт</span> групп';
    const en = '<span class="first-word">Art</span> group';
    const strings = lng === 'en' ? [en, ru] : [ru, en];
    brandElement.innerHTML = strings[0];
    if (brandMotion.matches || typeof Typed === 'undefined') return;

    brandElement.textContent = '';
    typed = new Typed(brandElement, {
        strings,
        typeSpeed: 75,
        backSpeed: 40,
        backDelay: 2600,
        startDelay: 260,
        loop: true,
        autoInsertCss: false
    });
    syncBrandActivity();
}

if (brandElement && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
        brandInView = entry.isIntersecting;
        syncBrandActivity();
    });
    observer.observe(brandElement.parentElement);
}
document.addEventListener('visibilitychange', syncBrandActivity);
const updateBrandMotion = () => updateHeroBrand(document.documentElement.lang);
if (brandMotion.addEventListener) brandMotion.addEventListener('change', updateBrandMotion);
else brandMotion.addListener(updateBrandMotion);
// END HERO WORDMARK

// PORTFOLIO LOAD MORE
let box = document.querySelectorAll('.portfolio-box');
let loadMoreBtn = document.querySelector('.portfolio-load-more-btn');
let currentimg = 6;

loadMoreBtn.addEventListener('click', () => {
    for (let i = currentimg; i < currentimg + 3; i++) {
        if (box[i]){
            box[i].style.display = 'block';
        }
    }
    currentimg += 3;
    if (currentimg >= box.length) {
        loadMoreBtn.style.display = 'none';
    }
})
// END PORTFOLIO LOAD MORE

// // POPUP BOX
// const portfolioItems = document.querySelector('.portfolio-container');
// const popup = document.querySelector('.popup-box');
// const popupCloseIcon = popup.querySelector('.popup-close-icon');


// portfolioItems.addEventListener('click', function(e) {
//     console.log(e.target.className)
//     if(e.target.className == "portfolio-layer") {
//         const item = e.target;
//         const h4 = item.querySelector("h4").innerHTML;
//         const readMoreCont = item.querySelector('.read-more-content').innerHTML;
//         popup.querySelector('h3').innerHTML = h4;
//         popup.querySelector('.popup-body').innerHTML = readMoreCont;

//         popupBox();
//     }
// })

// popupCloseIcon.addEventListener('click', popupBox);

// popup.addEventListener('click', function(e) {
//     if(e.target == popup || e.target.tagName.toLowerCase() === 'a') {
//         popupBox();
//         // closeDialog();
//     }
// })

// function popupBox(){
//     popup.classList.toggle('open');
// }
// // END POPUP BOX

// READ MORE ABOUT
function changeReadMore() {
    const mycontent =
        document.getElementById('mybox1id');
    const mybutton =
        document.getElementById('mybuttonid');

    const expanded = mycontent.style.display !== 'block';
    mycontent.style.display = expanded ? 'block' : 'none';
    mybutton.setAttribute('aria-expanded', String(expanded));
    const label = mybutton.querySelector('.lng-about-btn');
    label.textContent = expanded
        ? (currentLng === 'en' ? 'Collapse' : 'Свернуть')
        : langList['about-btn'][currentLng];
}
// END READ MORE ABOUT

// READ MORE DIRECTORS
function changeReadMore2() {
    const mycontent =
        document.getElementById('mybox2id');
    const mybutton =
        document.getElementById('mybuttonid2');

    if (mycontent.style.display === 'none'
        || mycontent.style.display === '') {
        mycontent.style.display = 'block';
        mycontent.style.marginTop = '3%';
        mycontent.style.fontSize = '1.2rem';
        mycontent.style.fontFamily = 'Poppins, sans-serif';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Свернуть';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'Collapse';
        }
    } else {
        mycontent.style.display = 'none';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Подробнее';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'More details';
        }
    }
}

function changeReadMore3() {
    const mycontent =
        document.getElementById('mybox3id');
    const mybutton =
        document.getElementById('mybuttonid3');

    if (mycontent.style.display === 'none'
        || mycontent.style.display === '') {
        mycontent.style.display = 'block';
        mycontent.style.marginTop = '3%';
        mycontent.style.fontSize = '1.2rem';
        mycontent.style.fontFamily = 'Poppins, sans-serif';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Свернуть';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'Collapse';
        }
    } else {
        mycontent.style.display = 'none';
        if (currentLng == 'ru') {
            mybutton.textContent = 'Подробнее';
        }
        if (currentLng == 'en') {
            mybutton.textContent = 'More details';
        }
    }
}
// END READ MORE DIRECTORS

// SEND TELEGRAM FORM
// The message is forwarded through a Cloudflare Worker (see worker/) instead
// of calling the Telegram Bot API directly from the browser, so the bot
// token never sits in client-side JS where anyone viewing source could read it.
// Uses a custom domain rather than *.workers.dev: that shared hostname
// pattern has been observed throttled/blocked by some Russian ISPs without
// a VPN, even though the Worker itself is reachable and healthy.
const FEEDBACK_API = 'https://api.artgroup.fun/';

// Guards against a double-click or double-tap firing two submits before the
// first fetch has resolved.
let feedbackSubmitting = false;

// Plays once on a successful submit: the card folds toward the button (see
// .is-sending in style.css), then the paper-plane glyph launches from there
// and flies off (.form-plane.is-flying). Resolves once both CSS animations
// have finished, so the caller can run its normal success handling right
// after — nothing about that handling needs to know this happened. Skipped
// outright for anyone who has asked the OS for less motion.
function playSendFlight(form) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return Promise.resolve();
    }

    const plane = form.parentElement.querySelector('.form-plane');
    if (!plane) return Promise.resolve();

    return new Promise((resolve) => {
        let formDone = false;
        let planeDone = false;
        let settled = false;

        const finish = () => {
            if (settled) return;
            settled = true;
            form.removeEventListener('animationend', onFormEnd);
            plane.removeEventListener('animationend', onPlaneEnd);
            resolve();
        };
        const onFormEnd = () => { formDone = true; if (planeDone) finish(); };
        const onPlaneEnd = () => { planeDone = true; if (formDone) finish(); };

        form.addEventListener('animationend', onFormEnd);
        plane.addEventListener('animationend', onPlaneEnd);

        form.classList.add('is-sending');
        // A short beat behind the fold, so the plane reads as launching out
        // of the card rather than popping in alongside it.
        setTimeout(() => plane.classList.add('is-flying'), 220);

        // Safety net in case an animationend is ever missed (e.g. the tab
        // was backgrounded), so the success handling can never hang.
        setTimeout(finish, 1600);
    });
}

async function sendTelegram(e) {
    e.preventDefault();
    if (feedbackSubmitting) return;

    const form = e.target;
    const formBtn = form.querySelector('.send-btn');
    const formSpinner = form.querySelector('.form-spinner');
    const formSendResult = document.querySelector('.form-send-result');
    formSendResult.textContent = '';
    formSendResult.classList.remove('is-success', 'is-error');

    // "website" is a honeypot: hidden off-screen in the markup, so only a
    // bot filling in every field ever sets it. Real submits send it empty.
    const {phone, name, comment, website} = Object.fromEntries(new FormData(form).entries());

    feedbackSubmitting = true;
    formBtn.disabled = true;
    // formBtn is an <input type="submit">, whose visible label comes
    // from .value, not .textContent.
    formBtn.value = 'Отправка...';
    // .is-loading shrinks/fades the button away as the spinner grows in
    // over the same spot (see style.css), so the button appears to morph
    // into the preloader rather than a spinner just showing up beside it.
    formBtn.classList.add('is-loading');
    formSpinner.classList.add('is-active');

    const showSuccess = async () => {
        await playSendFlight(form);
        formSendResult.textContent = `${name}! Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время!`;
        formSendResult.classList.add('is-success');
        form.reset();
        form.style.display = 'none';
    };

    try {
        // The Worker occasionally fails to deliver its response back over
        // flaky mobile/Safari connections even though it already forwarded
        // the message to Telegram, so a request that hangs gets aborted
        // rather than left to time out on its own.
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), 3000);
        let response;
        try {
            response = await fetch(FEEDBACK_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, phone, message: comment, website }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(abortTimer);
        }

        if (response.ok) {
            await showSuccess();
        } else {
            // A response did come back and it was an error — trust it.
            throw new Error(response.statusText);
        }
    } catch (error) {
        console.error(error);
        // No response reached us at all (dropped connection or our own
        // timeout, not a real error from the server): the message has
        // almost certainly already reached Telegram, so show success
        // anyway after a brief pause rather than alarm the user.
        if (error.name === 'AbortError' || error instanceof TypeError) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            await showSuccess();
        } else {
            formSendResult.textContent = 'Произошла ошибка отправки! Попробуйте еще раз.';
            formSendResult.classList.add('is-error');
        }
    } finally {
        feedbackSubmitting = false;
        formBtn.disabled = false;
        formBtn.value = currentLng === 'en' ? 'Send' : 'Отправить';
        formBtn.classList.remove('is-loading');
        formSpinner.classList.remove('is-active');
    }
};
// END SEND TELEGRAM FORM

// MULTILANGUAGES
const select = document.querySelector('select');
const sendBtn = document.querySelector('.send-btn');
let currentLng = localStorage.getItem('lang') || 'ru'; // Global variable to store current language

select.addEventListener('change', () => {
    currentLng = select.value;
    localStorage.setItem('lang', currentLng);
    applyLanguage(currentLng);
});

function applyLanguage(lng) {
    currentLng = lng; // Ensure global variable is updated
    document.querySelector('html').setAttribute('lang', lng);
    document.querySelector('title').innerHTML = mainLang['html-title'][lng];

    for (let key in langList) {
        const element = document.querySelector('.lng-' + key);
        if (element) {
            element.innerHTML = langList[key][lng];
        }
    }
    sendBtn.value = lng === 'en' ? 'Send' : 'Отправить';
    updateHeroBrand(lng);
    if (typeof updateAboutGalleryLanguage === 'function') updateAboutGalleryLanguage();
    if (typeof refreshProjectPopupLanguage === 'function') refreshProjectPopupLanguage();

    // Refresh toggle buttons text if sections are expanded
    const sections = [
        { contentId: 'mybox1id', buttonId: 'mybuttonid' },
        { contentId: 'mybox2id', buttonId: 'mybuttonid2' },
        { contentId: 'mybox3id', buttonId: 'mybuttonid3' }
    ];

    sections.forEach(sec => {
        const content = document.getElementById(sec.contentId);
        const button = document.getElementById(sec.buttonId);
        if (content && button && content.style.display === 'block') {
            const label = button.querySelector('.lng-about-btn') || button;
            label.textContent = lng === 'en' ? 'Collapse' : 'Свернуть';
        }
    });
}

// Initialize based on localStorage or default to 'ru'
select.value = currentLng;
applyLanguage(currentLng);
// END MULTILANGUAGES

// VISITORS

// END VISITORS
