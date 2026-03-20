const canvas = document.getElementById('particleCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

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
  if (!canvas) return;
  particles = [];
  const count = Math.floor(window.innerWidth * window.innerHeight / 10000);
  for (let i = 0; i < count; i += 1) {
    particles.push(new Particle());
  }
}

function animateParticles() {
  if (!ctx || !canvas) return;
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
  particles.forEach((particle) => {
    particle.update();
    particle.draw();
  });
  requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', (event) => {
  mouseX = event.x;
  mouseY = event.y;
});
resizeCanvas();
initParticles();
animateParticles();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('appear');
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el));

const CONFIG = window.DIGITAL_LIFE_CONFIG || {};
const CONTROL_PLANE_BASE_URL = String(CONFIG.controlPlaneBaseUrl || '').trim().replace(/\/+$/, '');
const MANUAL_CONTACT_WECHAT = String(CONFIG.manualSchedulingWechat || 'q517754526').trim();
const MANUAL_CONTACT_QQ = String(CONFIG.manualSchedulingQq || '517754526').trim();
const PAID_CONTACT_EMAIL = String(CONFIG.paidContactEmail || 'sukebeta@outlook.com').trim();
const STORAGE_KEY = 'amberify_web_demo_session_v1';

const applyForm = document.getElementById('applyForm');
const applyBtn = document.getElementById('applyBtn');
const applyBtnText = document.getElementById('applyBtnText');
const uidBox = document.getElementById('uidBox');
const phaseChip = document.getElementById('phaseChip');
const turnChip = document.getElementById('turnChip');
const voiceChip = document.getElementById('voiceChip');
const statusHint = document.getElementById('statusHint');
const photoInput = document.getElementById('photoInput');
const photoBtn = document.getElementById('photoBtn');
const photoState = document.getElementById('photoState');
const audioInput = document.getElementById('audioInput');
const audioBtn = document.getElementById('audioBtn');
const skipAudioBtn = document.getElementById('skipAudioBtn');
const recordBtn = document.getElementById('recordBtn');
const recordPreview = document.getElementById('recordPreview');
const audioState = document.getElementById('audioState');
const refreshBtn = document.getElementById('refreshBtn');
const resetSessionBtn = document.getElementById('resetSessionBtn');
const chatBox = document.getElementById('chatBox');
const inlineState = document.getElementById('inlineState');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const sendBtnText = document.getElementById('sendBtnText');
const reuseLastBtn = document.getElementById('reuseLastBtn');
const paywallPanel = document.getElementById('paywallPanel');

const state = {
  uid: '',
  clientToken: '',
  webDemo: null,
  lastUserMessage: '',
  seenTaskIds: new Set(),
  pollTimer: null,
  mediaRecorder: null,
  mediaChunks: []
};

function htmlSafe(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function saveSession() {
  if (!state.uid || !state.clientToken) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    uid: state.uid,
    clientToken: state.clientToken
  }));
}

function clearSessionStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadSession() {
  const params = new URLSearchParams(window.location.search);
  const rawUid = String(params.get('uid') || '').trim();
  const rawToken = String(params.get('clientToken') || '').trim();
  if (rawUid && rawToken) {
    state.uid = rawUid;
    state.clientToken = rawToken;
    saveSession();
    return;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.uid = String(parsed.uid || '').trim();
    state.clientToken = String(parsed.clientToken || '').trim();
  } catch {
    clearSessionStorage();
  }
}

