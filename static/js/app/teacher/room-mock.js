export const ROOM_DATA = {
    0: {
        id_room: 0,
        name: 'Todas las salas',
        subject: null,
        mode: 'group',
        access_code: null,
        is_active: true,
        created_at: null,
        id_teacher: 1,
        teacher: { id_user: 1, first_name: 'María', last_name: 'Ramírez', role: 'teacher' },
        students: 187,
        questions: 592,
        pdfs: 10,
        nodes: [
            { id_node: 101, name: '1ª ley',       description: 'Termodinámica clásica' },
            { id_node: 102, name: 'Entropía',     description: 'Termodinámica clásica' },
            { id_node: 103, name: 'Cinética 2°',  description: 'Cinética química' },
            { id_node: 104, name: 'Arrhenius',    description: 'Cinética química' },
            { id_node: 105, name: 'Catálisis',    description: 'Cinética química' },
            { id_node: 106, name: 'Equilibrio',   description: 'Equilibrio químico' },
        ],
        sections: [],
        roster: [
            { id_user: 201, first_name: 'Hugo',    last_name: 'Iturra',    username: 'hiturra',    profile: 'overconfident',  icc_value: 0.38, bkt_mastery: 0.42, metacognitive_gap: 0.42, joined_at: '2026-02-18T09:00:00Z', cells: [0.30, 0.42, 0.40, 0.55, 0.45, 0.50] },
            { id_user: 202, first_name: 'Inés',    last_name: 'Quispe',    username: 'iquispe',    profile: 'overconfident',  icc_value: 0.40, bkt_mastery: 0.45, metacognitive_gap: 0.38, joined_at: '2026-02-19T10:30:00Z', cells: [0.35, 0.40, 0.45, 0.50, 0.42, 0.48] },
            { id_user: 203, first_name: 'Andrea',  last_name: 'Molina',    username: 'amolina',    profile: 'overconfident',  icc_value: 0.42, bkt_mastery: 0.51, metacognitive_gap: 0.31, joined_at: '2026-02-16T08:15:00Z', cells: [0.32, 0.41, 0.78, 0.65, 0.50, 0.72] },
            { id_user: 204, first_name: 'Camila',  last_name: 'Reyes',     username: 'creyes',     profile: 'underconfident', icc_value: 0.72, bkt_mastery: 0.78, metacognitive_gap: -0.22, joined_at: '2026-02-17T14:00:00Z', cells: [0.71, 0.82, 0.78, 0.69, 0.74, 0.81] },
            { id_user: 205, first_name: 'Daniel',  last_name: 'Tovar',     username: 'dtovar',     profile: 'calibrated',     icc_value: 0.86, bkt_mastery: 0.62, metacognitive_gap: 0.04, joined_at: '2026-02-20T11:00:00Z', cells: [0.60, 0.62, 0.65, 0.58, 0.61, 0.66] },
            { id_user: 206, first_name: 'Hugo',    last_name: 'Vargas',    username: 'hvargas',    profile: 'calibrated',     icc_value: 0.84, bkt_mastery: 0.72, metacognitive_gap: 0.05, joined_at: '2026-02-21T15:30:00Z', cells: [0.72, 0.68, 0.74, 0.70, 0.71, 0.70] },
            { id_user: 207, first_name: 'Karla',   last_name: 'Espinoza',  username: 'kespinoza',  profile: 'underconfident', icc_value: 0.77, bkt_mastery: 0.81, metacognitive_gap: -0.20, joined_at: '2026-02-22T09:45:00Z', cells: [0.78, 0.82, 0.80, 0.79, 0.78, 0.80] },
        ],
        questionBank: [
            { id_question: 'q1', statement: '¿Por qué un sistema abierto puede intercambiar masa y energía con el entorno?', id_node: 101, node: { id_node: 101, name: '1ª ley',     description: 'Termodinámica clásica' }, source: 'manual', is_approved: true,  created_at: '2026-05-10T10:00:00Z', difficulty: 'medium', options: ['Porque sus fronteras permiten flujo de materia y energía', 'Porque su volumen es constante', 'Porque no intercambia calor', 'Porque su temperatura es uniforme'], correct_index: 0, source_pdf: null },
            { id_question: 'q2', statement: 'Aplique la ecuación de Arrhenius para calcular la energía de activación.',     id_node: 104, node: { id_node: 104, name: 'Arrhenius',  description: 'Cinética química' },     source: 'ai',     is_approved: true,  created_at: '2026-05-09T14:20:00Z', difficulty: 'hard',   options: ['Ea = -R · ln(k2/k1) / (1/T2 - 1/T1)', 'Ea = R · T · ln(k)', 'Ea = k · T', 'Ea = ln(A) · R'], correct_index: 0, source_pdf: { id_pdf: 'p2', original_name: 'Cinetica-intro.pdf' } },
            { id_question: 'q3', statement: '¿Bajo qué condiciones la entropía de un sistema aislado disminuye?',           id_node: 102, node: { id_node: 102, name: 'Entropía',   description: 'Termodinámica clásica' }, source: 'ai',     is_approved: false, created_at: '2026-05-18T11:15:00Z', difficulty: 'medium', options: ['Nunca, por la 2ª ley', 'Cuando se enfría', 'Cuando aumenta la presión', 'En procesos reversibles'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Termodinamica-1.pdf' } },
            { id_question: 'q4', statement: 'Determine la constante de equilibrio Kc.',                                     id_node: 106, node: { id_node: 106, name: 'Equilibrio', description: 'Equilibrio químico' },    source: 'ai',     is_approved: false, created_at: '2026-05-11T09:30:00Z', difficulty: 'easy',   options: ['Kc = [productos]/[reactivos]', 'Kc = [reactivos]/[productos]', 'Kc = ΔG/RT', 'Kc = R · T'], correct_index: 0, source_pdf: { id_pdf: 'p3', original_name: 'Equilibrio-clase.pdf' } },
        ],
        pdfFiles: [
            { id_pdf: 'p1', original_name: 'Termodinamica-1.pdf',  size_bytes: 2411724, created_at: '2026-05-01T10:00:00Z', processed: true,  uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p2', original_name: 'Cinetica-intro.pdf',   size_bytes: 1887436, created_at: '2026-04-22T11:30:00Z', processed: true,  uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p3', original_name: 'Equilibrio-clase.pdf', size_bytes: 1572864, created_at: '2026-04-10T09:15:00Z', processed: true,  uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
        ],
    },
    1: {
        id_room: 1,
        name: 'Termodinámica I · 2026·I',
        subject: 'Termodinámica',
        mode: 'group',
        access_code: 'TM7A9K2B',
        is_active: true,
        created_at: '2026-02-15T08:00:00Z',
        id_teacher: 1,
        teacher: { id_user: 1, first_name: 'María', last_name: 'Ramírez', role: 'teacher' },
        students: 84,
        questions: 312,
        pdfs: 5,
        nodes: [
            { id_node: 111, name: '1ª ley',       description: 'Termodinámica clásica' },
            { id_node: 112, name: 'Entropía',     description: 'Termodinámica clásica' },
            { id_node: 113, name: 'Cinética 2°',  description: 'Cinética química' },
            { id_node: 114, name: 'Eq. químico',  description: 'Equilibrio químico' },
            { id_node: 115, name: 'Gibbs',        description: 'Energía libre' },
            { id_node: 116, name: 'Le Chatelier', description: 'Equilibrio químico' },
        ],
        sections: [
            { id_section: 11, code: 'A', name: 'Curso A · L-M-V 10:00', schedule: 'L-M-V 10:00', capacity: 30, is_active: true, students: 28 },
            { id_section: 12, code: 'B', name: 'Curso B · M-J 14:00',   schedule: 'M-J 14:00',   capacity: 30, is_active: true, students: 30 },
            { id_section: 13, code: 'C', name: 'Curso C · V 18:00',     schedule: 'V 18:00',     capacity: 30, is_active: true, students: 26 },
        ],
        roster: [
            { id_user: 301, first_name: 'Andrea',   last_name: 'Molina',    username: 'amolina',    membership: { id_section: 11, section: { code: 'A', name: 'Curso A · L-M-V 10:00', schedule: 'L-M-V 10:00' }, joined_at: '2026-02-16T08:15:00Z' }, profile: 'overconfident',  icc_value: 0.42, bkt_mastery: 0.51, metacognitive_gap: 0.31, avg_confidence: 0.82, cells: [0.32, 0.41, 0.78, 0.65, 0.50, 0.72] },
            { id_user: 302, first_name: 'Bruno',    last_name: 'Cárdenas',  username: 'bcardenas',  membership: { id_section: 11, section: { code: 'A', name: 'Curso A · L-M-V 10:00', schedule: 'L-M-V 10:00' }, joined_at: '2026-02-17T10:20:00Z' }, profile: 'overconfident',  icc_value: 0.45, bkt_mastery: 0.48, metacognitive_gap: 0.26, avg_confidence: 0.74, cells: [0.28, 0.39, 0.66, 0.58, 0.44, 0.61] },
            { id_user: 303, first_name: 'Gabriela', last_name: 'Soto',      username: 'gsoto',      membership: { id_section: 11, section: { code: 'A', name: 'Curso A · L-M-V 10:00', schedule: 'L-M-V 10:00' }, joined_at: '2026-02-18T09:45:00Z' }, profile: 'overconfident',  icc_value: 0.39, bkt_mastery: 0.44, metacognitive_gap: 0.34, avg_confidence: 0.78, cells: [0.35, 0.40, 0.55, 0.48, 0.41, 0.50] },
            { id_user: 304, first_name: 'Camila',   last_name: 'Reyes',     username: 'creyes',     membership: { id_section: 12, section: { code: 'B', name: 'Curso B · M-J 14:00',   schedule: 'M-J 14:00'   }, joined_at: '2026-02-19T11:00:00Z' }, profile: 'underconfident', icc_value: 0.72, bkt_mastery: 0.78, metacognitive_gap: -0.22, avg_confidence: 0.56, cells: [0.71, 0.82, 0.78, 0.69, 0.74, 0.81] },
            { id_user: 305, first_name: 'Daniel',   last_name: 'Tovar',     username: 'dtovar',     membership: { id_section: 12, section: { code: 'B', name: 'Curso B · M-J 14:00',   schedule: 'M-J 14:00'   }, joined_at: '2026-02-20T14:00:00Z' }, profile: 'calibrated',     icc_value: 0.86, bkt_mastery: 0.62, metacognitive_gap: 0.04, avg_confidence: 0.66, cells: [0.60, 0.62, 0.65, 0.58, 0.61, 0.66] },
            { id_user: 306, first_name: 'Elena',    last_name: 'Pinto',     username: 'epinto',     membership: { id_section: 13, section: { code: 'C', name: 'Curso C · V 18:00',     schedule: 'V 18:00'     }, joined_at: '2026-02-21T18:30:00Z' }, profile: 'underconfident', icc_value: 0.78, bkt_mastery: 0.70, metacognitive_gap: -0.18, avg_confidence: 0.52, cells: [0.55, 0.60, 0.72, 0.68, 0.70, 0.74] },
            { id_user: 307, first_name: 'Felipe',   last_name: 'Marín',     username: 'fmarin',     membership: { id_section: 13, section: { code: 'C', name: 'Curso C · V 18:00',     schedule: 'V 18:00'     }, joined_at: '2026-02-22T18:00:00Z' }, profile: 'calibrated',     icc_value: 0.88, bkt_mastery: 0.72, metacognitive_gap: 0.03, avg_confidence: 0.75, cells: [0.70, 0.68, 0.75, 0.71, 0.69, 0.76] },
        ],
        questionBank: [
            { id_question: 'q1',  statement: '¿Por qué un sistema abierto puede intercambiar masa y energía con el entorno?',                          id_node: 111, node: { id_node: 111, name: '1ª ley',       description: 'Termodinámica clásica' }, source: 'manual', is_approved: true,  created_at: '2026-05-10T10:00:00Z', difficulty: 'medium', options: ['Porque sus fronteras permiten flujo de materia y energía', 'Porque su volumen es constante', 'Porque no intercambia calor', 'Porque su temperatura es uniforme'], correct_index: 0, source_pdf: null },
            { id_question: 'q2',  statement: 'Calcule el trabajo realizado por un gas ideal en una expansión isotérmica.',                              id_node: 111, node: { id_node: 111, name: '1ª ley',       description: 'Termodinámica clásica' }, source: 'ai',     is_approved: true,  created_at: '2026-05-12T12:30:00Z', difficulty: 'hard',   options: ['W = nRT · ln(V2/V1)', 'W = P · ΔV', 'W = nCvΔT', 'W = 0'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Termodinamica-1.pdf' } },
            { id_question: 'q3',  statement: '¿Bajo qué condiciones la entropía de un sistema aislado disminuye?',                                     id_node: 112, node: { id_node: 112, name: 'Entropía',     description: 'Termodinámica clásica' }, source: 'ai',     is_approved: false, created_at: '2026-05-18T11:15:00Z', difficulty: 'medium', options: ['Nunca, por la 2ª ley', 'Cuando se enfría', 'Cuando aumenta la presión', 'En procesos reversibles'], correct_index: 0, source_pdf: { id_pdf: 'p2', original_name: 'Entropia-clase.pdf' } },
            { id_question: 'q4',  statement: 'Explique el principio de Le Chatelier ante un aumento de presión.',                                      id_node: 116, node: { id_node: 116, name: 'Le Chatelier', description: 'Equilibrio químico' },    source: 'manual', is_approved: true,  created_at: '2026-05-05T15:00:00Z', difficulty: 'easy',   options: ['El sistema se desplaza hacia el lado con menos moles gaseosos', 'El equilibrio no se modifica', 'Se desplaza hacia los reactivos', 'Aumenta la temperatura'], correct_index: 0, source_pdf: null },
            { id_question: 'q5',  statement: 'Derive la expresión de energía libre de Gibbs para una reacción a temperatura constante.',               id_node: 115, node: { id_node: 115, name: 'Gibbs',        description: 'Energía libre' },         source: 'ai',     is_approved: false, created_at: '2026-05-19T16:45:00Z', difficulty: 'hard',   options: ['ΔG = ΔH - TΔS', 'ΔG = ΔH + TΔS', 'ΔG = T · ΔS', 'ΔG = -RT · ln(K)'], correct_index: 0, source_pdf: { id_pdf: 'p4', original_name: 'Gibbs-ejercicios.pdf' } },
            { id_question: 'q6',  statement: 'Identifique cuál de los siguientes procesos es adiabático.',                                              id_node: 111, node: { id_node: 111, name: '1ª ley',       description: 'Termodinámica clásica' }, source: 'manual', is_approved: true,  created_at: '2026-05-08T09:00:00Z', difficulty: 'medium', options: ['Compresión rápida en un cilindro aislado', 'Calentamiento lento de un metal', 'Fusión del hielo', 'Evaporación al sol'], correct_index: 0, source_pdf: null },
            { id_question: 'q7',  statement: 'Determine la variación de entropía en una expansión libre.',                                              id_node: 112, node: { id_node: 112, name: 'Entropía',     description: 'Termodinámica clásica' }, source: 'ai',     is_approved: true,  created_at: '2026-05-14T11:00:00Z', difficulty: 'hard',   options: ['ΔS = nR · ln(V2/V1)', 'ΔS = 0', 'ΔS = nCv · ln(T2/T1)', 'ΔS = -nR · ln(V2/V1)'], correct_index: 0, source_pdf: { id_pdf: 'p2', original_name: 'Entropia-clase.pdf' } },
            { id_question: 'q8',  statement: 'Aplique la ecuación de Clausius-Clapeyron a una transición de fase líquido-vapor.',                       id_node: 115, node: { id_node: 115, name: 'Gibbs',        description: 'Energía libre' },         source: 'ai',     is_approved: true,  created_at: '2026-05-11T14:20:00Z', difficulty: 'hard',   options: ['dP/dT = ΔH / (T · ΔV)', 'dP/dT = R · T', 'dP/dT = ΔS / ΔV', 'dP/dT = ΔG / T'], correct_index: 0, source_pdf: { id_pdf: 'p4', original_name: 'Gibbs-ejercicios.pdf' } },
            { id_question: 'q9',  statement: '¿Cómo afecta la temperatura al equilibrio de una reacción exotérmica?',                                   id_node: 116, node: { id_node: 116, name: 'Le Chatelier', description: 'Equilibrio químico' },    source: 'ai',     is_approved: true,  created_at: '2026-05-09T10:30:00Z', difficulty: 'medium', options: ['Desplaza el equilibrio hacia los reactivos', 'Desplaza el equilibrio hacia los productos', 'No tiene efecto', 'Aumenta Kc'], correct_index: 0, source_pdf: null },
            { id_question: 'q10', statement: 'Calcule la velocidad de una reacción de 2° orden a partir de los datos dados.',                          id_node: 113, node: { id_node: 113, name: 'Cinética 2°',  description: 'Cinética química' },      source: 'manual', is_approved: true,  created_at: '2026-05-03T13:00:00Z', difficulty: 'medium', options: ['v = k · [A]²', 'v = k · [A]', 'v = k', 'v = k · [A][B]'], correct_index: 0, source_pdf: null },
            { id_question: 'q11', statement: 'Deduzca la expresión de Kc para el equilibrio NH₃ ⇌ N₂ + H₂.',                                           id_node: 114, node: { id_node: 114, name: 'Eq. químico',  description: 'Equilibrio químico' },    source: 'ai',     is_approved: false, created_at: '2026-05-20T17:00:00Z', difficulty: 'medium', options: ['Kc = [N₂][H₂]³ / [NH₃]²', 'Kc = [NH₃]² / [N₂][H₂]³', 'Kc = [N₂][H₂] / [NH₃]', 'Kc = [NH₃] / [N₂]'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Termodinamica-1.pdf' } },
        ],
        pdfFiles: [
            { id_pdf: 'p1', original_name: 'Termodinamica-1.pdf',        size_bytes: 2411724, created_at: '2026-05-01T10:00:00Z', processed: true,  uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p2', original_name: 'Entropia-clase.pdf',         size_bytes: 1153434, created_at: '2026-05-08T12:00:00Z', processed: true,  uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p3', original_name: 'Cinetica-segundo-orden.pdf', size_bytes: 3565158, created_at: '2026-05-14T09:30:00Z', processed: true,  uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p4', original_name: 'Gibbs-ejercicios.pdf',       size_bytes: 838860,  created_at: '2026-05-20T16:00:00Z', processed: false, uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p5', original_name: 'LeChatelier.pdf',            size_bytes: 2202009, created_at: '2026-05-22T11:45:00Z', processed: false, uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
        ],
    },
    2: {
        id_room: 2,
        name: 'Cinética Química · 2026·I',
        subject: 'Cinética química',
        mode: 'group',
        access_code: 'CN4M83GQ',
        is_active: true,
        created_at: '2026-02-20T08:00:00Z',
        id_teacher: 1,
        teacher: { id_user: 1, first_name: 'María', last_name: 'Ramírez', role: 'teacher' },
        students: 62,
        questions: 184,
        pdfs: 3,
        nodes: [
            { id_node: 121, name: 'Orden de reacción', description: 'Cinética química' },
            { id_node: 122, name: 'Arrhenius',         description: 'Cinética química' },
            { id_node: 123, name: 'Catálisis',         description: 'Cinética química' },
            { id_node: 124, name: 'Mecanismos',        description: 'Cinética química' },
        ],
        sections: [
            { id_section: 21, code: 'A', name: 'Sección A · L-M 09:00', schedule: 'L-M 09:00', capacity: 35, is_active: true, students: 31 },
            { id_section: 22, code: 'B', name: 'Sección B · J-V 16:00', schedule: 'J-V 16:00', capacity: 35, is_active: true, students: 31 },
        ],
        roster: [
            { id_user: 401, first_name: 'Hugo',   last_name: 'Vargas',    username: 'hvargas',   membership: { id_section: 21, section: { code: 'A', name: 'Sección A · L-M 09:00', schedule: 'L-M 09:00' }, joined_at: '2026-02-22T09:00:00Z' }, profile: 'calibrated',     icc_value: 0.84, bkt_mastery: 0.72, metacognitive_gap: 0.05, avg_confidence: 0.77, cells: [0.72, 0.68, 0.74, 0.70] },
            { id_user: 402, first_name: 'Inés',   last_name: 'Lobo',      username: 'ilobo',     membership: { id_section: 21, section: { code: 'A', name: 'Sección A · L-M 09:00', schedule: 'L-M 09:00' }, joined_at: '2026-02-23T10:30:00Z' }, profile: 'overconfident',  icc_value: 0.51, bkt_mastery: 0.55, metacognitive_gap: 0.24, avg_confidence: 0.79, cells: [0.40, 0.52, 0.62, 0.58] },
            { id_user: 403, first_name: 'Luis',   last_name: 'Acosta',    username: 'lacosta',   membership: { id_section: 21, section: { code: 'A', name: 'Sección A · L-M 09:00', schedule: 'L-M 09:00' }, joined_at: '2026-02-24T11:00:00Z' }, profile: 'overconfident',  icc_value: 0.48, bkt_mastery: 0.50, metacognitive_gap: 0.28, avg_confidence: 0.78, cells: [0.42, 0.48, 0.55, 0.50] },
            { id_user: 404, first_name: 'Jorge',  last_name: 'Núñez',     username: 'jnunez',    membership: { id_section: 22, section: { code: 'B', name: 'Sección B · J-V 16:00', schedule: 'J-V 16:00' }, joined_at: '2026-02-25T16:00:00Z' }, profile: 'calibrated',     icc_value: 0.79, bkt_mastery: 0.68, metacognitive_gap: -0.08, avg_confidence: 0.60, cells: [0.66, 0.70, 0.68, 0.72] },
            { id_user: 405, first_name: 'Karla',  last_name: 'Espinoza',  username: 'kespinoza', membership: { id_section: 22, section: { code: 'B', name: 'Sección B · J-V 16:00', schedule: 'J-V 16:00' }, joined_at: '2026-02-26T16:30:00Z' }, profile: 'underconfident', icc_value: 0.77, bkt_mastery: 0.81, metacognitive_gap: -0.20, avg_confidence: 0.61, cells: [0.78, 0.82, 0.80, 0.79] },
        ],
        questionBank: [
            { id_question: 'q1', statement: 'Determine el orden global de la reacción a partir de los datos de tabla.',  id_node: 121, node: { id_node: 121, name: 'Orden de reacción', description: 'Cinética química' }, source: 'manual', is_approved: true,  created_at: '2026-05-03T10:00:00Z', difficulty: 'medium', options: ['Sumando los exponentes de cada concentración', 'Multiplicando los coeficientes estequiométricos', 'Igualando velocidad y k', 'Tomando solo el reactivo limitante'], correct_index: 0, source_pdf: null },
            { id_question: 'q2', statement: 'Aplique la ecuación de Arrhenius para calcular la energía de activación.',  id_node: 122, node: { id_node: 122, name: 'Arrhenius',         description: 'Cinética química' }, source: 'ai',     is_approved: true,  created_at: '2026-05-09T11:30:00Z', difficulty: 'hard',   options: ['Ea = -R · ln(k2/k1) / (1/T2 - 1/T1)', 'Ea = R · T · ln(k)', 'Ea = k · T', 'Ea = ln(A) · R'], correct_index: 0, source_pdf: { id_pdf: 'p2', original_name: 'Arrhenius-clase.pdf' } },
            { id_question: 'q3', statement: '¿En qué se diferencia la catálisis homogénea de la heterogénea?',           id_node: 123, node: { id_node: 123, name: 'Catálisis',         description: 'Cinética química' }, source: 'ai',     is_approved: false, created_at: '2026-05-17T14:00:00Z', difficulty: 'easy',   options: ['En la fase del catalizador respecto a reactivos', 'En la temperatura de reacción', 'En el orden de reacción', 'En el solvente usado'], correct_index: 0, source_pdf: { id_pdf: 'p3', original_name: 'Catalisis-resumen.pdf' } },
            { id_question: 'q4', statement: 'Explique el rol del intermediario en un mecanismo de reacción.',            id_node: 124, node: { id_node: 124, name: 'Mecanismos',        description: 'Cinética química' }, source: 'manual', is_approved: true,  created_at: '2026-04-28T09:15:00Z', difficulty: 'medium', options: ['Especie que se forma y consume entre pasos', 'Reactivo principal', 'Producto final', 'Catalizador'], correct_index: 0, source_pdf: null },
            { id_question: 'q5', statement: 'Calcule la constante de velocidad para una reacción de primer orden.',       id_node: 121, node: { id_node: 121, name: 'Orden de reacción', description: 'Cinética química' }, source: 'ai',     is_approved: true,  created_at: '2026-05-06T13:45:00Z', difficulty: 'medium', options: ['k = ln(2)/t½', 'k = t½/2', 'k = 1/t', 'k = ln(C0/C)'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Cinetica-intro.pdf' } },
            { id_question: 'q6', statement: '¿Cómo cambia la energía de activación con el uso de un catalizador?',        id_node: 123, node: { id_node: 123, name: 'Catálisis',         description: 'Cinética química' }, source: 'ai',     is_approved: true,  created_at: '2026-05-12T15:00:00Z', difficulty: 'easy',   options: ['Disminuye', 'Aumenta', 'No cambia', 'Se duplica'], correct_index: 0, source_pdf: { id_pdf: 'p3', original_name: 'Catalisis-resumen.pdf' } },
        ],
        pdfFiles: [
            { id_pdf: 'p1', original_name: 'Cinetica-intro.pdf',    size_bytes: 1887436, created_at: '2026-04-22T11:30:00Z', processed: true, uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p2', original_name: 'Arrhenius-clase.pdf',   size_bytes: 943718,  created_at: '2026-05-04T10:00:00Z', processed: true, uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p3', original_name: 'Catalisis-resumen.pdf', size_bytes: 2726297, created_at: '2026-05-18T14:30:00Z', processed: true, uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
        ],
    },
    3: {
        id_room: 3,
        name: 'Fisicoquímica · Repaso',
        subject: 'Fisicoquímica',
        mode: 'group',
        access_code: 'FQ8R3KL2',
        is_active: true,
        created_at: '2026-01-10T08:00:00Z',
        id_teacher: 1,
        teacher: { id_user: 1, first_name: 'María', last_name: 'Ramírez', role: 'teacher' },
        students: 41,
        questions: 96,
        pdfs: 2,
        nodes: [
            { id_node: 131, name: 'Equilibrio',   description: 'Equilibrio químico' },
            { id_node: 132, name: 'Termoquímica', description: 'Termodinámica clásica' },
            { id_node: 133, name: 'Disoluciones', description: 'Soluciones' },
        ],
        sections: [
            { id_section: 31, code: 'U', name: 'Único', schedule: 'L-V 19:00', capacity: 45, is_active: true, students: 41 },
        ],
        roster: [
            { id_user: 501, first_name: 'María',   last_name: 'Olalla',  username: 'molalla',   membership: { id_section: 31, section: { code: 'U', name: 'Único', schedule: 'L-V 19:00' }, joined_at: '2026-01-12T19:00:00Z' }, profile: 'overconfident',  icc_value: 0.38, bkt_mastery: 0.41, metacognitive_gap: 0.36, avg_confidence: 0.77, cells: [0.36, 0.42, 0.40] },
            { id_user: 502, first_name: 'Nicolás', last_name: 'Paz',     username: 'npaz',      membership: { id_section: 31, section: { code: 'U', name: 'Único', schedule: 'L-V 19:00' }, joined_at: '2026-01-13T19:00:00Z' }, profile: 'overconfident',  icc_value: 0.42, bkt_mastery: 0.45, metacognitive_gap: 0.30, avg_confidence: 0.75, cells: [0.40, 0.46, 0.43] },
            { id_user: 503, first_name: 'Olivia',  last_name: 'Ramos',   username: 'oramos',    membership: { id_section: 31, section: { code: 'U', name: 'Único', schedule: 'L-V 19:00' }, joined_at: '2026-01-14T19:00:00Z' }, profile: 'calibrated',     icc_value: 0.82, bkt_mastery: 0.65, metacognitive_gap: 0.02, avg_confidence: 0.67, cells: [0.62, 0.66, 0.64] },
            { id_user: 504, first_name: 'Pedro',   last_name: 'Quirós',  username: 'pquiros',   membership: { id_section: 31, section: { code: 'U', name: 'Único', schedule: 'L-V 19:00' }, joined_at: '2026-01-15T19:00:00Z' }, profile: 'underconfident', icc_value: 0.70, bkt_mastery: 0.74, metacognitive_gap: -0.24, avg_confidence: 0.50, cells: [0.72, 0.76, 0.74] },
        ],
        questionBank: [
            { id_question: 'q1', statement: 'Calcule el calor de reacción usando la ley de Hess para el siguiente proceso.', id_node: 132, node: { id_node: 132, name: 'Termoquímica', description: 'Termodinámica clásica' }, source: 'manual', is_approved: true,  created_at: '2026-04-15T10:00:00Z', difficulty: 'medium', options: ['ΔH = Σ ΔH(productos) - Σ ΔH(reactivos)', 'ΔH = T · ΔS', 'ΔH = nR · ΔT', 'ΔH = -RT · ln(K)'], correct_index: 0, source_pdf: null },
            { id_question: 'q2', statement: 'Determine la constante de equilibrio Kc a partir de las concentraciones dadas.', id_node: 131, node: { id_node: 131, name: 'Equilibrio',   description: 'Equilibrio químico' },    source: 'ai',     is_approved: false, created_at: '2026-05-11T14:30:00Z', difficulty: 'easy',   options: ['Kc = [productos]/[reactivos]', 'Kc = [reactivos]/[productos]', 'Kc = ΔG/RT', 'Kc = R · T'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Equilibrio-clase.pdf' } },
            { id_question: 'q3', statement: 'Explique el efecto del cambio de volumen en un sistema en equilibrio.',         id_node: 131, node: { id_node: 131, name: 'Equilibrio',   description: 'Equilibrio químico' },    source: 'manual', is_approved: true,  created_at: '2026-04-22T11:00:00Z', difficulty: 'medium', options: ['Se desplaza hacia el lado con menos moles gaseosos', 'No tiene efecto', 'Aumenta Kc', 'Disminuye Kc'], correct_index: 0, source_pdf: null },
            { id_question: 'q4', statement: 'Calcule la concentración molar de una disolución dada.',                        id_node: 133, node: { id_node: 133, name: 'Disoluciones', description: 'Soluciones' },             source: 'ai',     is_approved: true,  created_at: '2026-04-30T09:30:00Z', difficulty: 'easy',   options: ['M = moles soluto / litros disolución', 'M = gramos / litros', 'M = moles / kg', 'M = moles · litros'], correct_index: 0, source_pdf: { id_pdf: 'p2', original_name: 'Disoluciones.pdf' } },
        ],
        pdfFiles: [
            { id_pdf: 'p1', original_name: 'Equilibrio-clase.pdf', size_bytes: 1572864, created_at: '2026-04-10T09:15:00Z', processed: true, uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
            { id_pdf: 'p2', original_name: 'Disoluciones.pdf',     size_bytes: 2097152, created_at: '2026-04-28T11:00:00Z', processed: true, uploaded_by: { id_user: 1, first_name: 'María', last_name: 'Ramírez' } },
        ],
    },
    4: {
        id_room: 4,
        name: 'Mecánica Cuántica · 2026·I',
        subject: 'Mecánica cuántica',
        mode: 'group',
        access_code: 'MQ5N2W8V',
        is_active: true,
        created_at: '2026-03-08T08:00:00Z',
        id_teacher: 1,
        teacher: { id_user: 1, first_name: 'María', last_name: 'Ramírez', role: 'teacher' },
        students: 38,
        questions: 142,
        pdfs: 4,
        nodes: [
            { id_node: 141, name: 'Schrödinger', description: 'Mecánica cuántica' },
            { id_node: 142, name: 'Operadores',  description: 'Mecánica cuántica' },
            { id_node: 143, name: 'Hidrógeno',   description: 'Mecánica cuántica' },
            { id_node: 144, name: 'Spin',        description: 'Mecánica cuántica' },
        ],
        sections: [
            { id_section: 41, code: 'U', name: 'Único', schedule: 'M-J 18:00', capacity: 40, is_active: true, students: 38 },
        ],
        roster: [
            { id_user: 601, first_name: 'Sara',   last_name: 'Quintero', username: 'squintero', membership: { id_section: 41, section: { code: 'U', name: 'Único', schedule: 'M-J 18:00' }, joined_at: '2026-03-10T18:00:00Z' }, profile: 'calibrated',     icc_value: 0.78, bkt_mastery: 0.68, metacognitive_gap: 0.06, avg_confidence: 0.74, cells: [0.65, 0.70, 0.68, 0.69] },
            { id_user: 602, first_name: 'Tomás',  last_name: 'Vidal',    username: 'tvidal',    membership: { id_section: 41, section: { code: 'U', name: 'Único', schedule: 'M-J 18:00' }, joined_at: '2026-03-11T18:00:00Z' }, profile: 'overconfident',  icc_value: 0.45, bkt_mastery: 0.48, metacognitive_gap: 0.32, avg_confidence: 0.80, cells: [0.42, 0.50, 0.46, 0.54] },
            { id_user: 603, first_name: 'Úrsula', last_name: 'Cano',     username: 'ucano',     membership: { id_section: 41, section: { code: 'U', name: 'Único', schedule: 'M-J 18:00' }, joined_at: '2026-03-12T18:00:00Z' }, profile: 'underconfident', icc_value: 0.72, bkt_mastery: 0.76, metacognitive_gap: -0.21, avg_confidence: 0.55, cells: [0.74, 0.78, 0.72, 0.80] },
        ],
        questionBank: [
            { id_question: 'q1', statement: 'Resuelva la ecuación de Schrödinger para una partícula en una caja.', id_node: 141, node: { id_node: 141, name: 'Schrödinger', description: 'Mecánica cuántica' }, source: 'manual', is_approved: true,  created_at: '2026-03-12T10:00:00Z', difficulty: 'hard', options: ['ψ = √(2/L) · sin(nπx/L)', 'ψ = A · e^(ikx)', 'ψ = cos(kx)', 'ψ = e^(-x²)'], correct_index: 0, source_pdf: null },
            { id_question: 'q2', statement: 'Aplique el operador hamiltoniano al estado fundamental del H.',       id_node: 143, node: { id_node: 143, name: 'Hidrógeno',   description: 'Mecánica cuántica' }, source: 'ai',     is_approved: false, created_at: '2026-05-19T11:30:00Z', difficulty: 'hard', options: ['Ĥψ₁₀₀ = E₁ · ψ₁₀₀ con E₁ = -13.6 eV', 'Ĥψ = 0', 'Ĥψ = ψ', 'Ĥψ = -ħ²/2m · ψ'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Hidrogeno.pdf' } },
            { id_question: 'q3', statement: 'Explique el principio de exclusión de Pauli aplicado al spin.',       id_node: 144, node: { id_node: 144, name: 'Spin',        description: 'Mecánica cuántica' }, source: 'ai',     is_approved: false, created_at: '2026-05-21T15:00:00Z', difficulty: 'medium', options: ['Dos fermiones no pueden tener todos los números cuánticos iguales', 'Dos bosones se atraen', 'El spin es siempre +1/2', 'Solo aplica a electrones de valencia'], correct_index: 0, source_pdf: { id_pdf: 'p2', original_name: 'Spin-resumen.pdf' } },
        ],
        pdfFiles: [],
    },
    5: {
        id_room: 5,
        name: 'Química Orgánica · 2025·II',
        subject: 'Química orgánica',
        mode: 'group',
        access_code: 'QO3P9K7L',
        is_active: false,
        created_at: '2025-08-20T08:00:00Z',
        id_teacher: 1,
        teacher: { id_user: 1, first_name: 'María', last_name: 'Ramírez', role: 'teacher' },
        students: 56,
        questions: 218,
        pdfs: 7,
        nodes: [
            { id_node: 151, name: 'Nomenclatura',   description: 'Química orgánica' },
            { id_node: 152, name: 'Alquenos',       description: 'Química orgánica' },
            { id_node: 153, name: 'Mecanismos',     description: 'Química orgánica' },
            { id_node: 154, name: 'Estereoquímica', description: 'Química orgánica' },
            { id_node: 155, name: 'Carbonilo',      description: 'Química orgánica' },
        ],
        sections: [
            { id_section: 51, code: 'A', name: 'Curso A · L-M-V 08:00', schedule: 'L-M-V 08:00', capacity: 30, is_active: false, students: 28 },
            { id_section: 52, code: 'B', name: 'Curso B · J 14:00',     schedule: 'J 14:00',     capacity: 30, is_active: false, students: 28 },
        ],
        roster: [
            { id_user: 701, first_name: 'Víctor', last_name: 'Aliaga', username: 'valiaga', membership: { id_section: 51, section: { code: 'A', name: 'Curso A · L-M-V 08:00', schedule: 'L-M-V 08:00' }, joined_at: '2025-08-22T08:00:00Z' }, profile: 'calibrated',    icc_value: 0.86, bkt_mastery: 0.74, metacognitive_gap: 0.04, avg_confidence: 0.78, cells: [0.72, 0.76, 0.74, 0.78, 0.70] },
            { id_user: 702, first_name: 'Wendy',  last_name: 'Mora',   username: 'wmora',   membership: { id_section: 51, section: { code: 'A', name: 'Curso A · L-M-V 08:00', schedule: 'L-M-V 08:00' }, joined_at: '2025-08-23T08:00:00Z' }, profile: 'calibrated',    icc_value: 0.82, bkt_mastery: 0.70, metacognitive_gap: -0.06, avg_confidence: 0.64, cells: [0.68, 0.72, 0.70, 0.74, 0.66] },
            { id_user: 703, first_name: 'Ximena', last_name: 'Pardo',  username: 'xpardo',  membership: { id_section: 52, section: { code: 'B', name: 'Curso B · J 14:00',     schedule: 'J 14:00'     }, joined_at: '2025-08-24T14:00:00Z' }, profile: 'overconfident', icc_value: 0.52, bkt_mastery: 0.55, metacognitive_gap: 0.22, avg_confidence: 0.77, cells: [0.50, 0.58, 0.52, 0.60, 0.54] },
        ],
        questionBank: [
            { id_question: 'q1', statement: 'Nombre el compuesto según las reglas IUPAC.',        id_node: 151, node: { id_node: 151, name: 'Nomenclatura', description: 'Química orgánica' }, source: 'manual', is_approved: true, created_at: '2025-09-02T10:00:00Z', difficulty: 'medium', options: ['2-metilbutano', '3-metilbutano', 'isopentano', 'n-pentano'], correct_index: 0, source_pdf: null },
            { id_question: 'q2', statement: 'Identifique el mecanismo de adición electrofílica.', id_node: 153, node: { id_node: 153, name: 'Mecanismos',   description: 'Química orgánica' }, source: 'ai',     is_approved: true, created_at: '2025-10-15T11:30:00Z', difficulty: 'hard',   options: ['Markovnikov sobre alqueno', 'Sustitución SN2', 'Eliminación E1', 'Reordenamiento de Beckmann'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Mecanismos.pdf' } },
        ],
        pdfFiles: [],
    },
    6: {
        id_room: 6,
        name: 'Bioquímica · Avanzado',
        subject: 'Bioquímica',
        mode: 'group',
        access_code: 'BQ6S4T2H',
        is_active: true,
        created_at: '2026-04-01T08:00:00Z',
        id_teacher: 1,
        teacher: { id_user: 1, first_name: 'María', last_name: 'Ramírez', role: 'teacher' },
        students: 29,
        questions: 84,
        pdfs: 3,
        nodes: [
            { id_node: 161, name: 'Enzimas',          description: 'Bioquímica' },
            { id_node: 162, name: 'Metabolismo',      description: 'Bioquímica' },
            { id_node: 163, name: 'Ácidos nucleicos', description: 'Bioquímica' },
        ],
        sections: [
            { id_section: 61, code: 'U', name: 'Único', schedule: 'M-J 20:00', capacity: 30, is_active: true, students: 29 },
        ],
        roster: [
            { id_user: 801, first_name: 'Yamil', last_name: 'Cortés', username: 'ycortes', membership: { id_section: 61, section: { code: 'U', name: 'Único', schedule: 'M-J 20:00' }, joined_at: '2026-04-03T20:00:00Z' }, profile: 'overconfident', icc_value: 0.41, bkt_mastery: 0.46, metacognitive_gap: 0.34, avg_confidence: 0.80, cells: [0.40, 0.48, 0.44] },
            { id_user: 802, first_name: 'Zoe',   last_name: 'Bernal', username: 'zbernal', membership: { id_section: 61, section: { code: 'U', name: 'Único', schedule: 'M-J 20:00' }, joined_at: '2026-04-04T20:00:00Z' }, profile: 'overconfident', icc_value: 0.44, bkt_mastery: 0.48, metacognitive_gap: 0.30, avg_confidence: 0.78, cells: [0.42, 0.50, 0.46] },
        ],
        questionBank: [
            { id_question: 'q1', statement: 'Describa el mecanismo catalítico de la quimotripsina.',       id_node: 161, node: { id_node: 161, name: 'Enzimas',          description: 'Bioquímica' }, source: 'manual', is_approved: true,  created_at: '2026-04-10T10:00:00Z', difficulty: 'hard',   options: ['Tríada catalítica Ser-His-Asp', 'Sitio activo metálico', 'Cofactor NADH', 'Mecanismo concertado'], correct_index: 0, source_pdf: null },
            { id_question: 'q2', statement: 'Explique la regulación alostérica en la fosfofructoquinasa.', id_node: 162, node: { id_node: 162, name: 'Metabolismo',      description: 'Bioquímica' }, source: 'ai',     is_approved: false, created_at: '2026-05-15T11:30:00Z', difficulty: 'hard',   options: ['ATP inhibe, AMP activa', 'ATP activa, AMP inhibe', 'Solo se regula por pH', 'No tiene regulación'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Metabolismo.pdf' } },
            { id_question: 'q3', statement: 'Detalle el plegamiento de un tRNA.',                          id_node: 163, node: { id_node: 163, name: 'Ácidos nucleicos', description: 'Bioquímica' }, source: 'ai',     is_approved: false, created_at: '2026-05-16T14:00:00Z', difficulty: 'medium', options: ['Forma de trébol con anticodón', 'Doble hélice', 'Hoja β-plegada', 'Triple hélice'], correct_index: 0, source_pdf: { id_pdf: 'p2', original_name: 'Acidos-nucleicos.pdf' } },
        ],
        pdfFiles: [],
    },
    7: {
        id_room: 7,
        name: 'Termodinámica II · 2026·II',
        subject: 'Termodinámica',
        mode: 'group',
        access_code: 'TD9X1Y3Z',
        is_active: true,
        created_at: '2026-08-12T08:00:00Z',
        id_teacher: 1,
        teacher: { id_user: 1, first_name: 'María', last_name: 'Ramírez', role: 'teacher' },
        students: 47,
        questions: 156,
        pdfs: 4,
        nodes: [
            { id_node: 171, name: 'Ciclos',        description: 'Termodinámica clásica' },
            { id_node: 172, name: 'Refrigeración', description: 'Termodinámica aplicada' },
            { id_node: 173, name: 'Combustión',    description: 'Termodinámica aplicada' },
            { id_node: 174, name: 'Exergía',       description: 'Termodinámica aplicada' },
        ],
        sections: [
            { id_section: 71, code: 'A', name: 'Curso A · L-J 11:00', schedule: 'L-J 11:00', capacity: 25, is_active: true, students: 24 },
            { id_section: 72, code: 'B', name: 'Curso B · M-V 15:00', schedule: 'M-V 15:00', capacity: 25, is_active: true, students: 23 },
        ],
        roster: [
            { id_user: 901, first_name: 'Adrián',  last_name: 'Reyes', username: 'areyes', membership: { id_section: 71, section: { code: 'A', name: 'Curso A · L-J 11:00', schedule: 'L-J 11:00' }, joined_at: '2026-08-14T11:00:00Z' }, profile: 'underconfident', icc_value: 0.70, bkt_mastery: 0.74, metacognitive_gap: -0.22, avg_confidence: 0.52, cells: [0.72, 0.76, 0.68, 0.74] },
            { id_user: 902, first_name: 'Brianna', last_name: 'López', username: 'blopez', membership: { id_section: 72, section: { code: 'B', name: 'Curso B · M-V 15:00', schedule: 'M-V 15:00' }, joined_at: '2026-08-15T15:00:00Z' }, profile: 'overconfident',  icc_value: 0.48, bkt_mastery: 0.51, metacognitive_gap: 0.28, avg_confidence: 0.79, cells: [0.46, 0.54, 0.50, 0.48] },
        ],
        questionBank: [
            { id_question: 'q1', statement: 'Calcule la eficiencia de un ciclo de Carnot.',       id_node: 171, node: { id_node: 171, name: 'Ciclos',        description: 'Termodinámica clásica' },  source: 'manual', is_approved: true,  created_at: '2026-08-20T10:00:00Z', difficulty: 'medium', options: ['η = 1 - Tc/Th', 'η = 1 - Th/Tc', 'η = Tc/Th', 'η = Th - Tc'], correct_index: 0, source_pdf: null },
            { id_question: 'q2', statement: 'Analice un ciclo de refrigeración por compresión.', id_node: 172, node: { id_node: 172, name: 'Refrigeración', description: 'Termodinámica aplicada' }, source: 'ai',     is_approved: false, created_at: '2026-09-05T11:30:00Z', difficulty: 'hard',   options: ['Compresor, condensador, válvula, evaporador', 'Solo compresor y evaporador', 'Bomba y caldera', 'Turbina y generador'], correct_index: 0, source_pdf: { id_pdf: 'p1', original_name: 'Refrigeracion.pdf' } },
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


export function formatBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


export function fullName(user) {
    if (!user) return '—';
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || '—';
}


export function bindRoomChange(handler) {
    handler();
    window.addEventListener('cogniroom:roomchange', handler);
}
