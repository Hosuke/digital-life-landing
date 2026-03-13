// --- Particle Canvas Background ---
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.size = Math.random() * 2 + 0.5;
        this.color = Math.random() > 0.8 ? '#00f3ff' : 'rgba(0, 243, 255, 0.3)';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Mouse interaction
        let dx = mouseX - this.x;
        let dy = mouseY - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
            this.x -= dx * 0.01;
            this.y -= dy * 0.01;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    let numParticles = Math.floor(window.innerWidth * window.innerHeight / 10000);
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connecting lines
    for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 243, 255, ${0.2 - distance / 400})`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animateParticles);
}

window.addEventListener('mousemove', (e) => {
    mouseX = e.x;
    mouseY = e.y;
});

initParticles();
animateParticles();

// --- Scroll Animation ---
const observers = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('appear');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observers.observe(el));


// --- Form Submission & Modal (ModelScope + WeChat/Alipay Flow) ---
const applyForm = document.getElementById('applyForm');
const modal = document.getElementById('successModal');
const submitBtn = document.getElementById('submitBtn');
const getSubmitBtnText = () => document.getElementById('submitBtnText');
const seqNumber = document.getElementById('sequenceNumber');
const paymentFlowPanel = document.getElementById('paymentFlowPanel');
const openCheckoutBtn = document.getElementById('openCheckoutBtn');
const paymentMessage = document.getElementById('paymentMessage');
const modalPlanName = document.getElementById('modalPlanName');
const modalPaymentProvider = document.getElementById('modalPaymentProvider');
const modalAutoRenew = document.getElementById('modalAutoRenew');
const modalAmount = document.getElementById('modalAmount');
const summaryPlanPrice = document.getElementById('summaryPlanPrice');
const summaryPaymentProvider = document.getElementById('summaryPaymentProvider');
const summaryAutoRenew = document.getElementById('summaryAutoRenew');
const summaryFirstAmount = document.getElementById('summaryFirstAmount');
const planRadios = document.querySelectorAll('input[name="planType"]');
const packageRadios = document.querySelectorAll('input[name="billingPackage"]');
const paymentProviderRadios = document.querySelectorAll('input[name="paymentProvider"]');
const autoRenewAuthorized = document.getElementById('autoRenewAuthorized');
const trialCheckgroup = document.getElementById('trialCheckgroup');
const dataCheckgroup = document.getElementById('dataCheckgroup');
const checkoutSummary = document.getElementById('checkoutSummary');
const packageGroup = document.getElementById('packageGroup');
const paymentMethodGroup = document.getElementById('paymentMethodGroup');
const autoRenewGroup = document.getElementById('autoRenewGroup');
const checkPhoto = document.getElementById('checkPhoto');
const checkVideo = document.getElementById('checkVideo');
const checkAudio = document.getElementById('checkAudio');
const checkTrialData = document.getElementById('checkTrialData');
const modalTitle = modal.querySelector('h2');
const modalDesc = modal.querySelector('.modal-desc');

const BILLING_PACKAGES = {
    monthly: {
        key: 'monthly',
        planId: 'amberify-monthly',
        planType: 'monthly',
        billingCycle: 'monthly',
        displayName: 'Monthly',
        amountCents: 29900,
        currency: 'CNY'
    },
    yearly: {
        key: 'yearly',
        planId: 'amberify-yearly',
        planType: 'yearly',
        billingCycle: 'yearly',
        displayName: 'Yearly',
        amountCents: 299000,
        currency: 'CNY'
    }
};

const PAYMENT_PROVIDER_LABELS = {
    wechat: 'WeChat Pay',
    alipay: 'Alipay'
};

let latestFullPlanContext = null;
let currentPlan = 'trial';
const PAGE_CONFIG = window.DIGITAL_LIFE_CONFIG || {};
const CONTROL_PLANE_BASE_URL = String(PAGE_CONFIG.controlPlaneBaseUrl || '').trim().replace(/\/+$/, '');
const TELEGRAM_BOT_USERNAME = String(PAGE_CONFIG.telegramBotUsername || 'splandour_550w_bot').trim();
const PUBLISH_TARGET = String(PAGE_CONFIG.publishTarget || 'modelscope').trim() || 'modelscope';

function generateFallbackUid() {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `UID-550W-${rand}`;
}

function defaultDeepLink(uid) {
    return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${uid}`;
}

