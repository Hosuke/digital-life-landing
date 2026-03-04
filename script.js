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
const seqNumber = document.getElementById('sequenceNumber');
const stripePayBtn = document.getElementById('stripePayBtn');

// TODO: 将这里的 URL 替换为您在 Stripe Dashboard 中创建的 Payment Link (Payment Links > Create)
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_YOUR_LINK_HERE";

applyForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Animate button
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 正在连接量子计算机...';
    submitBtn.style.opacity = '0.8';
    submitBtn.disabled = true;

    // Simulate process
    setTimeout(() => {
        // Generate random sequence
        const rand = Math.floor(10000 + Math.random() * 90000);
        seqNumber.textContent = `DL-2058-${rand}`;

        // Show Modal
        modal.classList.add('active');

        // Setup Stripe Button link
        if (STRIPE_PAYMENT_LINK.includes("YOUR_LINK_HERE")) {
            // Placeholder behavior if link is not set
            stripePayBtn.onclick = (e) => {
                e.preventDefault();
                alert("在此处会跳转到 Stripe 支付界面！请在 script.js 中替换实际的 Stripe Payment Link。");
            };
        } else {
            // Actual redirect behavior
            stripePayBtn.href = STRIPE_PAYMENT_LINK;
        }

        // Reset form btn
        submitBtn.innerHTML = originalText;
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
        applyForm.reset();
    }, 2000);
});

window.closeModal = () => {
    modal.classList.remove('active');
};
