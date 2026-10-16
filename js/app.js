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
// The home hero assembles and comes apart as the page scrolls past it.
// The original building repeatedly breaks into a layered, irregular field of
// its own parts, floats there, then reassembles. The Why Us figures have a
// separate, reversible icon choreography in initWhyUsFigures below.
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
    const stackedLayout = window.matchMedia('(max-width: 720px)');
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
        // Start a little sooner in the stacked layout, before the building
        // reaches the top edge. Keep the existing scatter duration.
        const scatterLead = stackedLayout.matches ? container.offsetHeight * .15 : 0;
        const scatterStart = Math.max(0, Math.min(
            hero.offsetTop + hero.offsetHeight * .25,
            figureTop + container.offsetHeight * .25
        ) - scatterLead);
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

// Keep every original abstract piece, then choreograph it into a readable
// symbol: a stopwatch, a drafting compass, and three connected expert hubs.
// Positions stay in percentages so a resize never changes the composition.
function initWhyUsFigures() {
    const containers = Array.from(document.querySelectorAll('.figure-canvas'));
    if (containers.length === 0) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const red = getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim();
    const rectangle = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
    const pose = (left, top, width, height, extra = {}) => ({
        left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
        rotation: 0, borderRadius: '0%', clipPath: rectangle, ...extra
    });
    const icons = [
        // Efficiency: a precise dial, two hands, crown and side button.
        [
            pose(17, 23, 66, 66, { borderRadius: '50%' }),
            pose(48, 32, 4, 24),
            pose(43, 9, 14, 8, { borderRadius: '12%' }),
            pose(48, 38, 4, 18, { rotation: 55, transformOrigin: '50% 100%' }),
            pose(49.25, 26, 1.5, 5),
            pose(48.5, 17, 3, 7),
            pose(77, 26, 8, 4, { rotation: 45 }),
            pose(47, 53, 6, 6, { borderRadius: '50%' }),
            pose(23, 29, 54, 54, { borderRadius: '50%' })
        ],
        // Creativity: an architect's compass with a silver needle, red pencil,
        // crossbar and pivot. The original eight fragments all have a role.
        [
            pose(40, 10, 20, 20, { borderRadius: '50%', backgroundColor: '#ddd' }),
            pose(44.5, 24, 11, 56, {
                rotation: -22, transformOrigin: '50% 0%',
                clipPath: 'polygon(0% 0%, 100% 0%, 82% 100%, 18% 100%)'
            }),
            pose(44.5, 24, 11, 56, {
                rotation: 22, transformOrigin: '50% 0%',
                clipPath: 'polygon(0% 0%, 100% 0%, 82% 100%, 18% 100%)'
            }),
            pose(35.5, 48, 29, 3, { backgroundColor: '#999' }),
            pose(46, 16, 8, 8, { borderRadius: '50%' }),
            pose(25.5, 75.9, 7, 12, {
                rotation: 22, transformOrigin: '50% 0%',
                clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%, 50% 100%)'
            }),
            pose(67.5, 75.9, 7, 12, {
                rotation: -22, transformOrigin: '50% 0%', backgroundColor: '#ddd',
                clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%, 50% 100%)'
            }),
            pose(48.75, 18.75, 2.5, 2.5, { borderRadius: '50%' })
        ],
        // Partnership: three equal hubs joined into one working network.
        [
            pose(38, 8, 24, 24, { borderRadius: '50%', backgroundColor: '#c2c2c2' }),
            pose(35.5, 28, 3, 34, { rotation: 27.5 }),
            pose(36, 68.5, 28, 3),
            pose(12, 58, 24, 24, { borderRadius: '50%' }),
            pose(64, 58, 24, 24, { borderRadius: '50%', borderWidth: '0px' }),
            pose(61.5, 28, 3, 34, { rotation: -27.5 }),
            pose(45, 15, 10, 10, { borderRadius: '50%' }),
            pose(19, 65, 10, 10, { borderRadius: '50%', backgroundColor: red }),
            pose(71, 65, 10, 10, { borderRadius: '50%', backgroundColor: red })
        ]
    ];

    // Equal vertex counts let the two existing triangles morph continuously
    // into the icon parts. Repeating a vertex preserves their outline.
    function normalizedClip(clip) {
        if (clip === 'none') return rectangle;
        const vertices = clip.slice(clip.indexOf('(') + 1, -1).split(',');
        if (vertices.length === 3) vertices.push(vertices[2]);
        return `polygon(${vertices.join(',')})`;
    }

    function smoothStep(value) {
        const progress = Math.min(1, Math.max(0, value));
        return progress * progress * (3 - 2 * progress);
    }

    const figures = containers.map((container, figureIndex) => {
        const shapes = Array.from(container.querySelectorAll('.shape'));
        // Save the original CSS geometry before adding animation layers.
        // Layout dimensions keep the percentage poses accurate on fractional
        // and high-density responsive layouts.
        const canvasStyle = getComputedStyle(container);
        const canvasWidth = parseFloat(canvasStyle.width);
        const canvasHeight = parseFloat(canvasStyle.height);
        const initial = shapes.map((shape, i) => {
            const style = getComputedStyle(shape);
            return {
                left: `${parseFloat(style.left) / canvasWidth * 100}%`,
                top: `${parseFloat(style.top) / canvasHeight * 100}%`,
                width: `${parseFloat(style.width) / canvasWidth * 100}%`,
                height: `${parseFloat(style.height) / canvasHeight * 100}%`,
                backgroundColor: style.backgroundColor,
                borderWidth: style.borderTopWidth,
                borderColor: style.borderTopColor,
                borderRadius: style.borderRadius,
                clipPath: normalizedClip(style.clipPath),
                // Preserve the settled tilt of the original abstract figures.
                rotation: Math.sin(i * 1.5) * 15,
                transformOrigin: '50% 50%',
                scale: 1, opacity: 1
            };
        });
        const cycle = gsap.timeline({ paused: true, repeat: -1 });
        const iconStart = .95 + figureIndex * .14;
        const abstractStart = iconStart + 1.25 + (shapes.length - 1) * .035 + 1.85;
        const abstractEnd = abstractStart + 1.15 + (shapes.length - 1) * .025;

        // Scroll transforms live on a separate layer, so entering/leaving the
        // viewport never fights the icon morph or each piece's gentle drift.
        // Copy the original stacking order and pivot around each fragment.
        const driftLayers = [];
        const fragments = shapes.map((shape, i) => {
            const fragment = document.createElement('div');
            fragment.className = 'figure-fragment';
            fragment.style.zIndex = getComputedStyle(shape).zIndex;
            fragment.style.transformOrigin = `${parseFloat(initial[i].left) + parseFloat(initial[i].width) / 2}% ${parseFloat(initial[i].top) + parseFloat(initial[i].height) / 2}%`;
            const drift = document.createElement('div');
            drift.className = 'figure-drift';
            container.insertBefore(fragment, shape);
            fragment.appendChild(drift);
            drift.appendChild(shape);
            driftLayers.push(drift);
            return fragment;
        });
        const figure = {
            container, fragments, driftLayers, cycle, figureIndex,
            iconStart, abstractEnd, scatter: 1, drift: 0, elapsed: 0,
            measured: false, cycling: false, needsReset: false, near: false,
            layoutTop: 0, width: canvasWidth, height: canvasHeight
        };

        shapes.forEach((shape, i) => {
            gsap.set(shape, { ...initial[i], x: 0, y: 0 });
            cycle.to(shape, {
                ...initial[i], ...icons[figureIndex][i],
                duration: 1.25, ease: 'power3.inOut'
            }, iconStart + i * .035);
            cycle.to(shape, {
                ...initial[i], duration: 1.15, ease: 'power2.inOut'
            }, abstractStart + i * .025);
        });

        // Keep a quiet abstract hold at the end of each icon cycle.
        const clock = { time: 0 };
        const cycleDuration = abstractEnd + 2.4;
        cycle.to(clock, { time: cycleDuration, duration: cycleDuration, ease: 'none' }, 0);
        return figure;
    });

    const section = document.getElementById('services');
    const header = document.querySelector('.header');
    const viewportProbe = document.createElement('div');
    viewportProbe.className = 'why-viewport-probe';
    viewportProbe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(viewportProbe);
    let viewportWidth = 0;
    let viewportHeight = 0;
    let topInset = 0;
    let layoutDirty = true;
    let running = false;

    function measureLayout() {
        viewportWidth = document.documentElement.clientWidth;
        // 100svh stays constant when a mobile browser hides its address bar.
        // Using innerHeight here caused the scatter targets to jump mid-swipe.
        viewportHeight = viewportProbe.offsetHeight || window.innerHeight;
        topInset = header ? Math.min(header.offsetHeight, viewportHeight * .25) : 0;
        figures.forEach(figure => {
            // Layout coordinates exclude all reveal/animation transforms.
            // Read once on reflow, not from moving geometry on every scroll.
            let top = 0;
            for (let element = figure.container; element && element !== document.body; element = element.offsetParent) top += element.offsetTop;
            figure.layoutTop = top;
            const style = getComputedStyle(figure.container);
            figure.width = parseFloat(style.width);
            figure.height = parseFloat(style.height);
        });
        layoutDirty = false;
    }

    function setCycleActivity(figure, play, reset) {
        if (reset && figure.needsReset) {
            figure.cycle.pause(0);
            figure.cycling = false;
            figure.needsReset = false;
        }
        if (play !== figure.cycling) {
            figure.cycle.paused(!play);
            figure.cycling = play;
        }
        if (play) figure.needsReset = true;
    }

    // One clock owns all scroll movement. Geometry, drift and scroll each
    // have a separate DOM layer; no restarting or competing transform tweens.
    function renderFrame(_time, deltaMs = 16.67) {
        if (layoutDirty) measureLayout();
        const dt = Math.min(.05, Math.max(.001, deltaMs / 1000));
        const blend = 1 - Math.exp(-dt / .14);
        const scrollY = window.scrollY;
        const usableHeight = Math.max(1, viewportHeight - topInset);
        const upperBand = topInset + usableHeight * .3;
        const lowerBand = topInset + usableHeight * .7;
        const edgeDistance = usableHeight * .3;
        const fringe = usableHeight * .15;
        const readingCenter = topInset + usableHeight * .5;
        const rowDistances = figures.map(figure => Math.abs(figure.layoutTop + figure.height / 2 - scrollY - readingCenter));
        const closestRow = Math.min(...rowDistances);
        let keepRunning = false;

        figures.forEach((figure, figureIndex) => {
            const top = figure.layoutTop - scrollY;
            const bottom = top + figure.height;
            // Fade distant rows completely, preventing the next mobile card
            // from throwing its fragments through the card being read.
            const visibility = motion.matches ? 1 : Math.min(
                smoothStep((bottom - topInset + fringe) / fringe),
                smoothStep((viewportHeight + fringe - top) / fringe)
            );
            const near = visibility > 0 && !document.hidden;
            // On stacked layouts, distant rows must not project faint flying
            // fragments over the row being read. The weighting is continuous
            // across direction changes and equal for figures on the same row.
            const rowFocus = 1 - smoothStep((rowDistances[figureIndex] - closestRow) / (usableHeight * .25));
            const target = motion.matches ? 0 : smoothStep(Math.max(
                (top - lowerBand) / edgeDistance,
                (upperBand - bottom) / edgeDistance
            ));
            if (!figure.measured || !near || motion.matches) figure.scatter = target;
            else figure.scatter += (target - figure.scatter) * blend;
            if (Math.abs(target - figure.scatter) < .0001) figure.scatter = target;
            figure.measured = true;

            // Hold the current shape while scrolling. Reset only once it is
            // invisible, so a direction reversal never swaps geometry midair.
            const play = near && !motion.matches && target === 0 && figure.scatter < .008;
            setCycleActivity(figure, play, !near || motion.matches);
            if (near && !motion.matches) {
                keepRunning = true;
                figure.elapsed += dt;
            }

            const localTime = figure.cycle.time();
            let freedom = 0;
            if (localTime < figure.iconStart + .7) {
                freedom = 1 - smoothStep((localTime - figure.iconStart) / .7);
            } else if (localTime > figure.abstractEnd) {
                freedom = smoothStep((localTime - figure.abstractEnd) / .7);
            }
            const driftTarget = motion.matches ? 0 : Math.max(freedom, figure.scatter);
            figure.drift += (driftTarget - figure.drift) * blend;
            const amplitude = motion.matches ? 0 : figure.drift
                * smoothStep(figure.elapsed / .75) * figure.width / 100;

            const wasNear = figure.near;
            if (near !== wasNear) {
                figure.fragments.forEach(fragment => {
                    fragment.style.willChange = near && !motion.matches ? 'transform, opacity' : 'auto';
                });
                figure.near = near;
            }
            // Hidden rows need no per-frame style writes on a small screen.
            if (!near && !wasNear && figure.rendered && !motion.matches) return;
            figure.fragments.forEach((fragment, i) => {
                const angle = i * 2.399963 + figure.figureIndex * .7;
                const travel = .65 + i % 5 * .18;
                const progress = figure.scatter;
                const x = Math.cos(angle) * viewportWidth * .65 * travel * progress;
                const y = Math.sin(angle) * usableHeight * .9 * travel * progress;
                const rotation = (i % 2 ? -1 : 1) * (180 + i * 45) * progress;
                fragment.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) rotate(${rotation.toFixed(3)}deg) scale(${1 - progress * .15})`;
                fragment.style.opacity = visibility * (1 - progress * .9)
                    * (1 - smoothStep(progress / .25) * (1 - rowFocus));
                const phase = 1 + figure.figureIndex * 11 + i * 3.7;
                const dx = amplitude * (Math.sin(figure.elapsed * .86 + phase) * 2.1
                    + Math.sin(figure.elapsed * 1.31 + phase * .7) * .9);
                const dy = amplitude * (Math.cos(figure.elapsed * .71 + phase * .91) * 1.8
                    + Math.sin(figure.elapsed * 1.17 + phase) * .8);
                figure.driftLayers[i].style.transform = `translate3d(${dx.toFixed(3)}px, ${dy.toFixed(3)}px, 0)`;
            });
            figure.rendered = true;
        });
        if (!keepRunning) {
            gsap.ticker.remove(renderFrame);
            running = false;
        }
    }

    function suspend() {
        figures.forEach(figure => setCycleActivity(figure, false, false));
        gsap.ticker.remove(renderFrame);
        running = false;
    }
    function wake(needsLayout = false) {
        if (needsLayout) layoutDirty = true;
        if (document.hidden || document.body.matches('.popup-open, .consent-modal-open')) {
            suspend();
            return;
        }
        if (running) return;
        running = true;
        gsap.ticker.add(renderFrame);
    }
    window.addEventListener('scroll', () => wake(), { passive: true });
    window.addEventListener('resize', () => wake(true));
    window.addEventListener('load', () => wake(true));
    if (document.fonts) document.fonts.ready.then(() => wake(true));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => wake(true));
    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(() => wake(true));
        [document.body, section, header, ...containers].filter(Boolean).forEach(element => observer.observe(element));
    }
    const scrollLockObserver = new MutationObserver(() => wake(true));
    scrollLockObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) suspend();
        else wake(true);
    });
    const updateMotion = () => wake(true);
    if (motion.addEventListener) motion.addEventListener('change', updateMotion);
    else motion.addListener(updateMotion);
    renderFrame(0);
    wake();
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
function toggleDirectorBiography(contentId, buttonId, labelKey) {
    const content = document.getElementById(contentId);
    const button = document.getElementById(buttonId);
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    content.style.display = expanded ? 'block' : 'none';
    button.setAttribute('aria-expanded', String(expanded));
    button.querySelector('.leadership-more-label').textContent = expanded
        ? (currentLng === 'en' ? 'Collapse' : 'Свернуть')
        : langList[labelKey][currentLng];
}

function changeReadMore2() {
    toggleDirectorBiography('mybox2id', 'mybuttonid2', 'director-1-btn-more');
}

function changeReadMore3() {
    toggleDirectorBiography('mybox3id', 'mybuttonid3', 'director-2-btn-more');
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

// Both forms use the Worker's supported URL-encoded contract. This is a
// browser-simple request, avoiding the extra JSON CORS preflight round trip.
// Keep enough time for mobile connections and require a real HTTP response.
async function postTelegramFeedback(payload) {
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 15000);
    const body = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
        if (typeof value === 'string') body.append(key, value);
    });
    try {
        return await fetch(FEEDBACK_API, {
            method: 'POST',
            body,
            signal: controller.signal,
            keepalive: true
        });
    } finally {
        clearTimeout(abortTimer);
    }
}

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
        const response = await postTelegramFeedback({ name, phone, message: comment, website });

        if (response.ok) {
            await showSuccess();
        } else {
            // A response did come back and it was an error — trust it.
            throw new Error(response.statusText);
        }
    } catch (error) {
        console.error(error);
        // Network failures cannot establish acceptance. Preserve the form
        // rather than erasing the visitor's details and claiming success.
        formSendResult.textContent = langList['estimate-error'][currentLng];
        formSendResult.classList.add('is-error');
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
            const label = button.querySelector('.lng-about-btn, .leadership-more-label') || button;
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