function toMoneyText(amountCents, currency = 'CNY') {
    const n = Number(amountCents || 0) / 100;
    const code = String(currency || '').toUpperCase() || 'CNY';
    return `${code} ${n.toFixed(2)}`;
}

function getSelectedRadioValue(name, fallback = '') {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : fallback;
}

function getSelectedPackage() {
    const key = getSelectedRadioValue('billingPackage', 'monthly');
    return BILLING_PACKAGES[key] || BILLING_PACKAGES.monthly;
}

function getSelectedPaymentProvider() {
    const key = getSelectedRadioValue('paymentProvider', 'wechat');
    return PAYMENT_PROVIDER_LABELS[key] ? key : 'wechat';
}

function updateCheckoutSummary() {
    const pkg = getSelectedPackage();
    const provider = getSelectedPaymentProvider();
    const autoRenew = Boolean(autoRenewAuthorized && autoRenewAuthorized.checked);
    if (summaryPlanPrice) {
        summaryPlanPrice.textContent = `${toMoneyText(pkg.amountCents, pkg.currency)} / ${pkg.billingCycle === 'yearly' ? 'Year' : 'Month'}`;
    }
    if (summaryFirstAmount) {
        summaryFirstAmount.textContent = toMoneyText(pkg.amountCents, pkg.currency);
    }
    if (summaryPaymentProvider) {
        summaryPaymentProvider.textContent = PAYMENT_PROVIDER_LABELS[provider] || provider;
    }
    if (summaryAutoRenew) {
        summaryAutoRenew.textContent = autoRenew ? 'Authorized' : 'Off';
    }
}

function setFullPlanVisibility(enabled) {
    const display = enabled ? 'block' : 'none';
    dataCheckgroup.style.display = display;
    checkoutSummary.style.display = display;
    packageGroup.style.display = display;
    paymentMethodGroup.style.display = display;
    autoRenewGroup.style.display = display;
    trialCheckgroup.style.display = enabled ? 'none' : 'block';
    getSubmitBtnText().textContent = enabled ? 'Submit & Create Checkout Order' : 'Submit Basic Data & Start Experience';

    checkPhoto.required = enabled;
    checkVideo.required = enabled;
    checkAudio.required = enabled;
    checkTrialData.required = !enabled;
}

function normalizePaymentStatus(status) {
    const raw = String(status || '').trim().toLowerCase();
    if (!raw) return 'unknown';
    return raw;
}

function paymentStatusText(status) {
    const map = {
        initiated: 'Initiated',
        pending: 'Pending',
        paid: 'Paid',
        waived: 'Waived',
        failed: 'Failed',
        refunded: 'Refunded',
        canceled: 'Canceled',
        expired: 'Expired',
        unknown: 'Unknown'
    };
    return map[normalizePaymentStatus(status)] || status;
}

function canEnterIm(status) {
    const normalized = normalizePaymentStatus(status);
    return normalized === 'paid' || normalized === 'waived';
}

function upsertImDeepLinkButton(href, labelText) {
    let imBtn = document.getElementById('imDeepLinkBtn');
    if (!imBtn) {
        imBtn = document.createElement('a');
        imBtn.id = 'imDeepLinkBtn';
        imBtn.className = 'cta-btn m-top';
        imBtn.style.display = 'flex';
        imBtn.style.width = '100%';
        imBtn.style.justifyContent = 'center';
        imBtn.style.fontSize = '1.1rem';
        paymentFlowPanel.parentNode.insertBefore(imBtn, paymentFlowPanel.nextSibling);
    }
    imBtn.innerHTML = '<i class="fa-brands fa-telegram" style="font-size: 1.5rem; margin-right: 10px;"></i> ' + labelText;
    imBtn.href = href;
}

