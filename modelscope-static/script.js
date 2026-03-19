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
    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
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
  const numParticles = Math.floor(window.innerWidth * window.innerHeight / 10000);
  for (let i = 0; i < numParticles; i += 1) particles.push(new Particle());
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i; j < particles.length; j += 1) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
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
  particles.forEach((p) => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
window.addEventListener('mousemove', (e) => {
  mouseX = e.x;
  mouseY = e.y;
});
initParticles();
animateParticles();

const observers = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('appear');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach((el) => observers.observe(el));

const CONFIG = window.MODELSCOPE_STATIC_CONFIG || {};
const CONTROL_PLANE_BASE_URL = String(CONFIG.controlPlaneBaseUrl || '').trim().replace(/\/+$/, '');
const PREFERRED_CHANNEL = String(CONFIG.preferredChannel || 'qq').trim().toLowerCase();
const QQ_BOT_NAME = String(CONFIG.qqBotName || '珀存QQBot').trim();
const QQ_BOT_UIN = String(CONFIG.qqBotUin || '').trim();
const PAID_CONTACT_EMAIL = String(CONFIG.paidContactEmail || 'sukebeta@outlook.com').trim();
const MANUAL_CONTACT_WECHAT = String(CONFIG.manualSchedulingWechat || 'q517754526').trim();
const MANUAL_CONTACT_QQ = String(CONFIG.manualSchedulingQq || '517754526').trim();

const applyForm = document.getElementById('applyForm');
const modal = document.getElementById('resultModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const activationGuideContainer = document.getElementById('activationGuideContainer');
const sequenceNumber = document.getElementById('sequenceNumber');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const planRadios = document.querySelectorAll('input[name="planType"]');
const fullOnly = document.querySelectorAll('.full-only');
const trialOnly = document.querySelectorAll('.trial-only');
let currentPlan = 'trial';

function htmlSafe(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateFallbackUid() {
  const date = new Date();
  const y = String(date.getUTCFullYear());
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `UID-AMBER-${y}${m}${d}-${suffix}`;
}

function togglePlanUi() {
  const full = currentPlan === 'full';
  fullOnly.forEach((el) => { el.style.display = full ? 'block' : 'none'; });
  trialOnly.forEach((el) => { el.style.display = full ? 'none' : 'block'; });
  submitBtnText.textContent = full ? '整理邮件并联系人工排期' : '提交并开始体验';
}

planRadios.forEach((radio) => {
  radio.addEventListener('change', (event) => {
    currentPlan = event.target.value;
    togglePlanUi();
  });
});
togglePlanUi();

function defaultActivation(uid, qqNumber = '') {
  return {
    channel: PREFERRED_CHANNEL,
    qq: {
      botName: QQ_BOT_NAME,
      botUin: QQ_BOT_UIN || null,
      qqNumber: qqNumber || null
    },
    steps: [
      qqNumber ? `请使用 QQ 号 ${qqNumber} 私聊机器人 ${QQ_BOT_NAME}` : `请先在 QQ 搜索机器人 ${QQ_BOT_NAME}`,
      '先自然告诉它：TA 是谁、TA 怎么说话、你们最想留下什么记忆',
      '然后继续补 1 张照片和 10 秒语音，系统会生成专属数字生命 skill 包'
    ],
    manualFulfillment: {
      message: `如需人工协助，请添加微信 ${MANUAL_CONTACT_WECHAT}（QQ ${MANUAL_CONTACT_QQ}）。`
    }
  };
}

function renderActivationGuide(activation, uid) {
  const data = activation || defaultActivation(uid);
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const qqInfo = data.qq || {};
  const stepsHtml = steps.map((item) => `<li style="margin-bottom:6px;">${htmlSafe(item)}</li>`).join('');
  const qqNumber = qqInfo.qqNumber ? `<div style="margin-top:8px; opacity:0.8;">绑定 QQ：${htmlSafe(qqInfo.qqNumber)}</div>` : '';
  const qqBot = qqInfo.botUin ? `<div style="margin-top:6px; opacity:0.75;">机器人 ID：${htmlSafe(qqInfo.botUin)}</div>` : '';
  const manual = data.manualFulfillment ? `<div class="mailto-box">${htmlSafe(data.manualFulfillment.message || '')}</div>` : '';
  activationGuideContainer.innerHTML = `
    <div style="padding:12px; border-radius:8px; border:1px solid var(--glass-border); background:rgba(0,0,0,0.25); text-align:left; font-size:0.92rem; margin-top: 16px;">
      <div style="margin-bottom:10px;"><strong>QQ 建档引导</strong></div>
      <div style="margin-bottom:8px; opacity:0.9;">UID：${htmlSafe(uid)}</div>
      ${qqNumber}
      ${qqBot}
      <ol style="margin:12px 0 0 20px; padding:0;">${stepsHtml}</ol>
      ${manual}
    </div>`;
}

function openModal(uid, title, bodyHtml) {
  sequenceNumber.textContent = uid;
  sequenceNumber.setAttribute('data-text', uid);
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modal.classList.add('active');
}

async function submitTrial(payload) {
  if (!CONTROL_PLANE_BASE_URL) {
    return { uid: generateFallbackUid(), activation: defaultActivation(generateFallbackUid(), payload.qqNumber), fallback: true };
  }
  const res = await fetch(`${CONTROL_PLANE_BASE_URL}/api/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.uid) throw new Error(data.error || 'apply_failed');
  return { uid: data.uid, activation: data.activation || defaultActivation(data.uid, payload.qqNumber), fallback: false };
}

function buildMailtoUrl(payload) {
  const subject = `Amberify 珀存 - 完整服务申请 - ${payload.subject || payload.applicant || '未命名申请'}`;
  const lines = [
    'Amberify 珀存 - 完整服务申请',
    '',
    `申请人：${payload.applicant || ''}`,
    `联系邮箱：${payload.contactEmail || ''}`,
    `TA 的名字：${payload.subject || ''}`,
    `关系：${payload.relation || ''}`,
    `TA 是谁：${payload.role || ''}`,
    `TA 怎么说话：${payload.soul || ''}`,
    `共享记忆：${payload.sharedMemory || ''}`,
    `当前愿望：${payload.currentWish || ''}`,
    `TA 会怎么称呼我：${payload.preferredCall || ''}`,
    `体验绑定 QQ：${payload.qqNumber || ''}`,
    '',
    '我想先对 TA 说：',
    payload.message || '',
    '',
    '请联系我安排后续档案整理与排期。'
  ];
  return `mailto:${encodeURIComponent(PAID_CONTACT_EMAIL)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

applyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const originalText = submitBtnText.textContent;
  submitBtnText.textContent = currentPlan === 'full' ? '正在整理邮件...' : '正在创建体验档案...';
  submitBtn.disabled = true;

  const payload = {
    planType: currentPlan,
    applicant: document.getElementById('applicant').value.trim(),
    subject: document.getElementById('subject').value.trim(),
    relation: document.getElementById('relation').value.trim(),
    qqNumber: document.getElementById('qqNumber').value.trim(),
    role: document.getElementById('role').value.trim(),
    soul: document.getElementById('soul').value.trim(),
    sharedMemory: document.getElementById('sharedMemory').value.trim(),
    currentWish: document.getElementById('currentWish').value.trim(),
    preferredCall: document.getElementById('preferredCall').value.trim(),
    contactEmail: (document.getElementById('contactEmail') || {}).value ? document.getElementById('contactEmail').value.trim() : '',
    message: document.getElementById('message').value.trim(),
    channelPreference: PREFERRED_CHANNEL,
    source: 'modelscope-static'
  };

  try {
    if (currentPlan === 'full') {
      const uid = generateFallbackUid();
      activationGuideContainer.innerHTML = '';
      openModal(uid, '邮件草稿已准备', `
        <p>静态页不直接处理支付或排期。系统已经把你的申请整理成邮件草稿，收件人固定为 <strong>${htmlSafe(PAID_CONTACT_EMAIL)}</strong>。</p>
        <div class="mailto-box">
          <div><strong>下一步</strong></div>
          <div style="margin-top: 8px;">1. 点击下方邮件按钮</div>
          <div>2. 检查内容是否完整</div>
          <div>3. 发送后等待人工排期回复</div>
        </div>
        <a class="cta-btn m-top" href="${buildMailtoUrl(payload)}" style="margin-top:16px; justify-content:center; width:100%;">打开邮件客户端</a>
      `);
      window.location.href = buildMailtoUrl(payload);
    } else {
      const result = await submitTrial(payload);
      renderActivationGuide(result.activation, result.uid);
      openModal(result.uid, '体验档案已建立', `
        <p>体验版已经提交。接下来请去 QQ 继续建档，补 1 张清晰正面照片和 10 秒语音。</p>
        ${result.fallback ? '<p class="form-note">当前后端不可用，页面使用了演示 UID。</p>' : ''}
      `);
    }
    applyForm.reset();
    currentPlan = 'trial';
    document.querySelector('input[name="planType"][value="trial"]').checked = true;
    togglePlanUi();
  } catch (err) {
    alert(`提交失败：${String(err.message || err)}`);
  } finally {
    submitBtnText.textContent = originalText;
    submitBtn.disabled = false;
  }
});

window.closeModal = () => {
  modal.classList.remove('active');
  activationGuideContainer.innerHTML = '';
};
