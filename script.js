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


// --- Form Submission & Modal (Stripe Integration Prep) ---
const applyForm = document.getElementById('applyForm');
const modal = document.getElementById('successModal');
const submitBtn = document.getElementById('submitBtn');
const getSubmitBtnText = () => document.getElementById('submitBtnText');
const seqNumber = document.getElementById('sequenceNumber');
const stripePaymentForm = document.getElementById('stripe-payment-form');
const submitStripeBtn = document.getElementById('submitStripeBtn');

// Initialize Stripe UI
const stripe = Stripe('pk_test_YOUR_STRIPE_PUBLIC_KEY');
const elements = stripe.elements();
const cardElement = elements.create('card', {
    style: {
        base: {
            color: '#ffffff',
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            iconColor: '#00f3ff',
            '::placeholder': {
                color: '#a0b0c0'
            }
        },
        invalid: {
            color: '#ff3333',
            iconColor: '#ff3333'
        }
    }
});
cardElement.mount('#card-element');

cardElement.on('change', function (event) {
    const displayError = document.getElementById('card-errors');
    if (event.error) {
        displayError.textContent = event.error.message;
    } else {
        displayError.textContent = '';
    }
});

if (submitStripeBtn) {
    submitStripeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        submitStripeBtn.disabled = true;
        submitStripeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 加密通信连接中...';

        // Simulate creating a payment token via Stripe.js (Safe to run without a backend)
        const { token, error } = await stripe.createToken(cardElement);

        if (error) {
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = error.message;
            submitStripeBtn.disabled = false;
            submitStripeBtn.innerHTML = '<i class="fa-brands fa-stripe" style="font-size: 1.5rem; margin-right: 5px;"></i> 安全支付 $50.00';
        } else {
            // Success Demo Effect
            setTimeout(() => {
                alert('支付授权成功！您刚刚生成了一个安全的 Stripe Token: ' + token.id + '。（注：由于此页面为纯前端 GitHub Pages，此交易处于演示模式，未产生实际收费。如需真实扣款需配合后端接口。）');
                closeModal();
                submitStripeBtn.disabled = false;
                submitStripeBtn.innerHTML = '<i class="fa-brands fa-stripe" style="font-size: 1.5rem; margin-right: 5px;"></i> 安全支付 $50.00';
                cardElement.clear();
            }, 1000);
        }
    });
}

const planRadios = document.querySelectorAll('input[name="planType"]');
const trialCheckgroup = document.getElementById('trialCheckgroup');
const dataCheckgroup = document.getElementById('dataCheckgroup');
const checkoutSummary = document.getElementById('checkoutSummary');
const checkPhoto = document.getElementById('checkPhoto');
const checkVideo = document.getElementById('checkVideo');
const checkAudio = document.getElementById('checkAudio');
const checkTrialData = document.getElementById('checkTrialData');
const modalTitle = modal.querySelector('h2');
const modalDesc = modal.querySelector('.modal-desc');
let latestFullPlanContext = null;

let currentPlan = 'trial';
const PAGE_CONFIG = window.DIGITAL_LIFE_CONFIG || {};
const CONTROL_PLANE_BASE_URL = String(PAGE_CONFIG.controlPlaneBaseUrl || '').trim().replace(/\/+$/, '');
const TELEGRAM_BOT_USERNAME = String(PAGE_CONFIG.telegramBotUsername || 'splandour_550w_bot').trim();
const PREFERRED_CHANNEL = String(PAGE_CONFIG.preferredChannel || 'qq').trim().toLowerCase() || 'qq';
const QQ_BOT_NAME = String(PAGE_CONFIG.qqBotName || '珀存QQBot').trim();
const QQ_BOT_UIN = String(PAGE_CONFIG.qqBotUin || '').trim();
const MANUAL_CONTACT_WECHAT = String(PAGE_CONFIG.manualSchedulingWechat || 'q517754526').trim();
const MANUAL_CONTACT_QQ = String(PAGE_CONFIG.manualSchedulingQq || '517754526').trim();
const activationGuideContainer = document.getElementById('activationGuideContainer');