function removeImDeepLinkButton() {
    const existingImBtn = document.getElementById('imDeepLinkBtn');
    if (existingImBtn) existingImBtn.remove();
}

function ensureFullPlanStatusPanel() {
    let panel = document.getElementById('fullPlanStatusPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'fullPlanStatusPanel';
        panel.style.marginTop = '12px';
        panel.style.padding = '12px';
        panel.style.borderRadius = '8px';
        panel.style.border = '1px solid var(--glass-border)';
        panel.style.background = 'rgba(0, 0, 0, 0.25)';
        panel.style.fontSize = '0.9rem';
        paymentFlowPanel.parentNode.insertBefore(panel, paymentFlowPanel.nextSibling);
    }
    return panel;
}

function removeFullPlanStatusPanel() {
    const panel = document.getElementById('fullPlanStatusPanel');
    if (panel) panel.remove();
}

function renderCheckoutFlow(context) {
    if (!context) return;
    if (modalPlanName) modalPlanName.textContent = context.packageName || 'Monthly';
    if (modalPaymentProvider) modalPaymentProvider.textContent = PAYMENT_PROVIDER_LABELS[context.paymentProvider] || context.paymentProvider;
    if (modalAutoRenew) modalAutoRenew.textContent = context.autoRenewAuthorized ? 'Authorized (pending merchant auto-deduct enablement)' : 'Off';
    if (modalAmount) modalAmount.textContent = toMoneyText(context.amountCents, context.currency || 'CNY');

    if (openCheckoutBtn) {
        if (context.checkoutUrl) {
            openCheckoutBtn.style.display = 'inline-flex';
            openCheckoutBtn.href = context.checkoutUrl;
            openCheckoutBtn.innerHTML = `<i class="fa-solid ${context.paymentProvider === 'alipay' ? 'fa-wallet' : 'fa-qrcode'}"></i> ${context.paymentProvider === 'alipay' ? 'Open Alipay Checkout' : 'Open WeChat Checkout'}`;
        } else {
            openCheckoutBtn.style.display = 'none';
            openCheckoutBtn.removeAttribute('href');
        }
    }

    if (paymentMessage) {
        const statusText = paymentStatusText(context.paymentStatus);
        paymentMessage.innerHTML = `Current payment status: <strong>${statusText}</strong>${context.checkoutMessage ? `<br>${context.checkoutMessage}` : ''}`;
    }
}

function buildBillingPayload() {
    const pkg = getSelectedPackage();
    const paymentProvider = getSelectedPaymentProvider();
    const autoRenew = Boolean(autoRenewAuthorized && autoRenewAuthorized.checked);
    return {
        planId: pkg.planId,
        planType: pkg.planType,
        billingCycle: pkg.billingCycle,
        amountCents: pkg.amountCents,
        currency: pkg.currency,
        paymentProvider,
        channel: 'h5',
        manualRenew: !autoRenew,
        metadata: {
            autoRenewAuthorized: autoRenew,
            publishTarget: PUBLISH_TARGET
        }
    };
}

