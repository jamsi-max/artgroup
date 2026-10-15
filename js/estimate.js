// Preliminary estimates use the same Worker and Telegram route as contact
// requests. Property details are formatted into its existing message field,
// so the live endpoint needs no new fields or backend deployment.
(() => {
    const dialog = document.getElementById('estimate-dialog');
    const trigger = document.getElementById('estimate-open');
    const form = document.getElementById('estimate-form');
    if (!dialog || !trigger || !form) return;

    const submit = form.querySelector('.estimate-submit');
    const submitLabel = submit.querySelector('span');
    const error = form.querySelector('.estimate-error');
    const success = dialog.querySelector('.estimate-success');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let submitting = false;
    let submitted = false;
    let closing = false;
    let closeTimer;
    let backdropPressed = false;

    function text(key) {
        const language = document.documentElement.lang === 'en' ? 'en' : 'ru';
        return langList[`estimate-${key}`][language];
    }

    function open() {
        if (dialog.open) return;
        if (submitted) {
            form.reset();
            form.hidden = false;
            success.hidden = true;
            dialog.classList.remove('is-success');
            submitted = false;
        }
        error.hidden = true;
        dialog.classList.remove('is-closing');
        closing = false;
        dialog.querySelector('.estimate-close').setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Close' : 'Закрыть');
        dialog.showModal();
        if (typeof lockPageScroll === 'function') lockPageScroll();
        trigger.setAttribute('aria-expanded', 'true');
        dialog.querySelector('.estimate-body').scrollTop = 0;
    }

    function finishClose() {
        clearTimeout(closeTimer);
        dialog.close();
    }

    function close() {
        if (!dialog.open || closing) return;
        closing = true;
        dialog.classList.add('is-closing');
        if (motion.matches) finishClose();
        else closeTimer = setTimeout(finishClose, 220);
    }

    trigger.addEventListener('click', open);
    dialog.querySelectorAll('[data-estimate-close]').forEach(button => {
        button.addEventListener('click', close);
    });
    dialog.addEventListener('cancel', event => {
        event.preventDefault();
        close();
    });
    dialog.addEventListener('close', () => {
        clearTimeout(closeTimer);
        dialog.classList.remove('is-closing');
        closing = false;
        trigger.setAttribute('aria-expanded', 'false');
        if (typeof unlockPageScroll === 'function') unlockPageScroll();
        trigger.focus({ preventScroll: true });
    });
    function outsidePanel(event) {
        const bounds = dialog.getBoundingClientRect();
        return event.clientX < bounds.left || event.clientX > bounds.right
            || event.clientY < bounds.top || event.clientY > bounds.bottom;
    }
    dialog.addEventListener('pointerdown', event => {
        backdropPressed = event.target === dialog && outsidePanel(event);
    });
    dialog.addEventListener('click', event => {
        if (backdropPressed && event.target === dialog && outsidePanel(event)) close();
        backdropPressed = false;
    });

    function messageFor(data) {
        // Keep bot labels consistent for the team, regardless of site language.
        const propertyLabels = {
            land: 'Земельный участок', building: 'Здание',
            unfinished: 'Объект незавершённого строительства',
            completed: 'Готовый проект', investment: 'Инвестиционный проект'
        };
        const lines = ['Запрос предварительной оценки', '', 'Комментарий:', data.get('comment').trim()];
        const types = data.getAll('property_types').map(value => propertyLabels[value]).filter(Boolean);
        if (types.length) lines.push('', 'Объекты в наличии:', ...types.map(label => `• ${label}`));
        const address = data.get('property_address').trim();
        const area = data.get('plot_area').trim();
        const plans = data.get('plans').trim();
        if (address) lines.push('', `Адрес объекта: ${address}`);
        if (area) lines.push('', `Площадь участка: ${area} м²`);
        if (plans) lines.push('', 'Планы:', plans);
        return lines.join('\n');
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submitting || submitted) return;
        // Read before disabling fieldsets: disabled controls are omitted from
        // FormData. getAll preserves every selected checkbox, not just one.
        const data = new FormData(form);
        const name = data.get('name').trim();
        const phone = data.get('phone').trim();
        if (!name || !phone || !data.get('comment').trim()) {
            const empty = ['name', 'phone', 'comment'].find(key => !data.get(key).trim());
            const field = form.elements.namedItem(empty);
            field.setCustomValidity(document.documentElement.lang === 'en' ? 'Please complete this field.' : 'Заполните это поле.');
            field.reportValidity();
            field.addEventListener('input', () => field.setCustomValidity(''), { once: true });
            return;
        }

        submitting = true;
        error.hidden = true;
        submit.disabled = true;
        submit.classList.add('is-loading');
        submitLabel.textContent = text('sending');
        form.setAttribute('aria-busy', 'true');
        const fieldsets = form.querySelectorAll(':scope > .estimate-body > fieldset');
        fieldsets.forEach(fieldset => { fieldset.disabled = true; });
        try {
            const response = await postTelegramFeedback({
                name, phone, message: messageFor(data), website: data.get('website') || ''
            });
            if (!response.ok) throw new Error(response.statusText);
            submitted = true;
            form.hidden = true;
            success.hidden = false;
            dialog.classList.add('is-success');
            if (dialog.open && !closing) success.focus({ preventScroll: true });
        } catch (failure) {
            console.error('Estimate submission failed:', failure);
            // A timeout is not proof of acceptance. Keep the completed form
            // available and show confirmation only after the Worker accepts it.
            error.textContent = text('error');
            error.hidden = false;
            if (dialog.open && !closing) error.scrollIntoView({ block: 'nearest', behavior: motion.matches ? 'auto' : 'smooth' });
        } finally {
            submitting = false;
            submit.disabled = false;
            submit.classList.remove('is-loading');
            submitLabel.textContent = text('submit');
            form.removeAttribute('aria-busy');
            fieldsets.forEach(fieldset => { fieldset.disabled = false; });
        }
    });
})();
