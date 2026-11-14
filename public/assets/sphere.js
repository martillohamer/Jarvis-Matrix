const canvas = document.getElementById('particle-sphere-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let lastFrameTime = 0;
let animId = null;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function initParticles() {
    particles = [];
    const count = 350;
    const radius = 130;
    for (let i = 0; i < count; i++) {
        const theta = Math.acos(1 - 2 * (i + 0.5) / count);
        const phi = Math.sqrt(count * Math.PI) * theta;
        particles.push({
            ox: radius * Math.sin(theta) * Math.cos(phi),
            oy: radius * Math.sin(theta) * Math.sin(phi),
            oz: radius * Math.cos(theta),
            x: 0, y: 0, scale: 1
        });
    }
}

function drawParticles(timestamp) {
    if (!window.isOverlayActive) return;
    if (document.hidden) {
        animId = requestAnimationFrame(drawParticles);
        return;
    }
    
    if (!lastFrameTime) lastFrameTime = timestamp;
    lastFrameTime = timestamp;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const time = timestamp * 0.001;
    const cx = canvas.width / (2 * dpr);
    const cy = canvas.height / (2 * dpr);
    const cos = Math.cos(time);
    const sin = Math.sin(time);
    
    particles.forEach(p => {
        // Rotación 3D simplificada
        const x1 = p.ox * cos - p.oz * sin;
        const z1 = p.ox * sin + p.oz * cos;
        const y1 = p.oy;
        
        const scale = 300 / (300 + z1);
        p.x = (x1 * scale + cx) * dpr;
        p.y = (y1 * scale + cy) * dpr;
        p.scale = scale;
        
        ctx.fillStyle = window.kittMode === 'listening' ? '#9d4edd' : '#00e5ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, 2 * scale * dpr), 0, Math.PI * 2);
        ctx.fill();
    });
    
    animId = requestAnimationFrame(drawParticles);
}

function resizeCanvas() {
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.5;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
}

window.initCanvas = () => {
    if (animId) cancelAnimationFrame(animId);
    initParticles();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animId = requestAnimationFrame(drawParticles);
};

window.closeOverlay = () => {
    window.removeEventListener('resize', resizeCanvas);
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    lastFrameTime = 0;
    particles = [];
};
