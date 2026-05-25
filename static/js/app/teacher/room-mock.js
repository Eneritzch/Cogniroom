export const ROOM_DATA = {
    0: {
        name: 'Todas las salas',
        students: 187,
        questions: 592,
        pdfs: 10,
        nodes: ['1ª ley', 'Entropía', 'Cinética 2°', 'Arrhenius', 'Catálisis', 'Equilibrio'],
        icc: 0.57,
        ipc: 0.34,
        roster: [
            { name: 'Hugo Iturra',     profile: 'overconfident',  icc: 0.38, bkt: 0.42, gap: +0.42, last: 'hoy',  cells: [0.30, 0.42, 0.40, 0.55, 0.45, 0.50] },
            { name: 'Inés Quispe',     profile: 'overconfident',  icc: 0.40, bkt: 0.45, gap: +0.38, last: 'hoy',  cells: [0.35, 0.40, 0.45, 0.50, 0.42, 0.48] },
            { name: 'Andrea Molina',   profile: 'overconfident',  icc: 0.42, bkt: 0.51, gap: +0.31, last: 'hoy',  cells: [0.32, 0.41, 0.78, 0.65, 0.50, 0.72] },
            { name: 'Camila Reyes',    profile: 'underconfident', icc: 0.72, bkt: 0.78, gap: -0.22, last: 'hoy',  cells: [0.71, 0.82, 0.78, 0.69, 0.74, 0.81] },
            { name: 'Daniel Tovar',    profile: 'calibrated',     icc: 0.86, bkt: 0.62, gap: +0.04, last: '2d',   cells: [0.60, 0.62, 0.65, 0.58, 0.61, 0.66] },
            { name: 'Hugo Vargas',     profile: 'calibrated',     icc: 0.84, bkt: 0.72, gap: +0.05, last: 'hoy',  cells: [0.72, 0.68, 0.74, 0.70, 0.71, 0.70] },
            { name: 'Karla Espinoza',  profile: 'underconfident', icc: 0.77, bkt: 0.81, gap: -0.20, last: '2d',   cells: [0.78, 0.82, 0.80, 0.79, 0.78, 0.80] },
        ],
        questionBank: [
            { id: 'q1', text: '¿Por qué un sistema abierto puede intercambiar masa y energía con el entorno?',  node: '1ª ley',            source: 'manual', approved: true,  date: '2026-05-10' },
            { id: 'q2', text: 'Aplique la ecuación de Arrhenius para calcular la energía de activación.',        node: 'Arrhenius',         source: 'ai',     approved: true,  date: '2026-05-09' },
            { id: 'q3', text: '¿Bajo qué condiciones la entropía de un sistema aislado disminuye?',              node: 'Entropía',          source: 'ai',     approved: false, date: '2026-05-18' },
            { id: 'q4', text: 'Determine la constante de equilibrio Kc.',                                        node: 'Equilibrio',        source: 'ai',     approved: false, date: '2026-05-11' },
        ],
        pdfFiles: [
            { id: 'p1', name: 'Termodinamica-1.pdf',  size: '2.3 MB', date: '2026-05-01', nodes: 2, status: 'processed' },
            { id: 'p2', name: 'Cinetica-intro.pdf',   size: '1.8 MB', date: '2026-04-22', nodes: 2, status: 'processed' },
            { id: 'p3', name: 'Equilibrio-clase.pdf', size: '1.5 MB', date: '2026-04-10', nodes: 1, status: 'processed' },
        ],
    },
    1: {
        name: 'Termodinámica I · 2026·I',
        students: 84,
        questions: 312,
        pdfs: 5,
        nodes: ['1ª ley', 'Entropía', 'Cinética 2°', 'Eq. químico', 'Gibbs', 'Le Chatelier'],
        icc: 0.58,
        ipc: 0.34,
        roster: [
            { name: 'Andrea Molina',   profile: 'overconfident',  icc: 0.42, bkt: 0.51, gap: +0.31, last: 'hoy',     cells: [0.32, 0.41, 0.78, 0.65, 0.50, 0.72] },
            { name: 'Bruno Cárdenas',  profile: 'overconfident',  icc: 0.45, bkt: 0.48, gap: +0.26, last: 'ayer',    cells: [0.28, 0.39, 0.66, 0.58, 0.44, 0.61] },
            { name: 'Camila Reyes',    profile: 'underconfident', icc: 0.72, bkt: 0.78, gap: -0.22, last: 'hoy',     cells: [0.71, 0.82, 0.78, 0.69, 0.74, 0.81] },
            { name: 'Daniel Tovar',    profile: 'calibrated',     icc: 0.86, bkt: 0.62, gap: +0.04, last: '2d',      cells: [0.60, 0.62, 0.65, 0.58, 0.61, 0.66] },
            { name: 'Elena Pinto',     profile: 'underconfident', icc: 0.78, bkt: 0.70, gap: -0.18, last: 'hoy',     cells: [0.55, 0.60, 0.72, 0.68, 0.70, 0.74] },
            { name: 'Felipe Marín',    profile: 'calibrated',     icc: 0.88, bkt: 0.72, gap: +0.03, last: '3d',      cells: [0.70, 0.68, 0.75, 0.71, 0.69, 0.76] },
            { name: 'Gabriela Soto',   profile: 'overconfident',  icc: 0.39, bkt: 0.44, gap: +0.34, last: 'hoy',     cells: [0.35, 0.40, 0.55, 0.48, 0.41, 0.50] },
        ],
        questionBank: [
            { id: 'q1', text: '¿Por qué un sistema abierto puede intercambiar masa y energía con el entorno?', node: '1ª ley',     source: 'manual', approved: true,  date: '2026-05-10' },
            { id: 'q2', text: 'Calcule el trabajo realizado por un gas ideal en una expansión isotérmica.',     node: '1ª ley',     source: 'ai',     approved: true,  date: '2026-05-12' },
            { id: 'q3', text: '¿Bajo qué condiciones la entropía de un sistema aislado disminuye?',             node: 'Entropía',   source: 'ai',     approved: false, date: '2026-05-18' },
            { id: 'q4', text: 'Explique el principio de Le Chatelier ante un aumento de presión.',              node: 'Le Chatelier', source: 'manual', approved: true,  date: '2026-05-05' },
            { id: 'q5', text: 'Derive la expresión de Gibbs para una reacción a temperatura constante.',         node: 'Gibbs',      source: 'ai',     approved: false, date: '2026-05-19' },
        ],
        pdfFiles: [
            { id: 'p1', name: 'Termodinamica-1.pdf', size: '2.3 MB', date: '2026-05-01', nodes: 2, status: 'processed' },
            { id: 'p2', name: 'Entropia-clase.pdf',  size: '1.1 MB', date: '2026-05-08', nodes: 1, status: 'processed' },
            { id: 'p3', name: 'Cinetica-segundo-orden.pdf', size: '3.4 MB', date: '2026-05-14', nodes: 2, status: 'processed' },
            { id: 'p4', name: 'Gibbs-ejercicios.pdf', size: '0.8 MB', date: '2026-05-20', nodes: 1, status: 'processing' },
            { id: 'p5', name: 'LeChatelier.pdf',      size: '2.1 MB', date: '2026-05-22', nodes: 0, status: 'processing' },
        ],
    },
    2: {
        name: 'Cinética Química · 2026·I',
        students: 62,
        questions: 184,
        pdfs: 3,
        nodes: ['Orden de reacción', 'Arrhenius', 'Catálisis', 'Mecanismos'],
        icc: 0.66,
        ipc: 0.48,
        roster: [
            { name: 'Hugo Vargas',     profile: 'calibrated',     icc: 0.84, bkt: 0.72, gap: +0.05, last: 'hoy',  cells: [0.72, 0.68, 0.74, 0.70] },
            { name: 'Inés Lobo',       profile: 'overconfident',  icc: 0.51, bkt: 0.55, gap: +0.24, last: 'ayer', cells: [0.40, 0.52, 0.62, 0.58] },
            { name: 'Jorge Núñez',     profile: 'calibrated',     icc: 0.79, bkt: 0.68, gap: -0.08, last: 'hoy',  cells: [0.66, 0.70, 0.68, 0.72] },
            { name: 'Karla Espinoza',  profile: 'underconfident', icc: 0.77, bkt: 0.81, gap: -0.20, last: '2d',   cells: [0.78, 0.82, 0.80, 0.79] },
            { name: 'Luis Acosta',     profile: 'overconfident',  icc: 0.48, bkt: 0.50, gap: +0.28, last: 'hoy',  cells: [0.42, 0.48, 0.55, 0.50] },
        ],
        questionBank: [
            { id: 'q1', text: 'Determine el orden global de la reacción a partir de los datos de tabla.',         node: 'Orden de reacción', source: 'manual', approved: true,  date: '2026-05-03' },
            { id: 'q2', text: 'Aplique la ecuación de Arrhenius para calcular la energía de activación.',          node: 'Arrhenius',         source: 'ai',     approved: true,  date: '2026-05-09' },
            { id: 'q3', text: '¿En qué se diferencia la catálisis homogénea de la heterogénea?',                   node: 'Catálisis',         source: 'ai',     approved: false, date: '2026-05-17' },
        ],
        pdfFiles: [
            { id: 'p1', name: 'Cinetica-intro.pdf',   size: '1.8 MB', date: '2026-04-22', nodes: 2, status: 'processed' },
            { id: 'p2', name: 'Arrhenius-clase.pdf',  size: '0.9 MB', date: '2026-05-04', nodes: 1, status: 'processed' },
            { id: 'p3', name: 'Catalisis-resumen.pdf', size: '2.6 MB', date: '2026-05-18', nodes: 1, status: 'processed' },
        ],
    },
    3: {
        name: 'Fisicoquímica · Repaso',
        students: 41,
        questions: 96,
        pdfs: 2,
        nodes: ['Equilibrio', 'Termoquímica', 'Disoluciones'],
        icc: 0.41,
        ipc: 0.22,
        roster: [
            { name: 'María Olalla',    profile: 'overconfident',  icc: 0.38, bkt: 0.41, gap: +0.36, last: 'hoy',  cells: [0.36, 0.42, 0.40] },
            { name: 'Nicolás Paz',     profile: 'overconfident',  icc: 0.42, bkt: 0.45, gap: +0.30, last: '2d',   cells: [0.40, 0.46, 0.43] },
            { name: 'Olivia Ramos',    profile: 'calibrated',     icc: 0.82, bkt: 0.65, gap: +0.02, last: 'hoy',  cells: [0.62, 0.66, 0.64] },
            { name: 'Pedro Quirós',    profile: 'underconfident', icc: 0.70, bkt: 0.74, gap: -0.24, last: 'ayer', cells: [0.72, 0.76, 0.74] },
        ],
        questionBank: [
            { id: 'q1', text: 'Calcule el calor de reacción usando la ley de Hess para el siguiente proceso.',      node: 'Termoquímica', source: 'manual', approved: true,  date: '2026-04-15' },
            { id: 'q2', text: 'Determine la constante de equilibrio Kc a partir de las concentraciones dadas.',     node: 'Equilibrio',   source: 'ai',     approved: false, date: '2026-05-11' },
        ],
        pdfFiles: [
            { id: 'p1', name: 'Equilibrio-clase.pdf',  size: '1.5 MB', date: '2026-04-10', nodes: 1, status: 'processed' },
            { id: 'p2', name: 'Disoluciones.pdf',      size: '2.0 MB', date: '2026-04-28', nodes: 2, status: 'processed' },
        ],
    },
};


export function escapeHTML(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}


export function profileLabel(p) {
    return ({ calibrated: 'Calibrado', overconfident: 'Sobreconfiado', underconfident: 'Subconfiado' })[p] || '—';
}


export function fmt(n, digits = 2) {
    if (n == null || Number.isNaN(n)) return '—';
    return Number(n).toFixed(digits);
}


export function bindRoomChange(handler) {
    handler();
    window.addEventListener('cogniroom:roomchange', handler);
}
