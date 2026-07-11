// Lee desde <body> (no :root): el tema clay-theme vive en el body, así el
// plexus toma los colores claros correctos en vez de los del :root oscuro.
const cssVar = (name) =>
    getComputedStyle(document.body).getPropertyValue(name).trim();

const hexToRgbTuple = (hex) => {
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    return m
        ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`
        : '0, 0, 0';
};

const COLOR_PRIMARY = cssVar('--color-primary');
const COLOR_PRIMARY_RGB = hexToRgbTuple(COLOR_PRIMARY);
const COLOR_SECONDARY_RGB = hexToRgbTuple(cssVar('--color-secondary'));


class Particle {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > this.width) this.vx *= -1;
        if (this.y < 0 || this.y > this.height) this.vy *= -1;
    }

    draw(ctx) {
        ctx.fillStyle = COLOR_PRIMARY;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


class Plexus {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.numberOfParticles = 90;

        this.init();
        this.animate();
        this.bindEvents();
    }

    init() {
        this.resize();
        this.particles = [];
        for (let i = 0; i < this.numberOfParticles; i++) {
            this.particles.push(new Particle(this.canvas.width, this.canvas.height));
        }
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => this.init());
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update();
            this.particles[i].draw(this.ctx);

            for (let j = i; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    const opacity = 1 - (distance / 120);
                    this.ctx.strokeStyle = `rgba(${COLOR_PRIMARY_RGB}, ${opacity * 0.18})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }

            if (this.mouse.x != null) {
                const dx = this.particles[i].x - this.mouse.x;
                const dy = this.particles[i].y - this.mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.mouse.radius) {
                    const opacity = 1 - (distance / this.mouse.radius);
                    this.ctx.strokeStyle = `rgba(${COLOR_SECONDARY_RGB}, ${opacity * 0.35})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.stroke();
                }
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new Plexus('plexus-canvas');
});


// Reveal educativo: los pilares y sus mini-diagramas entran al hacer scroll.
// Solo se ocultan si marcamos .reveal-on; si algo falla, el contenido queda visible.
(() => {
    const items = document.querySelectorAll('.landing-pillar');
    if (!items.length) return;
    document.documentElement.classList.add('reveal-on');

    const revealAll = () => items.forEach((el) => el.classList.add('is-visible'));

    if (!('IntersectionObserver' in window)) { revealAll(); return; }

    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));

    // Red de seguridad: si algún pilar quedó sin revelar (observer que no dispara
    // en ciertos navegadores/estados), mostrarlo igual pasados unos segundos.
    setTimeout(revealAll, 2500);
})();


// Scroll-spy: marca en el nav la sección visible mientras se hace scroll.
(() => {
    const links = Array.from(document.querySelectorAll('.landing-nav__link'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    const byId = new Map();
    links.forEach((a) => {
        const sec = document.getElementById(a.getAttribute('href').slice(1));
        if (sec) byId.set(sec, a);
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (e.isIntersecting) {
                links.forEach((l) => l.removeAttribute('aria-current'));
                const a = byId.get(e.target);
                if (a) a.setAttribute('aria-current', 'page');
            }
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    byId.forEach((_a, sec) => io.observe(sec));
})();
