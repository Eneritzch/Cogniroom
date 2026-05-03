
const cssVar = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

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
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.numberOfParticles = 100;
        this.offsetX = 0;
        this.targetOffsetX = 0;

        this.init();
        this.animate();
        this.bindEvents();
    }

    setOffset(index) {
        this.targetOffsetX = (index - 1.5) * (this.canvas.width * 0.12);
    }

    init() {
        this.resize();
        this.particles = [];
        for (let i = 0; i < this.numberOfParticles; i++) {
            this.particles.push(new Particle(this.canvas.width * 2, this.canvas.height));
        }
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    bindEvents() {
        window.addEventListener('resize', () => this.init());
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.offsetX += (this.targetOffsetX - this.offsetX) * 0.05;

        this.ctx.save();
        this.ctx.translate(-this.offsetX - (this.canvas.width * 0.25), 0);

        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].update();
            this.particles[i].draw(this.ctx);

            for (let j = i; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    const opacity = 1 - (distance / 120);
                    this.ctx.strokeStyle = `rgba(${COLOR_PRIMARY_RGB}, ${opacity * 0.15})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }

            if (this.mouse.x != null) {
                const dx = (this.particles[i].x - this.offsetX - (this.canvas.width * 0.25)) - this.mouse.x;
                const dy = this.particles[i].y - this.mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.mouse.radius) {
                    const opacity = 1 - (distance / this.mouse.radius);
                    this.ctx.strokeStyle = `rgba(${COLOR_SECONDARY_RGB}, ${opacity * 0.3})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(
                        this.mouse.x + this.offsetX + (this.canvas.width * 0.25),
                        this.mouse.y
                    );
                    this.ctx.stroke();
                }
            }
        }
        this.ctx.restore();
        requestAnimationFrame(() => this.animate());
    }
}


const pillars = [
    {
        label: 'INTRODUCCIÓN',
        title: 'Saber lo que crees saber',
        desc: 'CogniRoom utiliza Inteligencia Artificial y Bayesian Knowledge Tracing para medir tu dominio real basándose en datos científicos.',
        mainTitle: 'Saber lo que <span>crees saber</span>',
        mainSubtitle: 'Eliminando la ilusión de competencia',
    },
    {
        label: 'TECNOLOGÍA BKT',
        title: 'BKT Dinámico',
        desc: 'Rastreo de conocimiento bayesiano en tiempo real. Medimos tu probabilidad de dominio basándonos en tu historial interactivo.',
        mainTitle: 'Real-Time <span>Tracing</span>',
        mainSubtitle: 'Probabilidad de dominio real',
    },
    {
        label: 'MÉTRICA ICC',
        title: 'Índice ICC',
        desc: 'Identificamos si estás calibrado, sobreconfiado o subconfiado. Ajusta tu percepción de la realidad con datos precisos.',
        mainTitle: 'Calibrated <span>Learning</span>',
        mainSubtitle: 'Ajuste de percepción cognitiva',
    },
    {
        label: 'IA PREDICTIVA',
        title: 'Claude AI',
        desc: 'Intervenciones inteligentes que actúan justo cuando tu curva de aprendizaje decae, proporcionando explicaciones precisas.',
        mainTitle: 'Predictive <span>Insights</span>',
        mainSubtitle: 'Intervenciones inteligentes con Claude',
    },
];

let currentPillar = 0;

function selectPillar(index) {
    if (index === currentPillar) return;
    currentPillar = index;

    const card = document.querySelector('.glass-info-card');
    const mainTitle = document.getElementById('main-title');
    const mainSubtitle = document.getElementById('main-subtitle');

    card.style.opacity = '0.5';
    mainTitle.style.opacity = '0.5';

    setTimeout(() => {
        const labelEl = document.getElementById('pillar-label');
        if (labelEl) labelEl.innerText = pillars[index].label;
        document.getElementById('pillar-title').innerText = pillars[index].title;
        document.getElementById('pillar-desc').innerText = pillars[index].desc;

        mainTitle.innerHTML = pillars[index].mainTitle;
        mainSubtitle.innerText = pillars[index].mainSubtitle;

        card.style.opacity = '1';
        mainTitle.style.opacity = '1';

        document.querySelectorAll('.p-dot').forEach((dot, i) => {
            const isActive = i === index;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-selected', String(isActive));
        });
    }, 200);
}

document.addEventListener('DOMContentLoaded', () => {
    new Plexus('plexus-canvas');

    document.querySelectorAll('.p-dot[data-pillar]').forEach((dot) => {
        dot.addEventListener('click', () => {
            const index = Number(dot.dataset.pillar);
            if (Number.isInteger(index)) selectPillar(index);
        });
    });
});
