export const STUDENT_DATA = {
    profile: {
        first_name: 'Andrea',
        last_name: 'Molina',
        username: 'student1',
        email: 'student1@cogniroom.com',
        institution: 'CogniRoom Demo',
        program: 'Ingeniería Química · 4° año',
        memberSince: '2026-02-15',
        avgIcc: 0.46,
        avgMastery: 0.61,
        predominantProfile: 'overconfident',
        totalSessions: 23,
        totalAnswers: 184,
        streakDays: 5,
        lastActiveAt: '2026-05-25T09:30:00',
        nodesTracked: 6,
        aiDiagnoses: 3,
        preferences: {
            emailNotifications: true,
            weeklyDigest: true,
            aiTutorAlerts: false,
        },
    },

    joinedRooms: [
        {
            id: 1,
            mode: 'group',
            name: 'Termodinámica I · 2026·I',
            subject: 'Termodinámica',
            teacher: 'Dr. Ramírez',
            accessCode: 'TM7A9K2B',
            joinedAt: '2026-03-12',
            lastActivity: 'hoy',
            myIcc: 0.42,
            myMastery: 0.51,
            myProfile: 'overconfident',
            activeNodes: 6,
            pendingSessions: 1,
            totalSessions: 8,
        },
        {
            id: 2,
            mode: 'group',
            name: 'Cinética Química · 2026·I',
            subject: 'Cinética',
            teacher: 'Dra. Valencia',
            accessCode: 'CN4M83GQ',
            joinedAt: '2026-03-20',
            lastActivity: 'ayer',
            myIcc: 0.68,
            myMastery: 0.71,
            myProfile: 'calibrated',
            activeNodes: 4,
            pendingSessions: 0,
            totalSessions: 6,
        },
        {
            id: 3,
            mode: 'group',
            name: 'Fisicoquímica · Repaso',
            subject: 'Fisicoquímica',
            teacher: 'Dr. Ramírez',
            accessCode: 'FQ1P9X4D',
            joinedAt: '2026-04-05',
            lastActivity: '3d',
            myIcc: 0.78,
            myMastery: 0.69,
            myProfile: 'underconfident',
            activeNodes: 3,
            pendingSessions: 2,
            totalSessions: 4,
        },
    ],

    studyRooms: [
        {
            id: 101,
            mode: 'individual',
            name: 'Mi repaso · Equilibrio',
            subject: 'Equilibrio químico',
            teacher: null,
            accessCode: null,
            createdAt: '2026-04-22',
            lastActivity: 'hoy',
            myIcc: 0.55,
            myMastery: 0.58,
            myProfile: 'calibrated',
            activeNodes: 5,
            pendingSessions: 1,
            totalSessions: 5,
            pdfs: 2,
            questions: 18,
        },
        {
            id: 102,
            mode: 'individual',
            name: 'Repaso parcial 2',
            subject: 'Termodinámica',
            teacher: null,
            accessCode: null,
            createdAt: '2026-05-10',
            lastActivity: 'ayer',
            myIcc: 0.49,
            myMastery: 0.52,
            myProfile: 'overconfident',
            activeNodes: 3,
            pendingSessions: 0,
            totalSessions: 2,
            pdfs: 1,
            questions: 9,
        },
    ],

    sessionHistory: [
        { id: 9003, roomId: 1,   roomName: 'Termodinámica I · 2026·I', mode: 'group',      startedAt: '2026-05-25T09:30:00', durationMin: null, answered: 4,  correct: 2,  status: 'in_progress', iccDelta: null,  profile: 'overconfident' },
        { id: 9002, roomId: 101, roomName: 'Mi repaso · Equilibrio',    mode: 'individual', startedAt: '2026-05-24T22:18:00', durationMin: 19,   answered: 11, correct: 8,  status: 'completed',   iccDelta: +0.04, profile: 'calibrated' },
        { id: 9001, roomId: 1,   roomName: 'Termodinámica I · 2026·I', mode: 'group',      startedAt: '2026-05-24T18:12:00', durationMin: 22,   answered: 12, correct: 7,  status: 'completed',   iccDelta: -0.03, profile: 'overconfident' },
        { id: 9000, roomId: 2,   roomName: 'Cinética Química · 2026·I', mode: 'group',      startedAt: '2026-05-23T20:05:00', durationMin: 18,   answered: 10, correct: 8,  status: 'completed',   iccDelta: +0.05, profile: 'calibrated' },
        { id: 8999, roomId: 101, roomName: 'Mi repaso · Equilibrio',    mode: 'individual', startedAt: '2026-05-22T16:30:00', durationMin: 27,   answered: 14, correct: 9,  status: 'completed',   iccDelta: +0.02, profile: 'calibrated' },
        { id: 8998, roomId: 1,   roomName: 'Termodinámica I · 2026·I', mode: 'group',      startedAt: '2026-05-21T19:00:00', durationMin: 15,   answered: 8,  correct: 4,  status: 'completed',   iccDelta: -0.04, profile: 'overconfident' },
        { id: 8997, roomId: 3,   roomName: 'Fisicoquímica · Repaso',    mode: 'group',      startedAt: '2026-05-19T17:45:00', durationMin: 31,   answered: 16, correct: 13, status: 'completed',   iccDelta: +0.08, profile: 'underconfident' },
        { id: 8996, roomId: 102, roomName: 'Repaso parcial 2',          mode: 'individual', startedAt: '2026-05-18T15:20:00', durationMin: 12,   answered: 7,  correct: 4,  status: 'completed',   iccDelta: -0.02, profile: 'overconfident' },
        { id: 8995, roomId: 2,   roomName: 'Cinética Química · 2026·I', mode: 'group',      startedAt: '2026-05-17T21:00:00', durationMin: 24,   answered: 13, correct: 10, status: 'completed',   iccDelta: +0.06, profile: 'calibrated' },
        { id: 8994, roomId: 1,   roomName: 'Termodinámica I · 2026·I', mode: 'group',      startedAt: '2026-05-16T18:30:00', durationMin: 20,   answered: 11, correct: 5,  status: 'completed',   iccDelta: -0.05, profile: 'overconfident' },
        { id: 8993, roomId: 3,   roomName: 'Fisicoquímica · Repaso',    mode: 'group',      startedAt: '2026-05-15T17:00:00', durationMin: 28,   answered: 15, correct: 11, status: 'completed',   iccDelta: +0.03, profile: 'underconfident' },
        { id: 8992, roomId: 101, roomName: 'Mi repaso · Equilibrio',    mode: 'individual', startedAt: '2026-05-14T22:45:00', durationMin: 16,   answered: 9,  correct: 6,  status: 'completed',   iccDelta: +0.01, profile: 'calibrated' },
        { id: 8991, roomId: 2,   roomName: 'Cinética Química · 2026·I', mode: 'group',      startedAt: '2026-05-13T19:30:00', durationMin: 21,   answered: 12, correct: 7,  status: 'completed',   iccDelta: -0.02, profile: 'overconfident' },
        { id: 8990, roomId: 1,   roomName: 'Termodinámica I · 2026·I', mode: 'group',      startedAt: '2026-05-12T20:00:00', durationMin: 17,   answered: 10, correct: 6,  status: 'completed',   iccDelta: -0.03, profile: 'overconfident' },
        { id: 8989, roomId: 3,   roomName: 'Fisicoquímica · Repaso',    mode: 'group',      startedAt: '2026-05-10T16:15:00', durationMin: 33,   answered: 17, correct: 14, status: 'completed',   iccDelta: +0.09, profile: 'underconfident' },
    ],

    diagnosesHistory: [
        {
            id: 5001,
            generated_at: '2026-05-24T18:35:00',
            sessionId: 9001,
            roomName: 'Termodinámica I · 2026·I',
            nodeName: 'Gibbs',
            classification: 'overconfident',
            risk_level: 'high',
            failure_probability: 0.72,
            reasoning: 'Tu mastery en este nodo es 38 pero tu confianza promedio es 66. Es el patrón clásico de sobreconfianza: reconoces los símbolos (ΔG, ΔH, ΔS) pero al aplicarlos cometes errores sistemáticos. En 3 de las últimas 4 preguntas declaraste alta seguridad y fallaste.',
            recommendation: 'Antes de la próxima sesión, derivá ΔG = ΔH − TΔS en una hoja en blanco y aplicala a 2 ejemplos donde el signo de ΔS no coincida con el de ΔG. Repetilo en voz alta.',
        },
        {
            id: 5000,
            generated_at: '2026-05-24T18:18:00',
            sessionId: 9001,
            roomName: 'Termodinámica I · 2026·I',
            nodeName: 'Entropía',
            classification: 'overconfident',
            risk_level: 'medium',
            failure_probability: 0.58,
            reasoning: 'La 2ª ley no es una ley de conservación. Estás mezclando la 1ª ley (conservación de energía) con la 2ª (sentido del tiempo). La 2ª es estadística — un proceso reverso es improbable, no imposible matemáticamente.',
            recommendation: 'Revisá la diferencia entre las dos leyes en tus apuntes y explicate vos en voz alta por qué un huevo no se desrompe.',
        },
        {
            id: 4999,
            generated_at: '2026-05-24T18:16:00',
            sessionId: 9001,
            roomName: 'Termodinámica I · 2026·I',
            nodeName: '1ª ley',
            classification: 'overconfident',
            risk_level: 'medium',
            failure_probability: 0.51,
            reasoning: 'Confundiste presión constante con trabajo nulo. Declaraste 88 de confianza, pero tu mastery real en este nodo es 41. El trabajo solo es cero cuando ΔV = 0 (proceso isocórico), no cuando la presión es constante. Es la confusión más común entre isobárico e isocórico.',
            recommendation: 'Dibujá un diagrama P-V de un proceso isobárico y calculá el área bajo la curva. Eso te va a clavar la relación.',
        },
        {
            id: 4998,
            generated_at: '2026-05-21T19:22:00',
            sessionId: 8998,
            roomName: 'Termodinámica I · 2026·I',
            nodeName: 'Gibbs',
            classification: 'overconfident',
            risk_level: 'high',
            failure_probability: 0.68,
            reasoning: 'Segunda intervención esta semana en el mismo nodo. Tu confianza no baja pese a fallar. Patrón sostenido: declaraste 85 promedio y aciertaste 33% de las preguntas. Es el síntoma típico de un estudiante que estudió el material pero no se autoevalúa críticamente.',
            recommendation: 'Buscá un compañero y enséñale el tema en 5 minutos sin mirar apuntes. Si trabás, ahí está la grieta.',
        },
        {
            id: 4997,
            generated_at: '2026-05-19T18:10:00',
            sessionId: 8997,
            roomName: 'Fisicoquímica · Repaso',
            nodeName: 'Cinética 2°',
            classification: 'underconfident',
            risk_level: 'low',
            failure_probability: 0.18,
            reasoning: 'Sabés más de lo que crees. En las últimas 8 preguntas de este nodo acertaste 7 pero tu confianza promedio fue 52. La subconfianza también es un problema: te lleva a estudiar de más temas que ya dominás y descuidar otros.',
            recommendation: 'En tu próxima sesión, antes de responder, intentá declarar 10-15 puntos más arriba de lo que sientas. Es entrenamiento de calibración.',
        },
        {
            id: 4996,
            generated_at: '2026-05-16T18:45:00',
            sessionId: 8994,
            roomName: 'Termodinámica I · 2026·I',
            nodeName: 'Entropía',
            classification: 'overconfident',
            risk_level: 'medium',
            failure_probability: 0.54,
            reasoning: 'Tercera vez esta semana en el nodo Entropía. La brecha entre confianza (75 promedio) y mastery real (48) se mantiene estable. Esto indica que no estás procesando el feedback que recibís en cada sesión.',
            recommendation: 'Volvé a la revisión de la sesión #8998 y leé tus errores. Reescribí en una hoja por qué fallaste cada uno.',
        },
    ],


    sessionAnswers: {
        9001: [
            {
                id: 'q1', node: '1ª ley',
                statement: 'En un sistema cerrado que recibe 200 J de calor y realiza 50 J de trabajo, ¿cuál es la variación de energía interna?',
                options: [
                    { id: 'a', text: '−150 J' },
                    { id: 'b', text: '+150 J' },
                    { id: 'c', text: '+250 J' },
                    { id: 'd', text: '−250 J' },
                ],
                correctIndex: 1, selectedIndex: 1, isCorrect: true,
                confidenceDeclared: 78, bktMastery: 0.72, aiFeedback: null,
                timeSpentSec: 42,
            },
            {
                id: 'q2', node: '1ª ley',
                statement: 'Un gas ideal se expande isobáricamente. ¿Qué afirmación es correcta?',
                options: [
                    { id: 'a', text: 'No hay trabajo porque la presión es constante.' },
                    { id: 'b', text: 'El trabajo es W = pΔV.' },
                    { id: 'c', text: 'La energía interna no cambia.' },
                    { id: 'd', text: 'El proceso es adiabático.' },
                ],
                correctIndex: 1, selectedIndex: 0, isCorrect: false,
                confidenceDeclared: 88, bktMastery: 0.41,
                aiFeedback: {
                    title: '«Confundiste presión constante con trabajo nulo.»',
                    reasoning: 'Declaraste 88 de confianza, pero tu mastery real en este nodo es 41. El trabajo solo es cero cuando ΔV = 0 (proceso isocórico), no cuando la presión es constante. Es la confusión más común entre isobárico e isocórico.',
                    recommendation: 'Dibujá un diagrama P-V de un proceso isobárico y calculá el área bajo la curva. Eso te va a clavar la relación.',
                },
                timeSpentSec: 65,
            },
            {
                id: 'q3', node: 'Entropía',
                statement: '¿Cuál de los siguientes procesos tiene mayor aumento de entropía del universo?',
                options: [
                    { id: 'a', text: 'Compresión isotérmica reversible.' },
                    { id: 'b', text: 'Expansión libre adiabática de un gas ideal.' },
                    { id: 'c', text: 'Transferencia de calor entre dos cuerpos a misma temperatura.' },
                    { id: 'd', text: 'Cualquier proceso reversible.' },
                ],
                correctIndex: 1, selectedIndex: 1, isCorrect: true,
                confidenceDeclared: 62, bktMastery: 0.58, aiFeedback: null,
                timeSpentSec: 55,
            },
            {
                id: 'q4', node: 'Entropía',
                statement: '¿Por qué la entropía de un sistema aislado nunca disminuye?',
                options: [
                    { id: 'a', text: 'Porque viola la conservación de energía.' },
                    { id: 'b', text: 'Porque sería un proceso espontáneo improbable.' },
                    { id: 'c', text: 'Porque implicaría un descenso de la energía libre.' },
                    { id: 'd', text: 'Porque contradice el teorema H de Boltzmann.' },
                ],
                correctIndex: 1, selectedIndex: 0, isCorrect: false,
                confidenceDeclared: 70, bktMastery: 0.52,
                aiFeedback: {
                    title: '«La 2ª ley no es una ley de conservación.»',
                    reasoning: 'La entropía no se conserva: aumenta. Estás mezclando la 1ª ley (conservación de energía) con la 2ª (sentido del tiempo). La 2ª es estadística — un proceso reverso es improbable, no imposible matemáticamente.',
                    recommendation: 'Revisá la diferencia entre las dos leyes en tus apuntes y explicate vos en voz alta por qué un huevo no se desrompe.',
                },
                timeSpentSec: 78,
            },
            {
                id: 'q5', node: 'Le Chatelier',
                statement: 'Para la reacción N₂(g) + 3H₂(g) ⇌ 2NH₃(g) + calor, ¿qué pasa al aumentar la temperatura?',
                options: [
                    { id: 'a', text: 'Se favorece la formación de NH₃.' },
                    { id: 'b', text: 'Se favorece la formación de N₂ y H₂.' },
                    { id: 'c', text: 'El equilibrio no se altera.' },
                    { id: 'd', text: 'Aumenta la velocidad pero no cambia Keq.' },
                ],
                correctIndex: 1, selectedIndex: 1, isCorrect: true,
                confidenceDeclared: 55, bktMastery: 0.61, aiFeedback: null,
                timeSpentSec: 48,
            },
            {
                id: 'q6', node: 'Le Chatelier',
                statement: 'En un equilibrio gaseoso A(g) ⇌ 2B(g), si reducimos el volumen, ¿hacia dónde se desplaza?',
                options: [
                    { id: 'a', text: 'Hacia A (menos moles de gas).' },
                    { id: 'b', text: 'Hacia B (más moles de gas).' },
                    { id: 'c', text: 'No se desplaza.' },
                    { id: 'd', text: 'Depende de la temperatura.' },
                ],
                correctIndex: 0, selectedIndex: 0, isCorrect: true,
                confidenceDeclared: 80, bktMastery: 0.74, aiFeedback: null,
                timeSpentSec: 35,
            },
            {
                id: 'q7', node: 'Gibbs',
                statement: '¿Qué condición termodinámica define un proceso espontáneo a T y P constantes?',
                options: [
                    { id: 'a', text: 'ΔH < 0' },
                    { id: 'b', text: 'ΔS > 0' },
                    { id: 'c', text: 'ΔG < 0' },
                    { id: 'd', text: 'ΔU < 0' },
                ],
                correctIndex: 2, selectedIndex: 1, isCorrect: false,
                confidenceDeclared: 92, bktMastery: 0.38,
                aiFeedback: {
                    title: '«Cuidado con asumir que “más desorden = espontáneo”.»',
                    reasoning: 'Declaraste 92 de confianza con un nodo en el que tu mastery real es 38. ΔS > 0 NO basta: un proceso puede tener entropía creciente y NO ser espontáneo si ΔH es muy positivo. La condición correcta es ΔG < 0 que combina ambas.',
                    recommendation: 'Repasá la ecuación ΔG = ΔH − TΔS y poné un ejemplo donde ΔS > 0 pero el proceso no sea espontáneo a baja temperatura.',
                },
                timeSpentSec: 95,
            },
            {
                id: 'q8', node: 'Gibbs',
                statement: 'Para una reacción con ΔH = +50 kJ y ΔS = +120 J/K, ¿a qué temperatura se vuelve espontánea?',
                options: [
                    { id: 'a', text: 'A cualquier T (ΔS > 0).' },
                    { id: 'b', text: 'Solo si T > 417 K.' },
                    { id: 'c', text: 'Solo si T < 417 K.' },
                    { id: 'd', text: 'Nunca, porque ΔH > 0.' },
                ],
                correctIndex: 1, selectedIndex: 0, isCorrect: false,
                confidenceDeclared: 65, bktMastery: 0.39,
                aiFeedback: null,
                timeSpentSec: 110,
            },
            {
                id: 'q9', node: '1ª ley',
                statement: '¿En cuál de estos procesos se cumple Q = 0?',
                options: [
                    { id: 'a', text: 'Isotérmico' },
                    { id: 'b', text: 'Adiabático' },
                    { id: 'c', text: 'Isobárico' },
                    { id: 'd', text: 'Isocórico' },
                ],
                correctIndex: 1, selectedIndex: 1, isCorrect: true,
                confidenceDeclared: 90, bktMastery: 0.81, aiFeedback: null,
                timeSpentSec: 28,
            },
            {
                id: 'q10', node: 'Entropía',
                statement: 'Para un gas ideal, ¿qué expresión describe ΔS en un proceso isotérmico reversible?',
                options: [
                    { id: 'a', text: 'ΔS = 0' },
                    { id: 'b', text: 'ΔS = nR ln(V₂/V₁)' },
                    { id: 'c', text: 'ΔS = nCv ln(T₂/T₁)' },
                    { id: 'd', text: 'ΔS = q/T solo si reversible.' },
                ],
                correctIndex: 1, selectedIndex: 3, isCorrect: false,
                confidenceDeclared: 50, bktMastery: 0.49,
                aiFeedback: null,
                timeSpentSec: 88,
            },
            {
                id: 'q11', node: 'Le Chatelier',
                statement: 'Si añadimos un catalizador a un equilibrio químico, ¿qué ocurre?',
                options: [
                    { id: 'a', text: 'Se desplaza hacia los productos.' },
                    { id: 'b', text: 'Aumenta la constante de equilibrio.' },
                    { id: 'c', text: 'Solo acelera el equilibrio sin desplazarlo.' },
                    { id: 'd', text: 'Disminuye la energía libre de los productos.' },
                ],
                correctIndex: 2, selectedIndex: 2, isCorrect: true,
                confidenceDeclared: 85, bktMastery: 0.79, aiFeedback: null,
                timeSpentSec: 40,
            },
            {
                id: 'q12', node: 'Gibbs',
                statement: 'Una reacción tiene ΔG° = −30 kJ/mol a 298 K. ¿Cuál es aproximadamente Keq?',
                options: [
                    { id: 'a', text: '≈ 10⁻⁵' },
                    { id: 'b', text: '≈ 1' },
                    { id: 'c', text: '≈ 10⁵' },
                    { id: 'd', text: '≈ 10²' },
                ],
                correctIndex: 2, selectedIndex: 1, isCorrect: false,
                confidenceDeclared: 40, bktMastery: 0.35, aiFeedback: null,
                timeSpentSec: 105,
            },
        ],
    },


    nodeDetails: {
        'gibbs': {
            id: 'gibbs',
            name: 'Energía libre de Gibbs',
            topic: 'Termodinámica I',
            roomId: 1,
            roomName: 'Termodinámica I · 2026·I',
            pMastery: 0.38, pTransit: 0.09, pGuess: 0.20, pSlip: 0.10,
            attempts: 7,
            iccValue: 0.42, avgConfidence: 0.66, bktMastery: 0.38,
            gap: +0.28, profile: 'overconfident',
            updatedAt: '2026-05-25T10:18:00',
            history: [
                { date: '2026-04-12', icc: 0.55, mastery: 0.30, confidence: 0.55 },
                { date: '2026-04-19', icc: 0.51, mastery: 0.32, confidence: 0.58 },
                { date: '2026-04-26', icc: 0.49, mastery: 0.35, confidence: 0.61 },
                { date: '2026-05-03', icc: 0.47, mastery: 0.34, confidence: 0.62 },
                { date: '2026-05-10', icc: 0.45, mastery: 0.37, confidence: 0.64 },
                { date: '2026-05-17', icc: 0.44, mastery: 0.38, confidence: 0.65 },
                { date: '2026-05-24', icc: 0.42, mastery: 0.38, confidence: 0.66 },
            ],
            recentResponses: [
                { questionId: 'q7', sessionId: 9001, statement: '¿Qué condición termodinámica define un proceso espontáneo a T y P constantes?', isCorrect: false, confidence: 92, when: '2026-05-24T18:12:00' },
                { questionId: 'q8', sessionId: 9001, statement: 'Para una reacción con ΔH = +50 kJ y ΔS = +120 J/K, ¿a qué temperatura se vuelve espontánea?', isCorrect: false, confidence: 65, when: '2026-05-24T18:18:00' },
                { questionId: 'q12', sessionId: 9001, statement: 'Una reacción tiene ΔG° = −30 kJ/mol a 298 K. ¿Cuál es aproximadamente Keq?', isCorrect: false, confidence: 40, when: '2026-05-24T18:32:00' },
                { questionId: 'gx2', sessionId: 8990, statement: 'Identifique signos correctos de ΔG en reacciones endotérmicas a alta T.', isCorrect: true, confidence: 50, when: '2026-05-12T20:11:00' },
                { questionId: 'gx1', sessionId: 8990, statement: 'Calcule ΔG° de una reacción sabiendo ΔH° y ΔS°.', isCorrect: false, confidence: 75, when: '2026-05-12T20:04:00' },
            ],
            diagnosis: {
                title: '«Cuidado con asumir que “más desorden = espontáneo”.»',
                reasoning: 'Tu mastery en este nodo es 38 pero tu confianza promedio es 66. Es el patrón clásico de sobreconfianza: reconoces los símbolos (ΔG, ΔH, ΔS) pero al aplicarlos cometés errores sistemáticos. En 3 de las últimas 4 preguntas declaraste alta seguridad y fallaste.',
                recommendation: 'Antes de la próxima sesión, derivá ΔG = ΔH − TΔS en una hoja en blanco y aplicala a 2 ejemplos donde el signo de ΔS no coincida con el de ΔG. Repetilo en voz alta.',
                generatedAt: '2026-05-24T18:35:00',
            },
            relatedNodes: [
                { id: 'entr', name: 'Entropía', mastery: 0.52, link: '/app/node/entr/' },
                { id: 'enthalpy', name: 'Entalpía', mastery: 0.61, link: '/app/node/enthalpy/' },
                { id: 'ley1', name: '1ª ley', mastery: 0.72, link: '/app/node/ley1/' },
            ],
        },

        'entr': {
            id: 'entr',
            name: 'Entropía y 2ª ley',
            topic: 'Termodinámica I',
            roomId: 1,
            roomName: 'Termodinámica I · 2026·I',
            pMastery: 0.52, pTransit: 0.11, pGuess: 0.20, pSlip: 0.10,
            attempts: 9,
            iccValue: 0.74, avgConfidence: 0.58, bktMastery: 0.52,
            gap: -0.06, profile: 'calibrated',
            updatedAt: '2026-05-24T22:18:00',
            history: [
                { date: '2026-04-10', icc: 0.62, mastery: 0.40, confidence: 0.48 },
                { date: '2026-04-17', icc: 0.66, mastery: 0.43, confidence: 0.52 },
                { date: '2026-04-24', icc: 0.69, mastery: 0.47, confidence: 0.54 },
                { date: '2026-05-01', icc: 0.71, mastery: 0.49, confidence: 0.55 },
                { date: '2026-05-08', icc: 0.72, mastery: 0.50, confidence: 0.56 },
                { date: '2026-05-15', icc: 0.73, mastery: 0.51, confidence: 0.57 },
                { date: '2026-05-22', icc: 0.74, mastery: 0.52, confidence: 0.58 },
            ],
            recentResponses: [
                { questionId: 'q3',  sessionId: 9001, statement: '¿Cuál de los siguientes procesos tiene mayor aumento de entropía del universo?', isCorrect: true, confidence: 62, when: '2026-05-24T18:05:00' },
                { questionId: 'q4',  sessionId: 9001, statement: '¿Por qué la entropía de un sistema aislado nunca disminuye?', isCorrect: false, confidence: 70, when: '2026-05-24T18:09:00' },
                { questionId: 'q10', sessionId: 9001, statement: 'Para un gas ideal, ¿qué expresión describe ΔS en un proceso isotérmico reversible?', isCorrect: false, confidence: 50, when: '2026-05-24T18:25:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'gibbs', name: 'Energía libre de Gibbs', mastery: 0.38, link: '/app/node/gibbs/' },
                { id: 'ley1', name: '1ª ley', mastery: 0.72, link: '/app/node/ley1/' },
            ],
        },

        'ley1': {
            id: 'ley1',
            name: '1ª ley de la termodinámica',
            topic: 'Termodinámica I',
            roomId: 1,
            roomName: 'Termodinámica I · 2026·I',
            pMastery: 0.72, pTransit: 0.08, pGuess: 0.20, pSlip: 0.10,
            attempts: 14,
            iccValue: 0.84, avgConfidence: 0.82, bktMastery: 0.72,
            gap: +0.10, profile: 'calibrated',
            updatedAt: '2026-05-24T18:14:00',
            history: [
                { date: '2026-03-15', icc: 0.71, mastery: 0.50, confidence: 0.58 },
                { date: '2026-03-29', icc: 0.74, mastery: 0.55, confidence: 0.62 },
                { date: '2026-04-12', icc: 0.77, mastery: 0.60, confidence: 0.66 },
                { date: '2026-04-26', icc: 0.79, mastery: 0.64, confidence: 0.71 },
                { date: '2026-05-10', icc: 0.81, mastery: 0.68, confidence: 0.76 },
                { date: '2026-05-24', icc: 0.84, mastery: 0.72, confidence: 0.82 },
            ],
            recentResponses: [
                { questionId: 'q1', sessionId: 9001, statement: 'En un sistema cerrado que recibe 200 J de calor y realiza 50 J de trabajo, ¿cuál es la variación de energía interna?', isCorrect: true, confidence: 78, when: '2026-05-24T18:14:00' },
                { questionId: 'q2', sessionId: 9001, statement: 'Un gas ideal se expande isobáricamente. ¿Qué afirmación es correcta?', isCorrect: false, confidence: 88, when: '2026-05-24T18:16:00' },
                { questionId: 'q9', sessionId: 9001, statement: '¿En cuál de estos procesos se cumple Q = 0?', isCorrect: true, confidence: 90, when: '2026-05-24T18:20:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'entr', name: 'Entropía', mastery: 0.52, link: '/app/node/entr/' },
                { id: 'gibbs', name: 'Gibbs', mastery: 0.38, link: '/app/node/gibbs/' },
            ],
        },

        'ley2': {
            id: 'ley2', name: '2ª ley de la termodinámica', topic: 'Termodinámica I',
            roomId: 1, roomName: 'Termodinámica I · 2026·I',
            pMastery: 0.55, pTransit: 0.09, pGuess: 0.20, pSlip: 0.10,
            attempts: 10,
            iccValue: 0.77, avgConfidence: 0.78, bktMastery: 0.55,
            gap: +0.23, profile: 'overconfident',
            updatedAt: '2026-05-23T20:05:00',
            history: [
                { date: '2026-04-05', icc: 0.71, mastery: 0.42, confidence: 0.62 },
                { date: '2026-04-19', icc: 0.73, mastery: 0.47, confidence: 0.68 },
                { date: '2026-05-03', icc: 0.75, mastery: 0.50, confidence: 0.72 },
                { date: '2026-05-17', icc: 0.76, mastery: 0.53, confidence: 0.76 },
                { date: '2026-05-23', icc: 0.77, mastery: 0.55, confidence: 0.78 },
            ],
            recentResponses: [
                { questionId: 'l2a', sessionId: 9000, statement: 'Una máquina térmica recibe 1000 J y entrega 600 J. ¿Cuál es su eficiencia?', isCorrect: true, confidence: 80, when: '2026-05-23T20:10:00' },
                { questionId: 'l2b', sessionId: 9000, statement: '¿Por qué ninguna máquina real alcanza la eficiencia de Carnot?', isCorrect: false, confidence: 85, when: '2026-05-23T20:14:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'ley1', name: '1ª ley', mastery: 0.72, link: '/app/node/ley1/' },
                { id: 'entr', name: 'Entropía', mastery: 0.52, link: '/app/node/entr/' },
            ],
        },

        'sis': {
            id: 'sis', name: 'Sistemas abiertos', topic: 'Termodinámica I',
            roomId: 1, roomName: 'Termodinámica I · 2026·I',
            pMastery: 0.41, pTransit: 0.10, pGuess: 0.20, pSlip: 0.10,
            attempts: 8,
            iccValue: 0.61, avgConfidence: 0.80, bktMastery: 0.41,
            gap: +0.39, profile: 'overconfident',
            updatedAt: '2026-05-21T19:00:00',
            history: [
                { date: '2026-04-10', icc: 0.50, mastery: 0.30, confidence: 0.62 },
                { date: '2026-04-24', icc: 0.55, mastery: 0.34, confidence: 0.70 },
                { date: '2026-05-08', icc: 0.58, mastery: 0.38, confidence: 0.76 },
                { date: '2026-05-21', icc: 0.61, mastery: 0.41, confidence: 0.80 },
            ],
            recentResponses: [
                { questionId: 'sa1', sessionId: 8998, statement: 'En un sistema abierto en régimen estacionario, ¿qué se conserva?', isCorrect: false, confidence: 88, when: '2026-05-21T19:08:00' },
                { questionId: 'sa2', sessionId: 8998, statement: 'Aplicá el balance de energía a una tobera adiabática.', isCorrect: false, confidence: 75, when: '2026-05-21T19:14:00' },
            ],
            diagnosis: {
                title: '«Estás aplicando la ecuación de sistema cerrado a un sistema abierto.»',
                reasoning: 'Tu confianza promedio (80) está muy por encima de tu mastery (41). Los errores se repiten en problemas que requieren incluir trabajo de flujo (W_flujo = PV).',
                recommendation: 'Antes de la próxima sesión, dibujá un volumen de control con entradas/salidas y enumerá uno por uno los términos del balance.',
                generatedAt: '2026-05-21T19:25:00',
            },
            relatedNodes: [
                { id: 'ley1', name: '1ª ley', mastery: 0.72, link: '/app/node/ley1/' },
                { id: 'ley2', name: '2ª ley', mastery: 0.55, link: '/app/node/ley2/' },
            ],
        },

        'eq': {
            id: 'eq', name: 'Equilibrio químico', topic: 'Equilibrio',
            roomId: 101, roomName: 'Mi repaso · Equilibrio',
            pMastery: 0.62, pTransit: 0.10, pGuess: 0.20, pSlip: 0.10,
            attempts: 9,
            iccValue: 0.74, avgConfidence: 0.74, bktMastery: 0.62,
            gap: +0.12, profile: 'calibrated',
            updatedAt: '2026-05-22T16:30:00',
            history: [
                { date: '2026-04-15', icc: 0.68, mastery: 0.50, confidence: 0.58 },
                { date: '2026-04-29', icc: 0.70, mastery: 0.55, confidence: 0.65 },
                { date: '2026-05-12', icc: 0.72, mastery: 0.58, confidence: 0.70 },
                { date: '2026-05-22', icc: 0.74, mastery: 0.62, confidence: 0.74 },
            ],
            recentResponses: [
                { questionId: 'eq1', sessionId: 8999, statement: '¿Qué significa que Kc >> 1 para una reacción?', isCorrect: true, confidence: 70, when: '2026-05-22T16:40:00' },
                { questionId: 'eq2', sessionId: 8999, statement: 'Calculá Kp dado Kc para N₂ + 3H₂ ⇌ 2NH₃ a 500 K.', isCorrect: true, confidence: 65, when: '2026-05-22T16:50:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'lech', name: 'Le Chatelier', mastery: 0.61, link: '/app/node/lech/' },
                { id: 'kpkc', name: 'Kp / Kc', mastery: 0.70, link: '/app/node/kpkc/' },
            ],
        },

        'lech': {
            id: 'lech', name: 'Principio de Le Chatelier', topic: 'Equilibrio',
            roomId: 101, roomName: 'Mi repaso · Equilibrio',
            pMastery: 0.61, pTransit: 0.10, pGuess: 0.20, pSlip: 0.10,
            attempts: 11,
            iccValue: 0.81, avgConfidence: 0.80, bktMastery: 0.61,
            gap: +0.19, profile: 'overconfident',
            updatedAt: '2026-05-22T16:55:00',
            history: [
                { date: '2026-04-12', icc: 0.74, mastery: 0.45, confidence: 0.62 },
                { date: '2026-04-26', icc: 0.78, mastery: 0.52, confidence: 0.70 },
                { date: '2026-05-10', icc: 0.80, mastery: 0.57, confidence: 0.76 },
                { date: '2026-05-22', icc: 0.81, mastery: 0.61, confidence: 0.80 },
            ],
            recentResponses: [
                { questionId: 'le1', sessionId: 9001, statement: 'Para N₂ + 3H₂ ⇌ 2NH₃ + calor, ¿qué pasa al aumentar T?', isCorrect: true, confidence: 55, when: '2026-05-24T18:22:00' },
                { questionId: 'le2', sessionId: 9001, statement: 'En A(g) ⇌ 2B(g), si reducimos V, ¿hacia dónde se desplaza?', isCorrect: true, confidence: 80, when: '2026-05-24T18:25:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'eq', name: 'Equilibrio químico', mastery: 0.62, link: '/app/node/eq/' },
                { id: 'kpkc', name: 'Kp / Kc', mastery: 0.70, link: '/app/node/kpkc/' },
            ],
        },

        'kpkc': {
            id: 'kpkc', name: 'Constantes Kp y Kc', topic: 'Equilibrio',
            roomId: 101, roomName: 'Mi repaso · Equilibrio',
            pMastery: 0.70, pTransit: 0.08, pGuess: 0.20, pSlip: 0.10,
            attempts: 7,
            iccValue: 0.86, avgConfidence: 0.66, bktMastery: 0.70,
            gap: -0.04, profile: 'calibrated',
            updatedAt: '2026-05-14T22:45:00',
            history: [
                { date: '2026-04-20', icc: 0.78, mastery: 0.55, confidence: 0.52 },
                { date: '2026-05-04', icc: 0.82, mastery: 0.62, confidence: 0.60 },
                { date: '2026-05-14', icc: 0.86, mastery: 0.70, confidence: 0.66 },
            ],
            recentResponses: [
                { questionId: 'kk1', sessionId: 8992, statement: '¿Cómo se relacionan Kp y Kc para una reacción gaseosa?', isCorrect: true, confidence: 60, when: '2026-05-14T22:52:00' },
                { questionId: 'kk2', sessionId: 8992, statement: 'Para una reacción Δn=0, ¿qué relación hay entre Kp y Kc?', isCorrect: true, confidence: 70, when: '2026-05-14T22:55:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'eq', name: 'Equilibrio químico', mastery: 0.62, link: '/app/node/eq/' },
                { id: 'lech', name: 'Le Chatelier', mastery: 0.61, link: '/app/node/lech/' },
            ],
        },

        'cin1': {
            id: 'cin1', name: 'Velocidad de reacción', topic: 'Cinética',
            roomId: 2, roomName: 'Cinética Química · 2026·I',
            pMastery: 0.66, pTransit: 0.09, pGuess: 0.20, pSlip: 0.10,
            attempts: 9,
            iccValue: 0.79, avgConfidence: 0.55, bktMastery: 0.66,
            gap: -0.11, profile: 'calibrated',
            updatedAt: '2026-05-23T20:05:00',
            history: [
                { date: '2026-04-08', icc: 0.72, mastery: 0.50, confidence: 0.42 },
                { date: '2026-04-22', icc: 0.75, mastery: 0.56, confidence: 0.48 },
                { date: '2026-05-06', icc: 0.77, mastery: 0.61, confidence: 0.52 },
                { date: '2026-05-23', icc: 0.79, mastery: 0.66, confidence: 0.55 },
            ],
            recentResponses: [
                { questionId: 'cn1', sessionId: 9000, statement: '¿Cómo se define la velocidad de una reacción química?', isCorrect: true, confidence: 50, when: '2026-05-23T20:08:00' },
                { questionId: 'cn2', sessionId: 9000, statement: '¿Qué unidades tiene la velocidad de reacción?', isCorrect: true, confidence: 65, when: '2026-05-23T20:13:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'cin2', name: 'Reacciones 2° orden', mastery: 0.74, link: '/app/node/cin2/' },
                { id: 'act', name: 'Energía de activación', mastery: 0.68, link: '/app/node/act/' },
            ],
        },

        'cin2': {
            id: 'cin2', name: 'Reacciones de 2° orden', topic: 'Cinética',
            roomId: 2, roomName: 'Cinética Química · 2026·I',
            pMastery: 0.74, pTransit: 0.08, pGuess: 0.20, pSlip: 0.10,
            attempts: 12,
            iccValue: 0.82, avgConfidence: 0.58, bktMastery: 0.74,
            gap: -0.16, profile: 'underconfident',
            updatedAt: '2026-05-17T21:00:00',
            history: [
                { date: '2026-03-25', icc: 0.71, mastery: 0.50, confidence: 0.42 },
                { date: '2026-04-08', icc: 0.74, mastery: 0.58, confidence: 0.47 },
                { date: '2026-04-22', icc: 0.77, mastery: 0.65, confidence: 0.51 },
                { date: '2026-05-06', icc: 0.80, mastery: 0.70, confidence: 0.55 },
                { date: '2026-05-17', icc: 0.82, mastery: 0.74, confidence: 0.58 },
            ],
            recentResponses: [
                { questionId: 'c2a', sessionId: 8995, statement: 'Para una reacción de 2° orden, ¿qué gráfico es lineal?', isCorrect: true, confidence: 55, when: '2026-05-17T21:10:00' },
                { questionId: 'c2b', sessionId: 8995, statement: '¿Cuál es la vida media de una reacción 2° orden?', isCorrect: true, confidence: 60, when: '2026-05-17T21:18:00' },
            ],
            diagnosis: {
                title: '«Sabes más de lo que crees.»',
                reasoning: 'Tu mastery en reacciones 2° orden es 74 pero declaraste solo 58 de confianza. La subconfianza te lleva a estudiar de más temas que ya dominás.',
                recommendation: 'En tu próxima sesión, antes de responder, declará 10-15 puntos más arriba de lo que sientas. Es entrenamiento de calibración.',
                generatedAt: '2026-05-17T21:30:00',
            },
            relatedNodes: [
                { id: 'cin1', name: 'Velocidad', mastery: 0.66, link: '/app/node/cin1/' },
                { id: 'act', name: 'E. activación', mastery: 0.68, link: '/app/node/act/' },
            ],
        },

        'act': {
            id: 'act', name: 'Energía de activación', topic: 'Cinética',
            roomId: 2, roomName: 'Cinética Química · 2026·I',
            pMastery: 0.68, pTransit: 0.09, pGuess: 0.20, pSlip: 0.10,
            attempts: 8,
            iccValue: 0.81, avgConfidence: 0.49, bktMastery: 0.68,
            gap: -0.19, profile: 'underconfident',
            updatedAt: '2026-05-13T19:30:00',
            history: [
                { date: '2026-04-01', icc: 0.72, mastery: 0.52, confidence: 0.40 },
                { date: '2026-04-15', icc: 0.76, mastery: 0.58, confidence: 0.44 },
                { date: '2026-04-29', icc: 0.79, mastery: 0.63, confidence: 0.47 },
                { date: '2026-05-13', icc: 0.81, mastery: 0.68, confidence: 0.49 },
            ],
            recentResponses: [
                { questionId: 'ea1', sessionId: 8991, statement: 'Aplicá la ecuación de Arrhenius para calcular Ea.', isCorrect: true, confidence: 45, when: '2026-05-13T19:35:00' },
                { questionId: 'ea2', sessionId: 8991, statement: '¿Qué relación hay entre temperatura y velocidad?', isCorrect: true, confidence: 55, when: '2026-05-13T19:42:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'cin1', name: 'Velocidad', mastery: 0.66, link: '/app/node/cin1/' },
                { id: 'cat', name: 'Catálisis', mastery: 0.81, link: '/app/node/cat/' },
            ],
        },

        'cat': {
            id: 'cat', name: 'Catálisis', topic: 'Cinética',
            roomId: 2, roomName: 'Cinética Química · 2026·I',
            pMastery: 0.81, pTransit: 0.06, pGuess: 0.20, pSlip: 0.08,
            attempts: 6,
            iccValue: 0.91, avgConfidence: 0.72, bktMastery: 0.81,
            gap: -0.09, profile: 'calibrated',
            updatedAt: '2026-05-10T16:15:00',
            history: [
                { date: '2026-04-18', icc: 0.82, mastery: 0.65, confidence: 0.55 },
                { date: '2026-05-02', icc: 0.86, mastery: 0.72, confidence: 0.63 },
                { date: '2026-05-10', icc: 0.91, mastery: 0.81, confidence: 0.72 },
            ],
            recentResponses: [
                { questionId: 'ca1', sessionId: 8989, statement: '¿Cómo afecta un catalizador a la energía de activación?', isCorrect: true, confidence: 75, when: '2026-05-10T16:20:00' },
                { questionId: 'ca2', sessionId: 8989, statement: 'Diferencia entre catálisis homogénea y heterogénea.', isCorrect: true, confidence: 70, when: '2026-05-10T16:27:00' },
            ],
            diagnosis: null,
            relatedNodes: [
                { id: 'act', name: 'E. activación', mastery: 0.68, link: '/app/node/act/' },
                { id: 'cin2', name: 'Reacc. 2° orden', mastery: 0.74, link: '/app/node/cin2/' },
            ],
        },
    },
};


const QUESTION_POOL = [
    {
        id: 'p01', node: '1ª ley',
        statement: 'En un proceso isobárico a 2 atm, un gas se expande de 1 L a 3 L. ¿Cuál es el trabajo realizado?',
        options: [
            { id: 'a', text: '0 J (presión constante)' },
            { id: 'b', text: '+405 J' },
            { id: 'c', text: '−405 J' },
            { id: 'd', text: '+202 J' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p02', node: '1ª ley',
        statement: '¿Qué afirmación sobre un proceso adiabático es correcta?',
        options: [
            { id: 'a', text: 'No hay variación de temperatura.' },
            { id: 'b', text: 'No hay intercambio de calor.' },
            { id: 'c', text: 'No hay trabajo realizado.' },
            { id: 'd', text: 'La presión permanece constante.' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p03', node: 'Entropía',
        statement: '¿Cuál de los siguientes procesos produce mayor aumento de entropía?',
        options: [
            { id: 'a', text: 'Compresión isotérmica reversible.' },
            { id: 'b', text: 'Mezcla de dos gases ideales distintos.' },
            { id: 'c', text: 'Solidificación de un líquido.' },
            { id: 'd', text: 'Cualquier proceso reversible.' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p04', node: 'Entropía',
        statement: 'Para un gas ideal en expansión libre adiabática, ΔS del sistema es:',
        options: [
            { id: 'a', text: 'Negativo' },
            { id: 'b', text: 'Cero' },
            { id: 'c', text: 'Positivo' },
            { id: 'd', text: 'Indefinido' },
        ],
        correctIndex: 2,
    },
    {
        id: 'p05', node: 'Gibbs',
        statement: '¿Cuál es la condición termodinámica de espontaneidad a T y P constantes?',
        options: [
            { id: 'a', text: 'ΔH < 0' },
            { id: 'b', text: 'ΔS > 0' },
            { id: 'c', text: 'ΔG < 0' },
            { id: 'd', text: 'ΔU = 0' },
        ],
        correctIndex: 2,
    },
    {
        id: 'p06', node: 'Gibbs',
        statement: 'Si ΔH > 0 y ΔS > 0, ¿cuándo es espontánea la reacción?',
        options: [
            { id: 'a', text: 'A cualquier T' },
            { id: 'b', text: 'A T alta' },
            { id: 'c', text: 'A T baja' },
            { id: 'd', text: 'Nunca' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p07', node: 'Le Chatelier',
        statement: 'Para 2SO₂ + O₂ ⇌ 2SO₃ + calor, al aumentar T el equilibrio:',
        options: [
            { id: 'a', text: 'Se desplaza a productos' },
            { id: 'b', text: 'Se desplaza a reactivos' },
            { id: 'c', text: 'No se altera' },
            { id: 'd', text: 'Depende de la P' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p08', node: 'Le Chatelier',
        statement: '¿Cómo afecta agregar un catalizador a un equilibrio químico?',
        options: [
            { id: 'a', text: 'Desplaza a productos' },
            { id: 'b', text: 'Desplaza a reactivos' },
            { id: 'c', text: 'Acelera pero no desplaza' },
            { id: 'd', text: 'Cambia Keq' },
        ],
        correctIndex: 2,
    },
    {
        id: 'p09', node: 'Eq. químico',
        statement: 'Si Kc = 100 para A ⇌ B a 300 K, ¿qué significa?',
        options: [
            { id: 'a', text: 'En equilibrio hay 100× más A que B' },
            { id: 'b', text: 'En equilibrio hay 100× más B que A' },
            { id: 'c', text: 'No hay reactivos' },
            { id: 'd', text: 'La reacción es muy lenta' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p10', node: 'Eq. químico',
        statement: 'Relación entre Kp y Kc para una reacción gaseosa con Δn = 2:',
        options: [
            { id: 'a', text: 'Kp = Kc' },
            { id: 'b', text: 'Kp = Kc · (RT)²' },
            { id: 'c', text: 'Kp = Kc / RT' },
            { id: 'd', text: 'Kp = 2 Kc' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p11', node: 'Cinética 2°',
        statement: 'Para una reacción 2° orden A → P, ¿qué gráfico da línea recta?',
        options: [
            { id: 'a', text: '[A] vs t' },
            { id: 'b', text: 'ln[A] vs t' },
            { id: 'c', text: '1/[A] vs t' },
            { id: 'd', text: '[A]² vs t' },
        ],
        correctIndex: 2,
    },
    {
        id: 'p12', node: 'Cinética 2°',
        statement: 'Vida media de una reacción 2° orden:',
        options: [
            { id: 'a', text: 'Es independiente de [A]₀' },
            { id: 'b', text: 'Aumenta con [A]₀' },
            { id: 'c', text: 'Disminuye con [A]₀' },
            { id: 'd', text: 'No depende del orden' },
        ],
        correctIndex: 2,
    },
    {
        id: 'p13', node: 'Velocidad',
        statement: 'La velocidad inicial de una reacción se duplica al duplicar [A]. El orden respecto a A es:',
        options: [
            { id: 'a', text: '0' },
            { id: 'b', text: '1' },
            { id: 'c', text: '2' },
            { id: 'd', text: '½' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p14', node: 'E. activación',
        statement: 'Según Arrhenius, al aumentar T:',
        options: [
            { id: 'a', text: 'Ea aumenta' },
            { id: 'b', text: 'k disminuye' },
            { id: 'c', text: 'k aumenta exponencialmente' },
            { id: 'd', text: 'k no cambia' },
        ],
        correctIndex: 2,
    },
    {
        id: 'p15', node: 'Catálisis',
        statement: '¿Qué hace un catalizador en una reacción?',
        options: [
            { id: 'a', text: 'Cambia ΔH' },
            { id: 'b', text: 'Reduce Ea' },
            { id: 'c', text: 'Aumenta Keq' },
            { id: 'd', text: 'Cambia los productos' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p16', node: 'Sistemas abiertos',
        statement: 'En un sistema abierto en régimen estacionario, ¿qué cantidad se conserva?',
        options: [
            { id: 'a', text: 'La masa total dentro del volumen' },
            { id: 'b', text: 'El flujo másico (entra = sale)' },
            { id: 'c', text: 'La energía interna dentro del volumen' },
            { id: 'd', text: 'La entropía dentro del volumen' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p17', node: '2ª ley',
        statement: '¿Cuál es la eficiencia máxima de un ciclo entre 600 K y 300 K?',
        options: [
            { id: 'a', text: '25%' },
            { id: 'b', text: '50%' },
            { id: 'c', text: '75%' },
            { id: 'd', text: '100%' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p18', node: '2ª ley',
        statement: 'Una bomba de calor con COP = 4 entrega 4 kJ por cada 1 kJ consumido. ¿Eso viola la 1ª ley?',
        options: [
            { id: 'a', text: 'Sí, sale más energía de la que entra' },
            { id: 'b', text: 'No, la energía extra viene del foco frío' },
            { id: 'c', text: 'Sí, viola conservación de masa' },
            { id: 'd', text: 'No, porque es adiabático' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p19', node: 'Kp / Kc',
        statement: 'Para una reacción con Δn = 0, ¿qué relación hay entre Kp y Kc?',
        options: [
            { id: 'a', text: 'Kp = Kc · RT' },
            { id: 'b', text: 'Kp = Kc' },
            { id: 'c', text: 'Kp = Kc / RT' },
            { id: 'd', text: 'No hay relación' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p20', node: 'Entalpía',
        statement: 'En una reacción endotérmica, ΔH:',
        options: [
            { id: 'a', text: 'Es positivo' },
            { id: 'b', text: 'Es negativo' },
            { id: 'c', text: 'Es cero' },
            { id: 'd', text: 'No se define' },
        ],
        correctIndex: 0,
    },
    {
        id: 'p21', node: '1ª ley',
        statement: 'Para un ciclo termodinámico, ΔU del sistema es:',
        options: [
            { id: 'a', text: 'Siempre positivo' },
            { id: 'b', text: 'Siempre cero' },
            { id: 'c', text: 'Igual a Q' },
            { id: 'd', text: 'Igual a W' },
        ],
        correctIndex: 1,
    },
    {
        id: 'p22', node: 'Entropía',
        statement: 'En la fusión del hielo a 0 °C, ΔS del sistema:',
        options: [
            { id: 'a', text: 'Disminuye' },
            { id: 'b', text: 'Es cero' },
            { id: 'c', text: 'Aumenta' },
            { id: 'd', text: 'Depende de la P' },
        ],
        correctIndex: 2,
    },
    {
        id: 'p23', node: 'Gibbs',
        statement: 'Si ΔG° = −20 kJ/mol a 298 K, ¿Keq es aproximadamente?',
        options: [
            { id: 'a', text: '≈ 10⁻⁴' },
            { id: 'b', text: '≈ 1' },
            { id: 'c', text: '≈ 3000' },
            { id: 'd', text: '≈ 10' },
        ],
        correctIndex: 2,
    },
    {
        id: 'p24', node: 'Velocidad',
        statement: 'Las unidades de la constante k para una reacción 1° orden son:',
        options: [
            { id: 'a', text: 'mol/L·s' },
            { id: 'b', text: '1/s' },
            { id: 'c', text: 'L/mol·s' },
            { id: 'd', text: 's' },
        ],
        correctIndex: 1,
    },
];


const AI_FEEDBACK_BANK = {
    overconfident: [
        {
            title: '«Tu seguridad va más rápido que tu dominio.»',
            reasoning: 'Declaraste alta confianza pero tu probabilidad real de acertar este tipo de pregunta está bastante por debajo. Es el patrón típico del estudiante que estudió el material pero no se autoevalúa críticamente.',
            recommendation: 'Antes de la próxima sesión, intentá enunciar el concepto en tus propias palabras y aplicarlo a un caso que NO esté en el apunte.',
        },
        {
            title: '«Confianza alta y respuesta incorrecta es la combinación más peligrosa.»',
            reasoning: 'Cuando declaramos seguridad y fallamos, no aprendemos del error porque ni siquiera reconocemos que estaba ahí. Tu mastery real está varios puntos abajo de lo que asumiste.',
            recommendation: 'Buscá un compañero y enseñale este tema sin mirar apuntes. Si te trabás explicando, ahí está la grieta.',
        },
    ],
    underconfident: [
        {
            title: '«Sabés más de lo que crees.»',
            reasoning: 'Tu mastery en este nodo es mayor a tu confianza declarada. La subconfianza también es un problema: te lleva a estudiar de más temas que ya dominás.',
            recommendation: 'En tu próxima sesión, antes de responder, declará 10-15 puntos más arriba de lo que sientas. Es entrenamiento de calibración.',
        },
    ],
    calibrated: [],
};


function seededShuffle(arr, seed) {
    const out = arr.slice();
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}


export function generateAnswersForSession(session) {
    if (!session) return [];
    const n = session.answered || 8;
    const correctCount = Math.min(session.correct || 0, n);
    const profile = session.profile || 'calibrated';

    const shuffled = seededShuffle(QUESTION_POOL, session.id);
    const picks = shuffled.slice(0, n);
    const correctMask = seededShuffle(
        Array.from({ length: n }, (_, i) => i < correctCount),
        session.id + 13,
    );

    let aiCount = 0;
    const aiMax = profile === 'overconfident' ? 3 : profile === 'underconfident' ? 1 : 0;
    const aiBank = AI_FEEDBACK_BANK[profile] || [];

    return picks.map((q, i) => {
        const isCorrect = correctMask[i];

        let selectedIndex;
        if (isCorrect) {
            selectedIndex = q.correctIndex;
        } else {
            const wrongs = [0, 1, 2, 3].filter((k) => k !== q.correctIndex);
            selectedIndex = wrongs[(session.id + i) % wrongs.length];
        }

        let confidenceDeclared;
        if (profile === 'overconfident') {
            confidenceDeclared = isCorrect ? 70 + ((session.id + i) % 20) : 75 + ((session.id + i) % 20);
        } else if (profile === 'underconfident') {
            confidenceDeclared = isCorrect ? 45 + ((session.id + i) % 20) : 35 + ((session.id + i) % 20);
        } else {
            confidenceDeclared = (isCorrect ? 65 : 45) + ((session.id + i) % 15);
        }

        const bktMastery = isCorrect
            ? 0.55 + ((session.id + i) % 25) / 100
            : 0.30 + ((session.id + i) % 25) / 100;

        let aiFeedback = null;
        if (!isCorrect && aiCount < aiMax && aiBank.length > 0 && confidenceDeclared >= 70) {
            aiFeedback = aiBank[aiCount % aiBank.length];
            aiCount++;
        }

        return {
            id: `${session.id}-q${i + 1}`,
            node: q.node,
            statement: q.statement,
            options: q.options,
            correctIndex: q.correctIndex,
            selectedIndex,
            isCorrect,
            confidenceDeclared,
            bktMastery: Math.min(0.95, bktMastery),
            aiFeedback,
            timeSpentSec: 30 + ((session.id + i * 7) % 80),
        };
    });
}


export function escapeHTML(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}


export function profileLabel(profile) {
    return ({
        calibrated: 'Calibrado',
        overconfident: 'Sobreconfiado',
        underconfident: 'Subconfiado',
    })[profile] || 'Sin perfil';
}


export function profileTone(profile) {
    return ({
        calibrated: 'moss',
        overconfident: 'amber',
        underconfident: 'stone',
    })[profile] || 'moss';
}


export function gapTone(gap) {
    if (gap > 0.15)  return 'amber';
    if (gap < -0.15) return 'stone';
    return 'moss';
}


export function healthTone(icc) {
    if (icc >= 0.65) return 'moss';
    if (icc >= 0.5)  return 'amber';
    return 'rust';
}


export function fmt(n, digits = 2) {
    if (n == null || Number.isNaN(n)) return '—';
    return Number(n).toFixed(digits);
}