async function submitApplyOrder() {
    const payload = {
        planType: currentPlan,
        applicant: document.getElementById('applicant').value.trim(),
        subject: document.getElementById('subject').value.trim(),
        relation: document.getElementById('relation').value.trim(),
        message: document.getElementById('message').value.trim(),
        source: `landing_${PUBLISH_TARGET}`
    };

    if (currentPlan === 'full') {
        payload.billing = buildBillingPayload();
    }

    if (!CONTROL_PLANE_BASE_URL) {
        const uid = generateFallbackUid();
        const fallbackBilling = payload.billing ? {
            ok: true,
            checkout: {
                mode: 'demo',
                checkoutUrl: '',
                message: 'Backend is not connected. Checkout is currently in frontend demo mode.'
            },
            payment: {
                status: 'pending'
            }
        } : null;
        return {
            uid,
            telegramDeepLink: defaultDeepLink(uid),
            statusUrl: '',
            paymentStatus: fallbackBilling ? 'pending' : '',
            billing: fallbackBilling,
            fallback: true
        };
    }

    const res = await fetch(`${CONTROL_PLANE_BASE_URL}/api/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.uid) {
        throw new Error(data.error || 'apply_failed');
    }

    return {
        uid: data.uid,
        telegramDeepLink: data.telegramDeepLink || defaultDeepLink(data.uid),
        statusUrl: data.statusUrl || '',
        paymentStatus: data.paymentStatus || '',
        billing: data.billing || null,
        fallback: false
    };
}

function extractStatusFromSnapshot(snapshot, fallback = 'unknown') {
    return normalizePaymentStatus(
        snapshot?.payment?.status
        || snapshot?.billingOrder?.status
        || snapshot?.order?.paymentStatus
        || fallback
    );
}

async function refreshFullPlanPaymentState() {
    if (!latestFullPlanContext || !latestFullPlanContext.statusUrl) return;
    const panel = ensureFullPlanStatusPanel();
    const btn = panel.querySelector('#refreshPaymentBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Querying...';
    }

    try {
        const res = await fetch(latestFullPlanContext.statusUrl, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || 'status_query_failed');
        }

        latestFullPlanContext.paymentStatus = extractStatusFromSnapshot(data, latestFullPlanContext.paymentStatus);
        if (!latestFullPlanContext.checkoutUrl) {
            latestFullPlanContext.checkoutUrl = data?.payment?.checkoutUrl || latestFullPlanContext.checkoutUrl || '';
        }
        renderCheckoutFlow(latestFullPlanContext);

        const canEnter = canEnterIm(latestFullPlanContext.paymentStatus);
        panel.innerHTML = `
            <div><strong>Order Status: </strong>${paymentStatusText(latestFullPlanContext.paymentStatus)}</div>
            <div style="margin-top: 8px; opacity: 0.75;">UID: ${latestFullPlanContext.uid}</div>
            <button id="refreshPaymentBtn" class="cta-btn m-top" style="width:100%; justify-content:center; font-size:0.95rem;">Refresh Payment Status</button>
        `;
        panel.querySelector('#refreshPaymentBtn').onclick = refreshFullPlanPaymentState;

        if (canEnter) {
            upsertImDeepLinkButton(latestFullPlanContext.telegramDeepLink, 'Payment confirmed, connect Telegram terminal');
        } else {
            removeImDeepLinkButton();
        }
    } catch (err) {
        panel.innerHTML = `
            <div><strong>Order Status Query Failed</strong>: ${String(err.message || err)}</div>
            <button id="refreshPaymentBtn" class="cta-btn m-top" style="width:100%; justify-content:center; font-size:0.95rem;">Retry Query</button>
        `;
        panel.querySelector('#refreshPaymentBtn').onclick = refreshFullPlanPaymentState;
    }
}

function resetPlanUiToTrial() {
    currentPlan = 'trial';
    const trial = document.getElementById('planTrial');
    if (trial) trial.checked = true;
    setFullPlanVisibility(false);
    if (autoRenewAuthorized) autoRenewAuthorized.checked = false;
    updateCheckoutSummary();
}

planRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
        currentPlan = e.target.value;
        setFullPlanVisibility(currentPlan === 'full');
        updateCheckoutSummary();
    });
});

packageRadios.forEach((radio) => radio.addEventListener('change', updateCheckoutSummary));
paymentProviderRadios.forEach((radio) => radio.addEventListener('change', updateCheckoutSummary));
if (autoRenewAuthorized) autoRenewAuthorized.addEventListener('change', updateCheckoutSummary);

setFullPlanVisibility(false);
updateCheckoutSummary();

applyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const originalText = getSubmitBtnText().textContent;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating application and checkout order...';
    submitBtn.style.opacity = '0.8';
    submitBtn.disabled = true;

    try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const applyResult = await submitApplyOrder();
        const uid = applyResult.uid;
        seqNumber.textContent = uid;
        seqNumber.setAttribute('data-text', uid);

        if (currentPlan === 'full') {
            const localBilling = buildBillingPayload();
            const paymentStatus = normalizePaymentStatus(
                applyResult?.billing?.payment?.status
                || applyResult?.billing?.order?.status
                || applyResult?.paymentStatus
                || 'pending'
            );
            latestFullPlanContext = {
                uid,
                statusUrl: applyResult.statusUrl || '',
                paymentStatus,
                telegramDeepLink: applyResult.telegramDeepLink || defaultDeepLink(uid),
                paymentProvider: localBilling.paymentProvider,
                packageName: getSelectedPackage().displayName,
                amountCents: localBilling.amountCents,
                currency: localBilling.currency,
                autoRenewAuthorized: Boolean(autoRenewAuthorized && autoRenewAuthorized.checked),
                checkoutUrl: applyResult?.billing?.checkout?.checkoutUrl || '',
                checkoutMessage: applyResult?.billing?.checkout?.message || (applyResult.fallback ? 'Running in frontend demo mode without backend.' : '')
            };

            modalTitle.textContent = 'Scheduling and checkout order created';
            modalDesc.innerHTML = 'Please complete first-cycle payment to activate your Digital Life compute channel.<br><small style="color: rgba(255,255,255,0.6);">Supports WeChat Pay / Alipay; auto-renew authorization intent captured.</small>';
            paymentFlowPanel.style.display = 'block';
            renderCheckoutFlow(latestFullPlanContext);
            removeImDeepLinkButton();

            const panel = ensureFullPlanStatusPanel();
            panel.innerHTML = `
                <div><strong>Order Status: </strong>${paymentStatusText(latestFullPlanContext.paymentStatus)}</div>
                <div style="margin-top: 8px; opacity: 0.75;">UID: ${uid}</div>
                <button id="refreshPaymentBtn" class="cta-btn m-top" style="width:100%; justify-content:center; font-size:0.95rem;">Refresh Payment Status</button>
            `;
            panel.querySelector('#refreshPaymentBtn').onclick = refreshFullPlanPaymentState;
            if (!latestFullPlanContext.statusUrl) {
                panel.innerHTML += '<div style="margin-top: 8px; color: #ffad33;">Backend status query unavailable. Connect API to enable refresh.</div>';
            }

            if (canEnterIm(latestFullPlanContext.paymentStatus)) {
                upsertImDeepLinkButton(latestFullPlanContext.telegramDeepLink, 'Payment confirmed, connect Telegram terminal');
            }
        } else {
            modalTitle.textContent = 'Trial archive initialized';
            modalDesc.innerHTML = `New life construction starts from UID confirmation. Your trial archive has been mounted.<br><br>
                <div style="text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 4px; border-left: 3px solid var(--cyan); margin-top: 15px; font-size: 0.9rem;">
                    <strong>[System Prompt]</strong> Verify identity via the dedicated comm link and upload source media.
                </div>`;
            paymentFlowPanel.style.display = 'none';
            removeFullPlanStatusPanel();
            latestFullPlanContext = null;

            const deepLinkUrl = applyResult.telegramDeepLink || defaultDeepLink(uid);
            upsertImDeepLinkButton(deepLinkUrl, 'Connect Telegram Awakening Terminal');
            if (applyResult.fallback) {
                modalDesc.innerHTML += '<br><small style="color:#ffad33;"><i class="fa-solid fa-triangle-exclamation"></i> Backend unavailable, using local demo UID.</small>';
            } else if (applyResult.statusUrl) {
                modalDesc.innerHTML += `<br><small style="color: rgba(255,255,255,0.65);">Status Query: ${applyResult.statusUrl}</small>`;
            }
        }

        modal.classList.add('active');
        applyForm.reset();
        resetPlanUiToTrial();
    } catch (err) {
        console.error('submit apply order failed:', err);
        alert('Submission failed: backend is temporarily unavailable.');
    } finally {
        submitBtn.innerHTML = `<span class="btn-text" id="submitBtnText">${originalText}</span><i class="fa-solid fa-fingerprint"></i>`;
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
    }
});

window.closeModal = () => {
    modal.classList.remove('active');
    removeFullPlanStatusPanel();
    removeImDeepLinkButton();
    latestFullPlanContext = null;
};
