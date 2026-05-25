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
        accessCode: 'TM7A9K2B',
        createdAt: '2026-02-15',
        lastActivity: 'hoy',
        students: 84,
        questions: 312,
        pdfs: 5,
        nodes: ['1ª ley', 'Entropía', 'Cinética 2°', 'Eq. químico', 'Gibbs', 'Le Chatelier'],
        icc: 0.58,
        ipc: 0.34,
        cursos: [
            { id: 'A', name: 'Curso A · L-M-V 10:00', students: 28 },
            { id: 'B', name: 'Curso B · M-J 14:00',   students: 30 },
            { id: 'C', name: 'Curso C · V 18:00',     students: 26 },
        ],
        roster: [
            { name: 'Andrea Molina',   curso: 'A', profile: 'overconfident',  icc: 0.42, bkt: 0.51, gap: +0.31, last: 'hoy',     cells: [0.32, 0.41, 0.78, 0.65, 0.50, 0.72] },
            { name: 'Bruno Cárdenas',  curso: 'A', profile: 'overconfident',  icc: 0.45, bkt: 0.48, gap: +0.26, last: 'ayer',    cells: [0.28, 0.39, 0.66, 0.58, 0.44, 0.61] },
            { name: 'Gabriela Soto',   curso: 'A', profile: 'overconfident',  icc: 0.39, bkt: 0.44, gap: +0.34, last: 'hoy',     cells: [0.35, 0.40, 0.55, 0.48, 0.41, 0.50] },
            { name: 'Camila Reyes',    curso: 'B', profile: 'underconfident', icc: 0.72, bkt: 0.78, gap: -0.22, last: 'hoy',     cells: [0.71, 0.82, 0.78, 0.69, 0.74, 0.81] },
            { name: 'Daniel Tovar',    curso: 'B', profile: 'calibrated',     icc: 0.86, bkt: 0.62, gap: +0.04, last: '2d',      cells: [0.60, 0.62, 0.65, 0.58, 0.61, 0.66] },
            { name: 'Elena Pinto',     curso: 'C', profile: 'underconfident', icc: 0.78, bkt: 0.70, gap: -0.18, last: 'hoy',     cells: [0.55, 0.60, 0.72, 0.68, 0.70, 0.74] },
            { name: 'Felipe Marín',    curso: 'C', profile: 'calibrated',     icc: 0.88, bkt: 0.72, gap: +0.03, last: '3d',      cells: [0.70, 0.68, 0.75, 0.71, 0.69, 0.76] },
        ],
        questionBank: [
            { id: 'q1',  text: '¿Por qué un sistema abierto puede intercambiar masa y energía con el entorno?',   node: '1ª ley',     source: 'manual', approved: true,  date: '2026-05-10', uses: 47, correctPct: 62, pdf: null },
            { id: 'q2',  text: 'Calcule el trabajo realizado por un gas ideal en una expansión isotérmica.',       node: '1ª ley',     source: 'ai',     approved: true,  date: '2026-05-12', uses: 38, correctPct: 54, pdf: 'Termodinamica-1.pdf' },
            { id: 'q3',  text: '¿Bajo qué condiciones la entropía de un sistema aislado disminuye?',               node: 'Entropía',   source: 'ai',     approved: false, date: '2026-05-18', uses: 0,  correctPct: null, pdf: 'Entropia-clase.pdf' },
            { id: 'q4',  text: 'Explique el principio de Le Chatelier ante un aumento de presión.',                node: 'Le Chatelier', source: 'manual', approved: true,  date: '2026-05-05', uses: 52, correctPct: 71, pdf: null },
            { id: 'q5',  text: 'Derive la expresión de energía libre de Gibbs para una reacción a temperatura constante.', node: 'Gibbs',  source: 'ai', approved: false, date: '2026-05-19', uses: 0, correctPct: null, pdf: 'Gibbs-ejercicios.pdf' },
            { id: 'q6',  text: 'Identifique cuál de los siguientes procesos es adiabático.',                       node: '1ª ley',     source: 'manual', approved: true,  date: '2026-05-08', uses: 41, correctPct: 78, pdf: null },
            { id: 'q7',  text: 'Determine la variación de entropía en una expansión libre.',                       node: 'Entropía',   source: 'ai',     approved: true,  date: '2026-05-14', uses: 29, correctPct: 38, pdf: 'Entropia-clase.pdf' },
            { id: 'q8',  text: 'Aplique la ecuación de Clausius-Clapeyron a una transición de fase líquido-vapor.', node: 'Gibbs',     source: 'ai',     approved: true,  date: '2026-05-11', uses: 33, correctPct: 46, pdf: 'Gibbs-ejercicios.pdf' },
            { id: 'q9',  text: '¿Cómo afecta la temperatura al equilibrio de una reacción exotérmica?',            node: 'Le Chatelier', source: 'ai',   approved: true,  date: '2026-05-09', uses: 44, correctPct: 67, pdf: null },
            { id: 'q10', text: 'Calcule la velocidad de una reacción de 2° orden a partir de los datos dados.',     node: 'Cinética 2°', source: 'manual', approved: true,  date: '2026-05-03', uses: 31, correctPct: 55, pdf: null },
            { id: 'q11', text: 'Deduzca la expresión de Kc para el equilibrio NH₃ ⇌ N₂ + H₂.',                     node: 'Eq. químico', source: 'ai',     approved: false, date: '2026-05-20', uses: 0, correctPct: null, pdf: 'Termodinamica-1.pdf' },
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
        accessCode: 'CN4M83GQ',
        createdAt: '2026-02-20',
        lastActivity: 'hoy',
        students: 62,
        questions: 184,
        pdfs: 3,
        nodes: ['Orden de reacción', 'Arrhenius', 'Catálisis', 'Mecanismos'],
        icc: 0.66,
        ipc: 0.48,
        cursos: [
            { id: 'A', name: 'Sección A · L-M 09:00', students: 31 },
            { id: 'B', name: 'Sección B · J-V 16:00', students: 31 },
        ],
        roster: [
            { name: 'Hugo Vargas',     curso: 'A', profile: 'calibrated',     icc: 0.84, bkt: 0.72, gap: +0.05, last: 'hoy',  cells: [0.72, 0.68, 0.74, 0.70] },
            { name: 'Inés Lobo',       curso: 'A', profile: 'overconfident',  icc: 0.51, bkt: 0.55, gap: +0.24, last: 'ayer', cells: [0.40, 0.52, 0.62, 0.58] },
            { name: 'Luis Acosta',     curso: 'A', profile: 'overconfident',  icc: 0.48, bkt: 0.50, gap: +0.28, last: 'hoy',  cells: [0.42, 0.48, 0.55, 0.50] },
            { name: 'Jorge Núñez',     curso: 'B', profile: 'calibrated',     icc: 0.79, bkt: 0.68, gap: -0.08, last: 'hoy',  cells: [0.66, 0.70, 0.68, 0.72] },
            { name: 'Karla Espinoza',  curso: 'B', profile: 'underconfident', icc: 0.77, bkt: 0.81, gap: -0.20, last: '2d',   cells: [0.78, 0.82, 0.80, 0.79] },
        ],
        questionBank: [
            { id: 'q1', text: 'Determine el orden global de la reacción a partir de los datos de tabla.',         node: 'Orden de reacción', source: 'manual', approved: true,  date: '2026-05-03', uses: 28, correctPct: 64, pdf: null },
            { id: 'q2', text: 'Aplique la ecuación de Arrhenius para calcular la energía de activación.',          node: 'Arrhenius',         source: 'ai',     approved: true,  date: '2026-05-09', uses: 22, correctPct: 48, pdf: 'Arrhenius-clase.pdf' },
            { id: 'q3', text: '¿En qué se diferencia la catálisis homogénea de la heterogénea?',                   node: 'Catálisis',         source: 'ai',     approved: false, date: '2026-05-17', uses: 0,  correctPct: null, pdf: 'Catalisis-resumen.pdf' },
            { id: 'q4', text: 'Explique el rol del intermediario en un mecanismo de reacción.',                    node: 'Mecanismos',        source: 'manual', approved: true,  date: '2026-04-28', uses: 35, correctPct: 72, pdf: null },
            { id: 'q5', text: 'Calcule la constante de velocidad para una reacción de primer orden.',              node: 'Orden de reacción', source: 'ai',     approved: true,  date: '2026-05-06', uses: 18, correctPct: 41, pdf: 'Cinetica-intro.pdf' },
            { id: 'q6', text: '¿Cómo cambia la energía de activación con el uso de un catalizador?',               node: 'Catálisis',         source: 'ai',     approved: true,  date: '2026-05-12', uses: 25, correctPct: 78, pdf: 'Catalisis-resumen.pdf' },
        ],
        pdfFiles: [
            { id: 'p1', name: 'Cinetica-intro.pdf',   size: '1.8 MB', date: '2026-04-22', nodes: 2, status: 'processed' },
            { id: 'p2', name: 'Arrhenius-clase.pdf',  size: '0.9 MB', date: '2026-05-04', nodes: 1, status: 'processed' },
            { id: 'p3', name: 'Catalisis-resumen.pdf', size: '2.6 MB', date: '2026-05-18', nodes: 1, status: 'processed' },
        ],
    },
    3: {
        name: 'Fisicoquímica · Repaso',
        accessCode: 'FQ8R3KL2',
        createdAt: '2026-01-10',
        lastActivity: 'ayer',
        students: 41,
        questions: 96,
        pdfs: 2,
        nodes: ['Equilibrio', 'Termoquímica', 'Disoluciones'],
        icc: 0.41,
        ipc: 0.22,
        cursos: [
            { id: 'unico', name: 'Único', students: 41 },
        ],
        roster: [
            { name: 'María Olalla',    curso: 'unico', profile: 'overconfident',  icc: 0.38, bkt: 0.41, gap: +0.36, last: 'hoy',  cells: [0.36, 0.42, 0.40] },
            { name: 'Nicolás Paz',     curso: 'unico', profile: 'overconfident',  icc: 0.42, bkt: 0.45, gap: +0.30, last: '2d',   cells: [0.40, 0.46, 0.43] },
            { name: 'Olivia Ramos',    curso: 'unico', profile: 'calibrated',     icc: 0.82, bkt: 0.65, gap: +0.02, last: 'hoy',  cells: [0.62, 0.66, 0.64] },
            { name: 'Pedro Quirós',    curso: 'unico', profile: 'underconfident', icc: 0.70, bkt: 0.74, gap: -0.24, last: 'ayer', cells: [0.72, 0.76, 0.74] },
        ],
        questionBank: [
            { id: 'q1', text: 'Calcule el calor de reacción usando la ley de Hess para el siguiente proceso.',      node: 'Termoquímica', source: 'manual', approved: true,  date: '2026-04-15', uses: 19, correctPct: 56, pdf: null },
            { id: 'q2', text: 'Determine la constante de equilibrio Kc a partir de las concentraciones dadas.',     node: 'Equilibrio',   source: 'ai',     approved: false, date: '2026-05-11', uses: 0,  correctPct: null, pdf: 'Equilibrio-clase.pdf' },
            { id: 'q3', text: 'Explique el efecto del cambio de volumen en un sistema en equilibrio.',              node: 'Equilibrio',   source: 'manual', approved: true,  date: '2026-04-22', uses: 24, correctPct: 38, pdf: null },
            { id: 'q4', text: 'Calcule la concentración molar de una disolución dada.',                             node: 'Disoluciones', source: 'ai',     approved: true,  date: '2026-04-30', uses: 30, correctPct: 72, pdf: 'Disoluciones.pdf' },
        ],
        pdfFiles: [
            { id: 'p1', name: 'Equilibrio-clase.pdf',  size: '1.5 MB', date: '2026-04-10', nodes: 1, status: 'processed' },
            { id: 'p2', name: 'Disoluciones.pdf',      size: '2.0 MB', date: '2026-04-28', nodes: 2, status: 'processed' },
        ],
    },
    4: {
        name: 'Mecánica Cuántica · 2026·I',
        accessCode: 'MQ5N2W8V',
        createdAt: '2026-03-08',
        lastActivity: '2d',
        students: 38,
        questions: 142,
        pdfs: 4,
        nodes: ['Schrödinger', 'Operadores', 'Hidrógeno', 'Spin'],
        icc: 0.62,
        ipc: 0.41,
        cursos: [{ id: 'unico', name: 'Único', students: 38 }],
        roster: [
            { name: 'Sara Quintero', curso: 'unico', profile: 'calibrated',     icc: 0.78, bkt: 0.68, gap: +0.06, last: 'hoy',  cells: [0.65, 0.70, 0.68, 0.69] },
            { name: 'Tomás Vidal',   curso: 'unico', profile: 'overconfident',  icc: 0.45, bkt: 0.48, gap: +0.32, last: 'ayer', cells: [0.42, 0.50, 0.46, 0.54] },
            { name: 'Úrsula Cano',   curso: 'unico', profile: 'underconfident', icc: 0.72, bkt: 0.76, gap: -0.21, last: '3d',   cells: [0.74, 0.78, 0.72, 0.80] },
        ],
        questionBank: [
            { id: 'q1', text: 'Resuelva la ecuación de Schrödinger para una partícula en una caja.', node: 'Schrödinger', source: 'manual', approved: true,  date: '2026-03-12', uses: 24, correctPct: 58, pdf: null },
            { id: 'q2', text: 'Aplique el operador hamiltoniano al estado fundamental del H.',       node: 'Hidrógeno',   source: 'ai',     approved: false, date: '2026-05-19', uses: 0,  correctPct: null, pdf: 'Hidrogeno.pdf' },
            { id: 'q3', text: 'Explique el principio de exclusión de Pauli aplicado al spin.',       node: 'Spin',        source: 'ai',     approved: false, date: '2026-05-21', uses: 0,  correctPct: null, pdf: 'Spin-resumen.pdf' },
        ],
        pdfFiles: [],
    },
    5: {
        name: 'Química Orgánica · 2025·II',
        accessCode: 'QO3P9K7L',
        createdAt: '2025-08-20',
        lastActivity: 'hoy',
        students: 56,
        questions: 218,
        pdfs: 7,
        nodes: ['Nomenclatura', 'Alquenos', 'Mecanismos', 'Estereoquímica', 'Carbonilo'],
        icc: 0.71,
        ipc: 0.54,
        cursos: [
            { id: 'A', name: 'Curso A · L-M-V 08:00', students: 28 },
            { id: 'B', name: 'Curso B · J 14:00',     students: 28 },
        ],
        roster: [
            { name: 'Víctor Aliaga',  curso: 'A', profile: 'calibrated',    icc: 0.86, bkt: 0.74, gap: +0.04, last: 'hoy',  cells: [0.72, 0.76, 0.74, 0.78, 0.70] },
            { name: 'Wendy Mora',     curso: 'A', profile: 'calibrated',    icc: 0.82, bkt: 0.70, gap: -0.06, last: 'hoy',  cells: [0.68, 0.72, 0.70, 0.74, 0.66] },
            { name: 'Ximena Pardo',   curso: 'B', profile: 'overconfident', icc: 0.52, bkt: 0.55, gap: +0.22, last: 'ayer', cells: [0.50, 0.58, 0.52, 0.60, 0.54] },
        ],
        questionBank: [
            { id: 'q1', text: 'Nombre el compuesto según las reglas IUPAC.',                   node: 'Nomenclatura',   source: 'manual', approved: true,  date: '2025-09-02', uses: 88, correctPct: 76, pdf: null },
            { id: 'q2', text: 'Identifique el mecanismo de adición electrofílica.',            node: 'Mecanismos',     source: 'ai',     approved: true,  date: '2025-10-15', uses: 65, correctPct: 51, pdf: 'Mecanismos.pdf' },
        ],
        pdfFiles: [],
    },
    6: {
        name: 'Bioquímica · Avanzado',
        accessCode: 'BQ6S4T2H',
        createdAt: '2026-04-01',
        lastActivity: 'ayer',
        students: 29,
        questions: 84,
        pdfs: 3,
        nodes: ['Enzimas', 'Metabolismo', 'Ácidos nucleicos'],
        icc: 0.49,
        ipc: 0.31,
        cursos: [{ id: 'unico', name: 'Único', students: 29 }],
        roster: [
            { name: 'Yamil Cortés',   curso: 'unico', profile: 'overconfident', icc: 0.41, bkt: 0.46, gap: +0.34, last: 'ayer', cells: [0.40, 0.48, 0.44] },
            { name: 'Zoe Bernal',     curso: 'unico', profile: 'overconfident', icc: 0.44, bkt: 0.48, gap: +0.30, last: '3d',   cells: [0.42, 0.50, 0.46] },
        ],
        questionBank: [
            { id: 'q1', text: 'Describa el mecanismo catalítico de la quimotripsina.',                node: 'Enzimas',         source: 'manual', approved: true,  date: '2026-04-10', uses: 12, correctPct: 32, pdf: null },
            { id: 'q2', text: 'Explique la regulación alostérica en la fosfofructoquinasa.',          node: 'Metabolismo',     source: 'ai',     approved: false, date: '2026-05-15', uses: 0,  correctPct: null, pdf: 'Metabolismo.pdf' },
            { id: 'q3', text: 'Detalle el plegamiento de un tRNA.',                                   node: 'Ácidos nucleicos', source: 'ai',     approved: false, date: '2026-05-16', uses: 0,  correctPct: null, pdf: 'Acidos-nucleicos.pdf' },
        ],
        pdfFiles: [],
    },
    7: {
        name: 'Termodinámica II · 2026·II',
        accessCode: 'TD9X1Y3Z',
        createdAt: '2026-08-12',
        lastActivity: 'hoy',
        students: 47,
        questions: 156,
        pdfs: 4,
        nodes: ['Ciclos', 'Refrigeración', 'Combustión', 'Exergía'],
        icc: 0.55,
        ipc: 0.38,
        cursos: [
            { id: 'A', name: 'Curso A · L-J 11:00', students: 24 },
            { id: 'B', name: 'Curso B · M-V 15:00', students: 23 },
        ],
        roster: [
            { name: 'Adrián Reyes',   curso: 'A', profile: 'underconfident', icc: 0.70, bkt: 0.74, gap: -0.22, last: 'hoy',  cells: [0.72, 0.76, 0.68, 0.74] },
            { name: 'Brianna López',  curso: 'B', profile: 'overconfident',  icc: 0.48, bkt: 0.51, gap: +0.28, last: 'ayer', cells: [0.46, 0.54, 0.50, 0.48] },
        ],
        questionBank: [
            { id: 'q1', text: 'Calcule la eficiencia de un ciclo de Carnot.',                          node: 'Ciclos',        source: 'manual', approved: true,  date: '2026-08-20', uses: 38, correctPct: 62, pdf: null },
            { id: 'q2', text: 'Analice un ciclo de refrigeración por compresión.',                    node: 'Refrigeración', source: 'ai',     approved: false, date: '2026-09-05', uses: 0,  correctPct: null, pdf: 'Refrigeracion.pdf' },
        ],
        pdfFiles: [],
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