function withToken(url) {
  const token = encodeURIComponent(state.clientToken || '');
  const uid = encodeURIComponent(state.uid || '');
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}uid=${uid}&clientToken=${token}`;
}

function phaseLabel(phase = '') {
  const map = {
    discovery: '建档采集',
    asset_intake: '等待素材',
    ready_to_boot: '准备启动',
    locking: '正在唤醒',
    live: '已进入 live'
  };
  return map[String(phase || '').trim()] || '未开始';
}

function buildStatusHint(webDemo = null) {
  if (!webDemo) return '先填写左侧表单，系统会为这次体验分配 UID 和会话令牌。';
  const phase = String(webDemo.phase || '');
  if (webDemo.paywallLocked) {
    return `试用已结束。继续体验请添加微信 ${MANUAL_CONTACT_WECHAT} 或邮件联系 ${PAID_CONTACT_EMAIL}。`;
  }
  if (phase === 'discovery') {
    return '继续用自然语言描述 TA。你可以像聊天一样补充 TA 是谁、怎么说话、你们之间的记忆。';
  }
  if (phase === 'asset_intake') {
    return '现在最关键的是一张正面照。音频不是必需，但有的话会更像 TA。';
  }
  if (phase === 'ready_to_boot') {
    return '资料已经够了，系统会自动把 TA 启动起来。';
  }
  if (phase === 'locking') {
    return '系统正在把 TA 固定到同一条时间线上，再等一会儿就能直接对话。';
  }
  if (phase === 'live') {
    return '已经进入 live。此后你的每一次用户发言都会消耗试用额度。';
  }
  return '你可以继续说话，也可以补充照片和音频。';
}

function setInlineState(text) {
  inlineState.textContent = text || '';
}

function setBusy(button, labelNode, busyText, busy) {
  if (button) button.disabled = Boolean(busy);
  if (labelNode && busyText) {
    if (busy) {
      labelNode.dataset.original = labelNode.textContent;
      labelNode.textContent = busyText;
    } else if (labelNode.dataset.original) {
      labelNode.textContent = labelNode.dataset.original;
      delete labelNode.dataset.original;
    }
  }
}

async function apiRequest(path, options = {}) {
  if (!CONTROL_PLANE_BASE_URL) {
    throw new Error('controlPlaneBaseUrl missing');
  }
  const method = options.method || 'GET';
  const headers = {
    ...(options.headers || {})
  };
  if (state.clientToken) {
    headers['x-web-demo-token'] = state.clientToken;
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${CONTROL_PLANE_BASE_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || `request_failed:${response.status}`;
    throw new Error(message);
  }
  return data;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });
}

function buildMediaHtml(task) {
  if (!task || !task.asset || !task.asset.url) return '';
  const url = withToken(task.asset.url);
  const kind = String(task.asset.kind || '').trim();
  if (kind === 'photo') {
    return `<div class="media-card"><img src="${htmlSafe(url)}" alt="generated photo"><div class="media-label">图片回传</div></div>`;
  }
  if (kind === 'video') {
    return `<div class="media-card"><video src="${htmlSafe(url)}" controls playsinline></video><div class="media-label">视频回传</div></div>`;
  }
  if (kind === 'voice' || kind === 'audio' || kind === 'ambient') {
    return `<div class="media-card"><audio src="${htmlSafe(url)}" controls></audio><div class="media-label">音频回传</div></div>`;
  }
  return '';
}

function renderChat(webDemo = null) {
  const fallback = `
    <div class="message system">
      <div class="bubble">
        这里会显示建档、启动、对话、图片、语音和视频结果。
        <span class="bubble-meta">创建体验后，系统会从自然建档开始。</span>
      </div>
    </div>
  `;
  if (!webDemo) {
    chatBox.innerHTML = fallback;
    return;
  }

  const messages = Array.isArray(webDemo.recentMessages) ? webDemo.recentMessages : [];
  const tasks = Array.isArray(webDemo.pendingMediaTasks) ? webDemo.pendingMediaTasks : [];
  const doneTasks = tasks.filter((task) => String(task.status || '') === 'done' && task.asset && task.asset.url);

  let html = '';
  messages.forEach((message) => {
    const role = String(message.role || 'assistant').trim();
    const cls = role === 'user' ? 'user' : 'assistant';
    const metaParts = [];
    if (message.intent) metaParts.push(message.intent);
    if (message.location) metaParts.push(message.location);
    if (message.at) metaParts.push(new Date(message.at).toLocaleString('zh-CN'));
    html += `
      <div class="message ${cls}">
        <div class="bubble">
          ${htmlSafe(message.text || '')}
          ${metaParts.length ? `<span class="bubble-meta">${htmlSafe(metaParts.join(' · '))}</span>` : ''}
        </div>
      </div>
    `;
  });

  doneTasks.forEach((task) => {
    html += `
      <div class="message system">
        <div class="bubble">
          多模态结果已回传：${htmlSafe(task.intent || 'media')}
          <span class="bubble-meta">${htmlSafe(String(task.updatedAt || ''))}</span>
          ${buildMediaHtml(task)}
        </div>
      </div>
    `;
  });

  if (!html) {
    html = fallback;
  }
  chatBox.innerHTML = html;
  chatBox.scrollTop = chatBox.scrollHeight;
}

function renderWebDemo(webDemo = null) {
  state.webDemo = webDemo;
  uidBox.textContent = state.uid || '尚未建立 UID';
  phaseChip.textContent = `阶段：${phaseLabel(webDemo?.phase || '')}`;
  turnChip.textContent = `剩余次数：${webDemo ? webDemo.remainingTurns : '--'}`;
  voiceChip.textContent = `声线：${webDemo?.voiceMode === 'cloned' ? '音色已克隆' : '默认映射'}`;
  statusHint.textContent = buildStatusHint(webDemo);
  paywallPanel.style.display = webDemo?.paywallLocked ? 'block' : 'none';
  photoState.textContent = webDemo?.onboarding?.assets?.hasPhoto
    ? `照片已就绪（${webDemo.onboarding.assets.photoCount} 张）`
    : '尚未上传照片';
  audioState.textContent = webDemo?.onboarding?.assets?.hasAudio
    ? `音频已就绪（${webDemo.onboarding.assets.audioCount} 条）`
    : '未提供音频时，系统会先按画像匹配默认声线。';
  renderChat(webDemo);

  const locked = Boolean(webDemo?.paywallLocked);
  sendBtn.disabled = locked || !state.uid || !state.clientToken;
  messageInput.disabled = locked || !state.uid || !state.clientToken;
}

async function refreshSession() {
  if (!state.uid || !state.clientToken) {
    renderWebDemo(null);
    return;
  }
  const data = await apiRequest(`/api/web-demo/session/${encodeURIComponent(state.uid)}`);
  renderWebDemo(data.webDemo || null);
}

function startPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
  }
  state.pollTimer = setInterval(async () => {
    try {
      await refreshSession();
    } catch (error) {
      setInlineState(`同步失败：${error.message}`);
    }
  }, 4000);
}

async function handleApply(event) {
  event.preventDefault();
  setBusy(applyBtn, applyBtnText, '正在创建体验会话...', true);
  setInlineState('正在创建体验会话...');
  try {
    const payload = {
      planType: 'trial',
      applicant: document.getElementById('applicant').value.trim(),
      subject: document.getElementById('subject').value.trim(),
      relation: document.getElementById('relation').value.trim(),
      role: document.getElementById('role').value.trim(),
      soul: document.getElementById('soul').value.trim(),
      sharedMemory: document.getElementById('sharedMemory').value.trim(),
      currentWish: document.getElementById('currentWish').value.trim(),
      preferredCall: document.getElementById('preferredCall').value.trim(),
      message: document.getElementById('message').value.trim(),
      source: 'lifeview-web-demo'
    };
    const data = await apiRequest('/api/web-demo/apply', {
      method: 'POST',
      body: payload
    });
    state.uid = data.uid;
    state.clientToken = data.clientToken;
    saveSession();
    renderWebDemo(data.webDemo || null);
    setInlineState('体验会话已建立。现在可以继续补充信息，或直接上传照片启动。');
    startPolling();
  } catch (error) {
    setInlineState(`创建失败：${error.message}`);
  } finally {
    setBusy(applyBtn, applyBtnText, '', false);
  }
}

async function handleSendMessage(textOverride = '') {
  if (!state.uid || !state.clientToken) {
    setInlineState('请先创建体验会话。');
    return;
  }
  const text = String(textOverride || messageInput.value || '').trim();
  if (!text) {
    setInlineState('请先输入要发送的内容。');
    return;
  }
  state.lastUserMessage = text;
  setBusy(sendBtn, sendBtnText, '发送中...', true);
  setInlineState('消息已送出，正在等待回复...');
  try {
    const data = await apiRequest(`/api/web-demo/session/${encodeURIComponent(state.uid)}/message`, {
      method: 'POST',
      body: { text }
    });
    if (data.ok === false) {
      if (data.webDemo) {
        renderWebDemo(data.webDemo);
      }
      setInlineState(data.error === 'trial_limit_reached'
        ? `试用上限已到。请添加微信 ${MANUAL_CONTACT_WECHAT} 或邮件联系 ${PAID_CONTACT_EMAIL}。`
        : `消息未成功处理：${data.error || 'unknown_error'}`);
      return;
    }
    if (data.webDemo) {
      renderWebDemo(data.webDemo);
    } else {
      await refreshSession();
    }
    messageInput.value = '';
    if (data.reply && Array.isArray(data.reply.chunks) && data.reply.chunks.length) {
      setInlineState('已收到回复。若需要图片、语音或视频，系统会稍后继续回填。');
    } else {
      setInlineState('消息已处理。');
    }
  } catch (error) {
    setInlineState(`发送失败：${error.message}`);
    if (error.message === 'trial_limit_reached') {
      await refreshSession();
    }
  } finally {
    setBusy(sendBtn, sendBtnText, '', false);
  }
}

async function uploadAsset(kind, file, extra = {}) {
  if (!state.uid || !state.clientToken) {
    setInlineState('请先创建体验会话。');
    return;
  }
  const path = kind === 'photo'
    ? `/api/web-demo/session/${encodeURIComponent(state.uid)}/assets/photo`
    : `/api/web-demo/session/${encodeURIComponent(state.uid)}/assets/audio`;
  const dataUrl = await fileToDataUrl(file);
  const payload = {
    data: dataUrl,
    mimeType: file.type,
    originalName: file.name,
    ...extra
  };
  const data = await apiRequest(path, {
    method: 'POST',
    body: payload
  });
  renderWebDemo(data.webDemo || null);
  return data;
}

async function handlePhotoSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  photoState.textContent = '照片上传中...';
  setInlineState('正在上传照片...');
  try {
    await uploadAsset('photo', file);
    setInlineState('照片已上传。若文本信息已完整，系统会自动启动。');
  } catch (error) {
    photoState.textContent = `照片上传失败：${error.message}`;
    setInlineState(`照片上传失败：${error.message}`);
  } finally {
    event.target.value = '';
  }
}

async function handleAudioSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  audioState.textContent = '音频上传中...';
  setInlineState('正在上传音频...');
  try {
    await uploadAsset('audio', file);
    setInlineState('音频已上传。之后生成的语音会优先使用这段素材的音色。');
  } catch (error) {
    audioState.textContent = `音频上传失败：${error.message}`;
    setInlineState(`音频上传失败：${error.message}`);
  } finally {
    event.target.value = '';
  }
}

async function startOrStopRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    setInlineState('当前浏览器不支持录音，请直接上传音频文件。');
    return;
  }

  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaChunks = [];
    const recorder = new MediaRecorder(stream);
    state.mediaRecorder = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        state.mediaChunks.push(event.data);
      }
    };
    recorder.onstop = async () => {
      recordBtn.textContent = '浏览器录音';
      const blob = new Blob(state.mediaChunks, { type: recorder.mimeType || 'audio/webm' });
      stream.getTracks().forEach((track) => track.stop());
      if (!blob.size) {
        setInlineState('录音没有成功生成内容。');
        return;
      }
      recordPreview.src = URL.createObjectURL(blob);
      recordPreview.style.display = 'block';
      const file = new File([blob], 'recording.webm', { type: blob.type || 'audio/webm' });
      try {
        await uploadAsset('audio', file);
        setInlineState('浏览器录音已上传。');
      } catch (error) {
        setInlineState(`录音上传失败：${error.message}`);
      }
    };
    recorder.start();
    recordBtn.textContent = '停止录音并上传';
    setInlineState('正在录音，再点一次按钮就会停止并上传。');
  } catch (error) {
    setInlineState(`无法启动录音：${error.message}`);
  }
}

function wireEvents() {
  applyForm.addEventListener('submit', handleApply);
  sendBtn.addEventListener('click', () => handleSendMessage());
  messageInput.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSendMessage();
    }
  });
  reuseLastBtn.addEventListener('click', () => {
    if (state.lastUserMessage) {
      messageInput.value = state.lastUserMessage;
      handleSendMessage(state.lastUserMessage);
    }
  });
  refreshBtn.addEventListener('click', async () => {
    setInlineState('正在同步最新状态...');
    try {
      await refreshSession();
      setInlineState('同步完成。');
    } catch (error) {
      setInlineState(`同步失败：${error.message}`);
    }
  });
  resetSessionBtn.addEventListener('click', () => {
    state.uid = '';
    state.clientToken = '';
    state.webDemo = null;
    clearSessionStorage();
    renderWebDemo(null);
    setInlineState('本地会话已清除。你可以重新创建一轮体验。');
  });
  photoBtn.addEventListener('click', () => photoInput.click());
  audioBtn.addEventListener('click', () => audioInput.click());
  photoInput.addEventListener('change', handlePhotoSelect);
  audioInput.addEventListener('change', handleAudioSelect);
  skipAudioBtn.addEventListener('click', async () => {
    setInlineState('音频已跳过。系统会先按画像匹配默认声线，你可以继续聊天或直接等待启动。');
    try {
      await refreshSession();
    } catch (error) {
      setInlineState(`状态刷新失败：${error.message}`);
    }
  });
  recordBtn.addEventListener('click', startOrStopRecording);
}

async function bootstrap() {
  wireEvents();
  loadSession();
  renderWebDemo(null);
  if (state.uid && state.clientToken) {
    setInlineState('正在恢复上次体验会话...');
    try {
      await refreshSession();
      setInlineState('已恢复上次体验会话。');
      startPolling();
    } catch (error) {
      state.uid = '';
      state.clientToken = '';
      clearSessionStorage();
      renderWebDemo(null);
      setInlineState(`恢复失败：${error.message}`);
    }
  }
}

bootstrap();