function generateFallbackUid() {
    const date = new Date();
    const y = String(date.getUTCFullYear());
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
    return `UID-AMBER-${y}${m}${d}-${suffix}`;
}

function defaultDeepLink(uid) {
    return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${uid}`;
}

function htmlSafe(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function defaultActivation(uid, qqNumber = '') {
    const handoffCommand = `${uid} /handoff`;
    const qqHint = qqNumber
        ? `请使用 QQ 号 ${qqNumber} 私聊机器人 ${QQ_BOT_NAME || '珀存QQBot'}`
        : `请先在 QQ 搜索机器人 ${QQ_BOT_NAME || '珀存QQBot'}`;
    return {
        channel: PREFERRED_CHANNEL,
        handoffCommand,
        autoHandoff: true,
        entryUrl: '',
        qq: {
            botName: QQ_BOT_NAME || '珀存QQBot',
            botUin: QQ_BOT_UIN || null,
            qqNumber: qqNumber || null
        },
        steps: [
            qqHint,
            '先自然聊几句：TA 是谁、TA 会怎么和你说话、你们最想留下哪段记忆',
            '随后机器人会继续问你要 1 张正面照和 10 秒语音，资料妥当后自动启动'
        ],
        manualFulfillment: {
            mode: 'manual_scheduling',
            automated: false,
            contact: {
                wechat: MANUAL_CONTACT_WECHAT,
                qq: MANUAL_CONTACT_QQ
            },
            message: `付费完成后请添加微信 ${MANUAL_CONTACT_WECHAT}（QQ ${MANUAL_CONTACT_QQ}）人工排期。`
        }
    };
}

function resolveActivation(applyResult, uid, qqNumber = '') {
    const serverActivation = applyResult && applyResult.activation && typeof applyResult.activation === 'object'
        ? applyResult.activation
        : null;
    if (serverActivation) {
        return {
            ...defaultActivation(uid, qqNumber),
            ...serverActivation,
            qq: {
                ...(defaultActivation(uid, qqNumber).qq || {}),
                ...((serverActivation && serverActivation.qq) || {})
            }
        };
    }
    if (applyResult && applyResult.telegramDeepLink) {
        return {
            channel: 'telegram',
            handoffCommand: `${uid} /handoff`,
            entryUrl: applyResult.telegramDeepLink,
            steps: [
                '打开 Telegram 并进入机器人会话',
                `发送口令：${uid} /handoff`,
                '发送 1 张正面照和一段 10 秒语音'
            ]
        };
    }
    return defaultActivation(uid, qqNumber);
}

function hideActivationGuide() {
    if (!activationGuideContainer) return;
    activationGuideContainer.style.display = 'none';
    activationGuideContainer.innerHTML = '';
}

function renderActivationGuide(activationInput, uid) {
    if (!activationGuideContainer) return;
    const activation = activationInput && typeof activationInput === 'object'
        ? activationInput
        : defaultActivation(uid);
    const channel = String(activation.channel || '').toLowerCase();
    const channelLabel = channel === 'telegram' ? 'Telegram' : (channel === 'feishu' ? '飞书' : 'QQ');
    const command = String(activation.handoffCommand || `${uid} /handoff`);
    const autoHandoff = activation.autoHandoff !== false;
    const steps = Array.isArray(activation.steps) && activation.steps.length
        ? activation.steps
        : autoHandoff
            ? [`打开 ${channelLabel} 机器人会话`, '先自然聊几句 TA 是谁、怎么说话、你们的记忆', '再发 1 张正面照和 10 秒语音，系统自动启动']
            : [`打开 ${channelLabel} 机器人会话`, `发送口令：${command}`, '发送 1 张正面照和一段 10 秒语音'];
    const link = String(activation.entryUrl || activation?.qq?.addFriendUrl || '').trim();
    const manual = activation && activation.manualFulfillment && typeof activation.manualFulfillment === 'object'
        ? activation.manualFulfillment
        : null;

    const stepsHtml = steps.map((item) => `<li style="margin-bottom:6px;">${htmlSafe(item)}</li>`).join('');
    const openLinkHtml = link
        ? `<a class="cta-btn m-top" href="${htmlSafe(link)}" target="_blank" rel="noopener" style="display:flex; width:100%; justify-content:center; font-size:0.95rem;">打开 ${channelLabel} 入口</a>`
        : '';
    const qqNumber = activation?.qq?.qqNumber ? `<div style="margin-top:8px; opacity:0.8;">绑定 QQ 号：${htmlSafe(activation.qq.qqNumber)}</div>` : '';
    const qqBotHint = activation?.qq?.botUin ? `<div style="margin-top:6px; opacity:0.75;">机器人 ID：${htmlSafe(activation.qq.botUin)}</div>` : '';
    const manualHtml = manual
        ? `<div style="margin-top:12px; padding:10px; border-radius:6px; border:1px dashed rgba(0,243,255,0.35); color:rgba(255,255,255,0.88);">
                <div style="font-weight:600; margin-bottom:6px;">人工排期说明</div>
                <div>${htmlSafe(manual.message || `付费后请添加微信 ${MANUAL_CONTACT_WECHAT}（QQ ${MANUAL_CONTACT_QQ}）人工排期。`)}</div>
           </div>`
        : '';

    activationGuideContainer.innerHTML = `
        <div style="padding:12px; border-radius:8px; border:1px solid var(--glass-border); background:rgba(0,0,0,0.25); text-align:left; font-size:0.92rem;">
            <div style="margin-bottom:10px;"><strong>${channelLabel} 唤醒引导</strong></div>
            <div style="margin-bottom:8px; opacity:0.9;">UID：${htmlSafe(uid)}</div>
            ${qqNumber}
            ${qqBotHint}
            <div style="margin-top:10px; display:${autoHandoff ? 'none' : 'flex'}; gap:8px; align-items:center;">
                <code id="handoffCommandText" style="flex:1; display:block; padding:8px; border-radius:6px; background:#111; border:1px solid #2a2a2a; color:var(--cyan); word-break:break-all;">${htmlSafe(command)}</code>
                <button id="copyHandoffBtn" class="cta-btn" style="white-space:nowrap; font-size:0.9rem; padding:8px 12px;">复制口令</button>
            </div>
            <ol style="margin:12px 0 0 20px; padding:0;">${stepsHtml}</ol>
            ${manualHtml}
            ${openLinkHtml}
        </div>
    `;
    activationGuideContainer.style.display = 'block';

    const copyBtn = document.getElementById('copyHandoffBtn');
    if (copyBtn) {
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(command);
                copyBtn.textContent = '已复制';
            } catch {
                copyBtn.textContent = '复制失败';
            }
            setTimeout(() => {
                copyBtn.textContent = '复制口令';
            }, 1200);
        };
    }
}

async function submitApplyOrder() {
    const taIdentity = document.getElementById('role').value.trim();
    const howToTalk = document.getElementById('soul').value.trim();
    const payload = {
        planType: currentPlan,
        applicant: document.getElementById('applicant').value.trim(),
        subject: document.getElementById('subject').value.trim(),
        relation: document.getElementById('relation').value.trim(),
        role: taIdentity,
        soul: howToTalk,
        taIdentity,
        howToTalk,
        sharedMemory: document.getElementById('sharedMemory').value.trim(),
        currentWish: document.getElementById('currentWish').value.trim(),
        preferredCall: document.getElementById('preferredCall').value.trim(),
        qqNumber: document.getElementById('qqNumber').value.trim(),
        channelPreference: PREFERRED_CHANNEL,
        message: document.getElementById('message').value.trim(),
        source: 'landing'
    };

    if (!CONTROL_PLANE_BASE_URL) {
        const uid = generateFallbackUid();
        return {
            uid,
            telegramDeepLink: defaultDeepLink(uid),
            activation: defaultActivation(uid, payload.qqNumber),
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
        activation: data.activation || null,
        statusUrl: data.statusUrl || '',
        paymentStatus: data.paymentStatus || '',
        fallback: false
    };
}

function normalizePaymentStatus(status) {
    const raw = String(status || '').trim().toLowerCase();
    if (!raw) return 'unknown';
    return raw;
}

function paymentStatusText(status) {
    const map = {
        pending: '待支付',
        paid: '已支付',
        waived: '已豁免',
        failed: '支付失败',
        refunded: '已退款',
        canceled: '已取消',
        unknown: '未知'
    };
    return map[normalizePaymentStatus(status)] || status;
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
        stripePaymentForm.parentNode.insertBefore(panel, stripePaymentForm.nextSibling);
    }
    return panel;
}

function removeFullPlanStatusPanel() {
    const panel = document.getElementById('fullPlanStatusPanel');
    if (panel) panel.remove();
}

async function refreshFullPlanPaymentState() {
    if (!latestFullPlanContext || !latestFullPlanContext.statusUrl) return;
    const panel = ensureFullPlanStatusPanel();
    const btn = panel.querySelector('#refreshPaymentBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '正在查询...';
    }

    try {
        const res = await fetch(latestFullPlanContext.statusUrl, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || 'status_query_failed');
        }
        const paymentStatus = normalizePaymentStatus(data?.order?.paymentStatus || latestFullPlanContext.paymentStatus || 'unknown');
        latestFullPlanContext.paymentStatus = paymentStatus;

        const canEnterIm = paymentStatus === 'paid' || paymentStatus === 'waived';
        panel.innerHTML = `
            <div><strong>订单状态：</strong>${paymentStatusText(paymentStatus)}</div>
            <div style="margin-top: 8px; opacity: 0.75;">UID：${latestFullPlanContext.uid}</div>
            <button id="refreshPaymentBtn" class="cta-btn m-top" style="width:100%; justify-content:center; font-size:0.95rem;">刷新支付状态</button>
        `;
        panel.querySelector('#refreshPaymentBtn').onclick = refreshFullPlanPaymentState;

        if (canEnterIm) {
            renderActivationGuide(latestFullPlanContext.activation, latestFullPlanContext.uid);
        } else {
            hideActivationGuide();
        }
    } catch (err) {
        panel.innerHTML = `
            <div><strong>订单状态查询失败</strong>：${String(err.message || err)}</div>
            <button id="refreshPaymentBtn" class="cta-btn m-top" style="width:100%; justify-content:center; font-size:0.95rem;">重试查询</button>
        `;
        panel.querySelector('#refreshPaymentBtn').onclick = refreshFullPlanPaymentState;
    }
}

// Handle plan change
planRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentPlan = e.target.value;
        if (currentPlan === 'full') {
            dataCheckgroup.style.display = 'block';
            checkoutSummary.style.display = 'block';
            trialCheckgroup.style.display = 'none';
            getSubmitBtnText().textContent = '支付定金并开始唤醒';

            checkPhoto.required = true;
            checkVideo.required = true;
            checkAudio.required = true;
            checkTrialData.required = false;
        } else {
            dataCheckgroup.style.display = 'none';
            checkoutSummary.style.display = 'none';
            trialCheckgroup.style.display = 'block';
            getSubmitBtnText().textContent = '提交并开始找回 TA';

            checkPhoto.required = false;
            checkVideo.required = false;
            checkAudio.required = false;
            checkTrialData.required = true;
        }
    });
});

// Removed dummy stripe payment link

applyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Animate button
    const originalText = getSubmitBtnText().textContent;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在为 TA 创建空间...';
    submitBtn.style.opacity = '0.8';
    submitBtn.disabled = true;

    try {
        // Keep a short animation even when backend responds very quickly
        await new Promise(resolve => setTimeout(resolve, 800));
        const applyResult = await submitApplyOrder();
        const uid = applyResult.uid;
        seqNumber.textContent = uid;
        seqNumber.setAttribute('data-text', uid); // For glitch effect

        if (currentPlan === 'full') {
            modalTitle.textContent = '唤醒请求已建立';
            modalDesc.innerHTML = '请完成首月定金支付，我们就开始为 TA 建造新的家。<br>550W 算力将专属于 TA 的唤醒进程。<br><br><small style="color: rgba(255,255,255,0.5);"><i class="fa-solid fa-lock"></i> 支付由 Stripe 提供企业级安全加密保障</small>';
            stripePaymentForm.style.display = 'block';
            hideActivationGuide();
            latestFullPlanContext = {
                uid,
                statusUrl: applyResult.statusUrl || '',
                paymentStatus: normalizePaymentStatus(applyResult.paymentStatus || 'unknown'),
                telegramDeepLink: applyResult.telegramDeepLink || defaultDeepLink(uid),
                activation: resolveActivation(applyResult, uid, document.getElementById('qqNumber').value.trim())
            };
            const panel = ensureFullPlanStatusPanel();
            panel.innerHTML = `
                <div><strong>订单状态：</strong>${paymentStatusText(latestFullPlanContext.paymentStatus)}</div>
                <div style="margin-top: 8px; opacity: 0.75;">UID：${uid}</div>
                <button id="refreshPaymentBtn" class="cta-btn m-top" style="width:100%; justify-content:center; font-size:0.95rem;">刷新支付状态</button>
            `;
            panel.querySelector('#refreshPaymentBtn').onclick = refreshFullPlanPaymentState;
            if (!latestFullPlanContext.statusUrl) {
                panel.innerHTML += '<div style="margin-top: 8px; color: #ffad33;">当前为演示模式，后端状态查询不可用。</div>';
            }
            const canEnterImDirectly = latestFullPlanContext.paymentStatus === 'paid' || latestFullPlanContext.paymentStatus === 'waived';
            if (canEnterImDirectly) {
                renderActivationGuide(latestFullPlanContext.activation, uid);
            }

        } else {
            modalTitle.textContent = 'TA 的空间已创建';
            modalDesc.innerHTML = `建档已经开始。接下来 QQ 里的引导员会陪你一起确认：TA 是谁、TA 怎么说话、你们最想留下的记忆，然后再收照片与语音。<br><br>
                <div style="text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 4px; border-left: 3px solid var(--cyan); margin-top: 15px; font-size: 0.9rem;">
                    <strong>[温馨提示]</strong> 不用按格式填写，也不用重复解释。<br>
                    像平时聊天一样告诉我们 TA 的样子就好，系统会自动整理成 TA 的数字生命底稿。
                </div>`;
            stripePaymentForm.style.display = 'none';
            removeFullPlanStatusPanel();
            latestFullPlanContext = null;
            renderActivationGuide(resolveActivation(applyResult, uid, document.getElementById('qqNumber').value.trim()), uid);

            if (applyResult.fallback) {
                modalDesc.innerHTML += '<br><small style="color:#ffad33;"><i class="fa-solid fa-triangle-exclamation"></i> 当前后端不可用，已使用本地演示 UID。</small>';
            } else if (applyResult.statusUrl) {
                modalDesc.innerHTML += `<br><small style="color: rgba(255,255,255,0.65);">状态查询：${applyResult.statusUrl}</small>`;
            }
        }

        // Show Modal
        modal.classList.add('active');
        applyForm.reset();

        // Reset to default plan state
        currentPlan = 'trial';
        dataCheckgroup.style.display = 'none';
        checkoutSummary.style.display = 'none';
        trialCheckgroup.style.display = 'block';
        checkPhoto.required = false;
        checkVideo.required = false;
        checkAudio.required = false;
        checkTrialData.required = true;
    } catch (err) {
        console.error('submit apply order failed:', err);
        alert('提交失败：后端暂时不可用，请稍后重试。');
    } finally {
        // Reset form btn
        submitBtn.innerHTML = `<span class="btn-text" id="submitBtnText">${originalText}</span><i class="fa-solid fa-fingerprint"></i>`;
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
    }
});

window.closeModal = () => {
    modal.classList.remove('active');
    removeFullPlanStatusPanel();
    hideActivationGuide();
    latestFullPlanContext = null;
};
