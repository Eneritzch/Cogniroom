export const STUDENT_DATA = {
    profile: {
        id_user: 2001,
        first_name: 'Andrea',
        last_name: 'Molina',
        username: 'student1',
        email: 'student1@cogniroom.com',
        role: 'student',
        institution: 'CogniRoom Demo',
        date_joined: '2026-02-15T09:00:00Z',
        avgIcc: 0.46,
        avgMastery: 0.61,
        totalSessions: 23,
        totalAnswers: 184,
        nodesTracked: 6,
        aiDiagnoses: 3,
    },

    joinedRooms: [
        {
            id_room: 1,
            mode: 'group',
            name: 'Termodinámica I · 2026·I',
            subject: 'Termodinámica',
            access_code: 'TM7A9K2B',
            is_active: true,
            created_at: '2026-03-01T08:00:00Z',
            teacher: {
                id_user: 1001,
                first_name: 'Carlos',
                last_name: 'Ramírez',
                role: 'teacher',
            },
            membership: {
                joined_at: '2026-03-12T10:15:00Z',
                section: {
                    id_section: 11,
                    code: 'A',
                    name: 'Curso A',
                    schedule: 'L-M-V 10:00',
                    capacity: 40,
                    is_active: true,
                },
            },
            activeNodes: 6,
            totalSessions: 8,
        },
        {
            id_room: 2,
            mode: 'group',
            name: 'Cinética Química · 2026·I',
            subject: 'Cinética',
            access_code: 'CN4M83GQ',
            is_active: true,
            created_at: '2026-03-05T09:30:00Z',
            teacher: {
                id_user: 1002,
                first_name: 'Lucía',
                last_name: 'Valencia',
                role: 'teacher',
            },
            membership: {
                joined_at: '2026-03-20T11:00:00Z',
                section: {
                    id_section: 21,
                    code: 'B',
                    name: 'Curso B',
                    schedule: 'M-J 14:00',
                    capacity: 35,
                    is_active: true,
                },
            },
            activeNodes: 4,
            totalSessions: 6,
        },
        {
            id_room: 3,
            mode: 'group',
            name: 'Fisicoquímica · Repaso',
            subject: 'Fisicoquímica',
            access_code: 'FQ1P9X4D',
            is_active: true,
            created_at: '2026-03-25T12:00:00Z',
            teacher: {
                id_user: 1001,
                first_name: 'Carlos',
                last_name: 'Ramírez',
                role: 'teacher',
            },
            membership: {
                joined_at: '2026-04-05T09:45:00Z',
                section: {
                    id_section: 31,
                    code: 'C',
                    name: 'Curso C',
                    schedule: 'V 18:00',
                    capacity: 30,
                    is_active: true,
                },
            },
            activeNodes: 3,
            totalSessions: 4,
        },
    ],

    studyRooms: [
        {
            id_room: 101,
            mode: 'individual',
            name: 'Mi repaso · Equilibrio',
            subject: 'Equilibrio químico',
            access_code: 'EQ8R3K1M',
            is_active: true,
            created_at: '2026-04-22T16:30:00Z',
            id_teacher: 2001,
            teacher: {
                id_user: 2001,
                first_name: 'Andrea',
                last_name: 'Molina',
                role: 'student',
            },
            activeNodes: 5,
            totalSessions: 5,
            pdfs: 2,
            questions: 18,
        },
        {
            id_room: 102,
            mode: 'individual',
            name: 'Repaso parcial 2',
            subject: 'Termodinámica',
            access_code: 'TR2L9Q8V',
            is_active: true,
            created_at: '2026-05-10T19:20:00Z',
            id_teacher: 2001,
            teacher: {
                id_user: 2001,
                first_name: 'Andrea',
                last_name: 'Molina',
                role: 'student',
            },
            activeNodes: 3,
            totalSessions: 2,
            pdfs: 1,
            questions: 9,
        },
    ],

    sessionHistory: [
        { id_session: 9003, id_room: 1,   room: { id_room: 1,   name: 'Termodinámica I · 2026·I', mode: 'group'      }, started_at: '2026-05-25T09:30:00Z', finished_at: null,                  durationMin: null, answered: 4,  correct: 2,  status: 'active',    profile: 'overconfident' },
        { id_session: 9002, id_room: 101, room: { id_room: 101, name: 'Mi repaso · Equilibrio',    mode: 'individual' }, started_at: '2026-05-24T22:18:00Z', finished_at: '2026-05-24T22:37:00Z', durationMin: 19,   answered: 11, correct: 8,  status: 'completed', profile: 'calibrated' },
        { id_session: 9001, id_room: 1,   room: { id_room: 1,   name: 'Termodinámica I · 2026·I', mode: 'group'      }, started_at: '2026-05-24T18:12:00Z', finished_at: '2026-05-24T18:34:00Z', durationMin: 22,   answered: 12, correct: 7,  status: 'completed', profile: 'overconfident' },
        { id_session: 9000, id_room: 2,   room: { id_room: 2,   name: 'Cinética Química · 2026·I', mode: 'group'      }, started_at: '2026-05-23T20:05:00Z', finished_at: '2026-05-23T20:23:00Z', durationMin: 18,   answered: 10, correct: 8,  status: 'completed', profile: 'calibrated' },
        { id_session: 8999, id_room: 101, room: { id_room: 101, name: 'Mi repaso · Equilibrio',    mode: 'individual' }, started_at: '2026-05-22T16:30:00Z', finished_at: '2026-05-22T16:57:00Z', durationMin: 27,   answered: 14, correct: 9,  status: 'completed', profile: 'calibrated' },
        { id_session: 8998, id_room: 1,   room: { id_room: 1,   name: 'Termodinámica I · 2026·I', mode: 'group'      }, started_at: '2026-05-21T19:00:00Z', finished_at: '2026-05-21T19:15:00Z', durationMin: 15,   answered: 8,  correct: 4,  status: 'completed', profile: 'overconfident' },
        { id_session: 8997, id_room: 3,   room: { id_room: 3,   name: 'Fisicoquímica · Repaso',    mode: 'group'      }, started_at: '2026-05-19T17:45:00Z', finished_at: '2026-05-19T18:16:00Z', durationMin: 31,   answered: 16, correct: 13, status: 'completed', profile: 'underconfident' },
        { id_session: 8996, id_room: 102, room: { id_room: 102, name: 'Repaso parcial 2',          mode: 'individual' }, started_at: '2026-05-18T15:20:00Z', finished_at: '2026-05-18T15:32:00Z', durationMin: 12,   answered: 7,  correct: 4,  status: 'completed', profile: 'overconfident' },
        { id_session: 8995, id_room: 2,   room: { id_room: 2,   name: 'Cinética Química · 2026·I', mode: 'group'      }, started_at: '2026-05-17T21:00:00Z', finished_at: '2026-05-17T21:24:00Z', durationMin: 24,   answered: 13, correct: 10, status: 'completed', profile: 'calibrated' },
        { id_session: 8994, id_room: 1,   room: { id_room: 1,   name: 'Termodinámica I · 2026·I', mode: 'group'      }, started_at: '2026-05-16T18:30:00Z', finished_at: '2026-05-16T18:50:00Z', durationMin: 20,   answered: 11, correct: 5,  status: 'completed', profile: 'overconfident' },
        { id_session: 8993, id_room: 3,   room: { id_room: 3,   name: 'Fisicoquímica · Repaso',    mode: 'group'      }, started_at: '2026-05-15T17:00:00Z', finished_at: '2026-05-15T17:28:00Z', durationMin: 28,   answered: 15, correct: 11, status: 'completed', profile: 'underconfident' },
        { id_session: 8992, id_room: 101, room: { id_room: 101, name: 'Mi repaso · Equilibrio',    mode: 'individual' }, started_at: '2026-05-14T22:45:00Z', finished_at: '2026-05-14T23:01:00Z', durationMin: 16,   answered: 9,  correct: 6,  status: 'completed', profile: 'calibrated' },
        { id_session: 8991, id_room: 2,   room: { id_room: 2,   name: 'Cinética Química · 2026·I', mode: 'group'      }, started_at: '2026-05-13T19:30:00Z', finished_at: '2026-05-13T19:51:00Z', durationMin: 21,   answered: 12, correct: 7,  status: 'completed', profile: 'overconfident' },
        { id_session: 8990, id_room: 1,   room: { id_room: 1,   name: 'Termodinámica I · 2026·I', mode: 'group'      }, started_at: '2026-05-12T20:00:00Z', finished_at: '2026-05-12T20:17:00Z', durationMin: 17,   answered: 10, correct: 6,  status: 'completed', profile: 'overconfident' },
        { id_session: 8989, id_room: 3,   room: { id_room: 3,   name: 'Fisicoquímica · Repaso',    mode: 'group'      }, started_at: '2026-05-10T16:15:00Z', finished_at: '2026-05-10T16:48:00Z', durationMin: 33,   answered: 17, correct: 14, status: 'completed', profile: 'underconfident' },
    ],

    diagnosesHistory: [
        {
            id_ai: 5001,
            generated_at: '2026-05-24T18:35:00Z',
            id_session: 9001,
            room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            title: 'Tendencia a sobreestimar dominio en energía libre de Gibbs',
            node: { id_node: 'gibbs', name: 'Energía libre de Gibbs', description: 'Termodinámica clásica' },
            risk_node: ['Gibbs'],
            classification: 'overconfident',
            risk_level: 'high',
            failure_probability: 0.72,
            reasoning: 'Tu mastery en este nodo es 0.38 pero tu confianza promedio es 0.66. Es el patrón clásico de sobreconfianza: reconoces los símbolos (ΔG, ΔH, ΔS) pero al aplicarlos cometes errores sistemáticos. En 3 de las últimas 4 preguntas declaraste alta seguridad y fallaste.',
            recommendation: 'Antes de la próxima sesión, derivá ΔG = ΔH − TΔS en una hoja en blanco y aplicala a 2 ejemplos donde el signo de ΔS no coincida con el de ΔG. Repetilo en voz alta.',
        },
        {
            id_ai: 5000,
            generated_at: '2026-05-24T18:18:00Z',
            id_session: 9001,
            room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            title: 'Confusión entre 1ª y 2ª ley en procesos espontáneos',
            node: { id_node: 'entr', name: 'Entropía y 2ª ley', description: 'Termodinámica clásica' },
            risk_node: ['Entropía'],
            classification: 'overconfident',
            risk_level: 'medium',
            failure_probability: 0.58,
            reasoning: 'La 2ª ley no es una ley de conservación. Estás mezclando la 1ª ley (conservación de energía) con la 2ª (sentido del tiempo). La 2ª es estadística — un proceso reverso es improbable, no imposible matemáticamente.',
            recommendation: 'Revisá la diferencia entre las dos leyes en tus apuntes y explicate vos en voz alta por qué un huevo no se desrompe.',
        },
        {
            id_ai: 4999,
            generated_at: '2026-05-24T18:16:00Z',
            id_session: 9001,
            room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            title: 'Confusión entre proceso isobárico e isocórico',
            node: { id_node: 'ley1', name: '1ª ley de la termodinámica', description: 'Termodinámica clásica' },
            risk_node: ['1ª ley'],
            classification: 'overconfident',
            risk_level: 'medium',
            failure_probability: 0.51,
            reasoning: 'Confundiste presión constante con trabajo nulo. Declaraste 0.88 de confianza, pero tu mastery real en este nodo es 0.41. El trabajo solo es cero cuando ΔV = 0 (proceso isocórico), no cuando la presión es constante. Es la confusión más común entre isobárico e isocórico.',
            recommendation: 'Dibujá un diagrama P-V de un proceso isobárico y calculá el área bajo la curva. Eso te va a clavar la relación.',
        },
        {
            id_ai: 4998,
            generated_at: '2026-05-21T19:22:00Z',
            id_session: 8998,
            room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            title: 'Patrón sostenido de sobreconfianza en Gibbs',
            node: { id_node: 'gibbs', name: 'Energía libre de Gibbs', description: 'Termodinámica clásica' },
            risk_node: ['Gibbs'],
            classification: 'overconfident',
            risk_level: 'high',
            failure_probability: 0.68,
            reasoning: 'Segunda intervención en el mismo nodo. Tu confianza no baja pese a fallar. Patrón sostenido: declaraste 0.85 promedio y aciertaste 33% de las preguntas. Es el síntoma típico de un estudiante que estudió el material pero no se autoevalúa críticamente.',
            recommendation: 'Buscá un compañero y enséñale el tema en 5 minutos sin mirar apuntes. Si trabás, ahí está la grieta.',
        },
        {
            id_ai: 4997,
            generated_at: '2026-05-19T18:10:00Z',
            id_session: 8997,
            room: { id_room: 3, name: 'Fisicoquímica · Repaso' },
            title: 'Subconfianza estable en reacciones de 2° orden',
            node: { id_node: 'cin2', name: 'Reacciones de 2° orden', description: 'Cinética' },
            risk_node: ['Cinética 2°'],
            classification: 'underconfident',
            risk_level: 'low',
            failure_probability: 0.18,
            reasoning: 'Sabés más de lo que crees. En las últimas 8 preguntas de este nodo acertaste 7 pero tu confianza promedio fue 0.52. La subconfianza también es un problema: te lleva a estudiar de más temas que ya dominás y descuidar otros.',
            recommendation: 'En tu próxima sesión, antes de responder, intentá declarar 10-15 puntos más arriba de lo que sientas. Es entrenamiento de calibración.',
        },
        {
            id_ai: 4996,
            generated_at: '2026-05-16T18:45:00Z',
            id_session: 8994,
            room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            title: 'Brecha estable en Entropía pese al feedback',
            node: { id_node: 'entr', name: 'Entropía y 2ª ley', description: 'Termodinámica clásica' },
            risk_node: ['Entropía'],
            classification: 'overconfident',
            risk_level: 'medium',
            failure_probability: 0.54,
            reasoning: 'Tercera intervención reciente en el nodo Entropía. La brecha entre confianza (0.75 promedio) y mastery real (0.48) se mantiene estable. Esto indica que no estás procesando el feedback que recibís en cada sesión.',
            recommendation: 'Volvé a la revisión de la sesión #8998 y leé tus errores. Reescribí en una hoja por qué fallaste cada uno.',
        },
    ],


    sessionAnswers: {
        9001: [
            {
                id_response: 'q1',
                id_question: 'q1',
                node: { id_node: 'ley1', name: '1ª ley de la termodinámica', description: 'Termodinámica clásica' },
                statement: 'En un sistema cerrado que recibe 200 J de calor y realiza 50 J de trabajo, ¿cuál es la variación de energía interna?',
                options: ['−150 J', '+150 J', '+250 J', '−250 J'],
                correct_index: 1, selected_index: 1, is_correct: true,
                confidence_declared: 0.78, ai_feedback: null,
                response_time_sec: 42,
            },
            {
                id_response: 'q2',
                id_question: 'q2',
                node: { id_node: 'ley1', name: '1ª ley de la termodinámica', description: 'Termodinámica clásica' },
                statement: 'Un gas ideal se expande isobáricamente. ¿Qué afirmación es correcta?',
                options: [
                    'No hay trabajo porque la presión es constante.',
                    'El trabajo es W = pΔV.',
                    'La energía interna no cambia.',
                    'El proceso es adiabático.',
                ],
                correct_index: 1, selected_index: 0, is_correct: false,
                confidence_declared: 0.88,
                ai_feedback: '«Confundiste presión constante con trabajo nulo.» Declaraste 0.88 de confianza, pero tu mastery real en este nodo es 0.41. El trabajo solo es cero cuando ΔV = 0 (proceso isocórico), no cuando la presión es constante. Es la confusión más común entre isobárico e isocórico. Recomendación: Dibujá un diagrama P-V de un proceso isobárico y calculá el área bajo la curva. Eso te va a clavar la relación.',
                response_time_sec: 65,
            },
            {
                id_response: 'q3',
                id_question: 'q3',
                node: { id_node: 'entr', name: 'Entropía y 2ª ley', description: 'Termodinámica clásica' },
                statement: '¿Cuál de los siguientes procesos tiene mayor aumento de entropía del universo?',
                options: [
                    'Compresión isotérmica reversible.',
                    'Expansión libre adiabática de un gas ideal.',
                    'Transferencia de calor entre dos cuerpos a misma temperatura.',
                    'Cualquier proceso reversible.',
                ],
                correct_index: 1, selected_index: 1, is_correct: true,
                confidence_declared: 0.62, ai_feedback: null,
                response_time_sec: 55,
            },
            {
                id_response: 'q4',
                id_question: 'q4',
                node: { id_node: 'entr', name: 'Entropía y 2ª ley', description: 'Termodinámica clásica' },
                statement: '¿Por qué la entropía de un sistema aislado nunca disminuye?',
                options: [
                    'Porque viola la conservación de energía.',
                    'Porque sería un proceso espontáneo improbable.',
                    'Porque implicaría un descenso de la energía libre.',
                    'Porque contradice el teorema H de Boltzmann.',
                ],
                correct_index: 1, selected_index: 0, is_correct: false,
                confidence_declared: 0.70,
                ai_feedback: '«La 2ª ley no es una ley de conservación.» La entropía no se conserva: aumenta. Estás mezclando la 1ª ley (conservación de energía) con la 2ª (sentido del tiempo). La 2ª es estadística — un proceso reverso es improbable, no imposible matemáticamente. Recomendación: Revisá la diferencia entre las dos leyes en tus apuntes y explicate vos en voz alta por qué un huevo no se desrompe.',
                response_time_sec: 78,
            },
            {
                id_response: 'q5',
                id_question: 'q5',
                node: { id_node: 'lech', name: 'Principio de Le Chatelier', description: 'Equilibrio químico' },
                statement: 'Para la reacción N₂(g) + 3H₂(g) ⇌ 2NH₃(g) + calor, ¿qué pasa al aumentar la temperatura?',
                options: [
                    'Se favorece la formación de NH₃.',
                    'Se favorece la formación de N₂ y H₂.',
                    'El equilibrio no se altera.',
                    'Aumenta la velocidad pero no cambia Keq.',
                ],
                correct_index: 1, selected_index: 1, is_correct: true,
                confidence_declared: 0.55, ai_feedback: null,
                response_time_sec: 48,
            },
            {
                id_response: 'q6',
                id_question: 'q6',
                node: { id_node: 'lech', name: 'Principio de Le Chatelier', description: 'Equilibrio químico' },
                statement: 'En un equilibrio gaseoso A(g) ⇌ 2B(g), si reducimos el volumen, ¿hacia dónde se desplaza?',
                options: [
                    'Hacia A (menos moles de gas).',
                    'Hacia B (más moles de gas).',
                    'No se desplaza.',
                    'Depende de la temperatura.',
                ],
                correct_index: 0, selected_index: 0, is_correct: true,
                confidence_declared: 0.80, ai_feedback: null,
                response_time_sec: 35,
            },
            {
                id_response: 'q7',
                id_question: 'q7',
                node: { id_node: 'gibbs', name: 'Energía libre de Gibbs', description: 'Termodinámica clásica' },
                statement: '¿Qué condición termodinámica define un proceso espontáneo a T y P constantes?',
                options: ['ΔH < 0', 'ΔS > 0', 'ΔG < 0', 'ΔU < 0'],
                correct_index: 2, selected_index: 1, is_correct: false,
                confidence_declared: 0.92,
                ai_feedback: '«Cuidado con asumir que “más desorden = espontáneo”.» Declaraste 0.92 de confianza con un nodo en el que tu mastery real es 0.38. ΔS > 0 NO basta: un proceso puede tener entropía creciente y NO ser espontáneo si ΔH es muy positivo. La condición correcta es ΔG < 0 que combina ambas. Recomendación: Repasá la ecuación ΔG = ΔH − TΔS y poné un ejemplo donde ΔS > 0 pero el proceso no sea espontáneo a baja temperatura.',
                response_time_sec: 95,
            },
            {
                id_response: 'q8',
                id_question: 'q8',
                node: { id_node: 'gibbs', name: 'Energía libre de Gibbs', description: 'Termodinámica clásica' },
                statement: 'Para una reacción con ΔH = +50 kJ y ΔS = +120 J/K, ¿a qué temperatura se vuelve espontánea?',
                options: [
                    'A cualquier T (ΔS > 0).',
                    'Solo si T > 417 K.',
                    'Solo si T < 417 K.',
                    'Nunca, porque ΔH > 0.',
                ],
                correct_index: 1, selected_index: 0, is_correct: false,
                confidence_declared: 0.65,
                ai_feedback: null,
                response_time_sec: 110,
            },
            {
                id_response: 'q9',
                id_question: 'q9',
                node: { id_node: 'ley1', name: '1ª ley de la termodinámica', description: 'Termodinámica clásica' },
                statement: '¿En cuál de estos procesos se cumple Q = 0?',
                options: ['Isotérmico', 'Adiabático', 'Isobárico', 'Isocórico'],
                correct_index: 1, selected_index: 1, is_correct: true,
                confidence_declared: 0.90, ai_feedback: null,
                response_time_sec: 28,
            },
            {
                id_response: 'q10',
                id_question: 'q10',
                node: { id_node: 'entr', name: 'Entropía y 2ª ley', description: 'Termodinámica clásica' },
                statement: 'Para un gas ideal, ¿qué expresión describe ΔS en un proceso isotérmico reversible?',
                options: [
                    'ΔS = 0',
                    'ΔS = nR ln(V₂/V₁)',
                    'ΔS = nCv ln(T₂/T₁)',
                    'ΔS = q/T solo si reversible.',
                ],
                correct_index: 1, selected_index: 3, is_correct: false,
                confidence_declared: 0.50,
                ai_feedback: null,
                response_time_sec: 88,
            },
            {
                id_response: 'q11',
                id_question: 'q11',
                node: { id_node: 'lech', name: 'Principio de Le Chatelier', description: 'Equilibrio químico' },
                statement: 'Si añadimos un catalizador a un equilibrio químico, ¿qué ocurre?',
                options: [
                    'Se desplaza hacia los productos.',
                    'Aumenta la constante de equilibrio.',
                    'Solo acelera el equilibrio sin desplazarlo.',
                    'Disminuye la energía libre de los productos.',
                ],
                correct_index: 2, selected_index: 2, is_correct: true,
                confidence_declared: 0.85, ai_feedback: null,
                response_time_sec: 40,
            },
            {
                id_response: 'q12',
                id_question: 'q12',
                node: { id_node: 'gibbs', name: 'Energía libre de Gibbs', description: 'Termodinámica clásica' },
                statement: 'Una reacción tiene ΔG° = −30 kJ/mol a 298 K. ¿Cuál es aproximadamente Keq?',
                options: ['≈ 10⁻⁵', '≈ 1', '≈ 10⁵', '≈ 10²'],
                correct_index: 2, selected_index: 1, is_correct: false,
                confidence_declared: 0.40, ai_feedback: null,
                response_time_sec: 105,
            },
        ],
    },


    nodeDetails: {
        'gibbs': {
            id_node: 'gibbs',
            name: 'Energía libre de Gibbs',
            description: 'Termodinámica clásica',
            id_room: 1,
            room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            p_mastery: 0.38, p_transit: 0.09, p_guess: 0.20, p_slip: 0.10,
            attempts: 7,
            icc_value: 0.42, avg_confidence: 0.66, bkt_mastery: 0.38,
            metacognitive_gap: +0.28, profile: 'overconfident',
            updated_at: '2026-05-25T10:18:00Z',
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
                { id_question: 'q7',  id_session: 9001, statement: '¿Qué condición termodinámica define un proceso espontáneo a T y P constantes?', is_correct: false, confidence_declared: 0.92, answered_at: '2026-05-24T18:12:00Z' },
                { id_question: 'q8',  id_session: 9001, statement: 'Para una reacción con ΔH = +50 kJ y ΔS = +120 J/K, ¿a qué temperatura se vuelve espontánea?', is_correct: false, confidence_declared: 0.65, answered_at: '2026-05-24T18:18:00Z' },
                { id_question: 'q12', id_session: 9001, statement: 'Una reacción tiene ΔG° = −30 kJ/mol a 298 K. ¿Cuál es aproximadamente Keq?', is_correct: false, confidence_declared: 0.40, answered_at: '2026-05-24T18:32:00Z' },
                { id_question: 'gx2', id_session: 8990, statement: 'Identifique signos correctos de ΔG en reacciones endotérmicas a alta T.', is_correct: true,  confidence_declared: 0.50, answered_at: '2026-05-12T20:11:00Z' },
                { id_question: 'gx1', id_session: 8990, statement: 'Calcule ΔG° de una reacción sabiendo ΔH° y ΔS°.', is_correct: false, confidence_declared: 0.75, answered_at: '2026-05-12T20:04:00Z' },
            ],
            diagnosis: {
                title: 'Tendencia a sobreestimar dominio en energía libre de Gibbs',
                reasoning: 'Tu mastery en este nodo es 0.38 pero tu confianza promedio es 0.66. Es el patrón clásico de sobreconfianza: reconoces los símbolos (ΔG, ΔH, ΔS) pero al aplicarlos cometés errores sistemáticos. En 3 de las últimas 4 preguntas declaraste alta seguridad y fallaste.',
                recommendation: 'Antes de la próxima sesión, derivá ΔG = ΔH − TΔS en una hoja en blanco y aplicala a 2 ejemplos donde el signo de ΔS no coincida con el de ΔG. Repetilo en voz alta.',
                generated_at: '2026-05-24T18:35:00Z',
            },
        },

        'entr': {
            id_node: 'entr',
            name: 'Entropía y 2ª ley',
            description: 'Termodinámica clásica',
            id_room: 1,
            room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            p_mastery: 0.52, p_transit: 0.11, p_guess: 0.20, p_slip: 0.10,
            attempts: 9,
            icc_value: 0.74, avg_confidence: 0.58, bkt_mastery: 0.52,
            metacognitive_gap: -0.06, profile: 'calibrated',
            updated_at: '2026-05-24T22:18:00Z',
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
                { id_question: 'q3',  id_session: 9001, statement: '¿Cuál de los siguientes procesos tiene mayor aumento de entropía del universo?', is_correct: true,  confidence_declared: 0.62, answered_at: '2026-05-24T18:05:00Z' },
                { id_question: 'q4',  id_session: 9001, statement: '¿Por qué la entropía de un sistema aislado nunca disminuye?', is_correct: false, confidence_declared: 0.70, answered_at: '2026-05-24T18:09:00Z' },
                { id_question: 'q10', id_session: 9001, statement: 'Para un gas ideal, ¿qué expresión describe ΔS en un proceso isotérmico reversible?', is_correct: false, confidence_declared: 0.50, answered_at: '2026-05-24T18:25:00Z' },
            ],
            diagnosis: null,
        },

        'ley1': {
            id_node: 'ley1',
            name: '1ª ley de la termodinámica',
            description: 'Termodinámica clásica',
            id_room: 1,
            room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            p_mastery: 0.72, p_transit: 0.08, p_guess: 0.20, p_slip: 0.10,
            attempts: 14,
            icc_value: 0.84, avg_confidence: 0.82, bkt_mastery: 0.72,
            metacognitive_gap: +0.10, profile: 'calibrated',
            updated_at: '2026-05-24T18:14:00Z',
            history: [
                { date: '2026-03-15', icc: 0.71, mastery: 0.50, confidence: 0.58 },
                { date: '2026-03-29', icc: 0.74, mastery: 0.55, confidence: 0.62 },
                { date: '2026-04-12', icc: 0.77, mastery: 0.60, confidence: 0.66 },
                { date: '2026-04-26', icc: 0.79, mastery: 0.64, confidence: 0.71 },
                { date: '2026-05-10', icc: 0.81, mastery: 0.68, confidence: 0.76 },
                { date: '2026-05-24', icc: 0.84, mastery: 0.72, confidence: 0.82 },
            ],
            recentResponses: [
                { id_question: 'q1', id_session: 9001, statement: 'En un sistema cerrado que recibe 200 J de calor y realiza 50 J de trabajo, ¿cuál es la variación de energía interna?', is_correct: true,  confidence_declared: 0.78, answered_at: '2026-05-24T18:14:00Z' },
                { id_question: 'q2', id_session: 9001, statement: 'Un gas ideal se expande isobáricamente. ¿Qué afirmación es correcta?', is_correct: false, confidence_declared: 0.88, answered_at: '2026-05-24T18:16:00Z' },
                { id_question: 'q9', id_session: 9001, statement: '¿En cuál de estos procesos se cumple Q = 0?', is_correct: true,  confidence_declared: 0.90, answered_at: '2026-05-24T18:20:00Z' },
            ],
            diagnosis: null,
        },

        'ley2': {
            id_node: 'ley2', name: '2ª ley de la termodinámica', description: 'Termodinámica clásica',
            id_room: 1, room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            p_mastery: 0.55, p_transit: 0.09, p_guess: 0.20, p_slip: 0.10,
            attempts: 10,
            icc_value: 0.77, avg_confidence: 0.78, bkt_mastery: 0.55,
            metacognitive_gap: +0.23, profile: 'overconfident',
            updated_at: '2026-05-23T20:05:00Z',
            history: [
                { date: '2026-04-05', icc: 0.71, mastery: 0.42, confidence: 0.62 },
                { date: '2026-04-19', icc: 0.73, mastery: 0.47, confidence: 0.68 },
                { date: '2026-05-03', icc: 0.75, mastery: 0.50, confidence: 0.72 },
                { date: '2026-05-17', icc: 0.76, mastery: 0.53, confidence: 0.76 },
                { date: '2026-05-23', icc: 0.77, mastery: 0.55, confidence: 0.78 },
            ],
            recentResponses: [
                { id_question: 'l2a', id_session: 9000, statement: 'Una máquina térmica recibe 1000 J y entrega 600 J. ¿Cuál es su eficiencia?', is_correct: true,  confidence_declared: 0.80, answered_at: '2026-05-23T20:10:00Z' },
                { id_question: 'l2b', id_session: 9000, statement: '¿Por qué ninguna máquina real alcanza la eficiencia de Carnot?', is_correct: false, confidence_declared: 0.85, answered_at: '2026-05-23T20:14:00Z' },
            ],
            diagnosis: null,
        },

        'sis': {
            id_node: 'sis', name: 'Sistemas abiertos', description: 'Termodinámica clásica',
            id_room: 1, room: { id_room: 1, name: 'Termodinámica I · 2026·I' },
            p_mastery: 0.41, p_transit: 0.10, p_guess: 0.20, p_slip: 0.10,
            attempts: 8,
            icc_value: 0.61, avg_confidence: 0.80, bkt_mastery: 0.41,
            metacognitive_gap: +0.39, profile: 'overconfident',
            updated_at: '2026-05-21T19:00:00Z',
            history: [
                { date: '2026-04-10', icc: 0.50, mastery: 0.30, confidence: 0.62 },
                { date: '2026-04-24', icc: 0.55, mastery: 0.34, confidence: 0.70 },
                { date: '2026-05-08', icc: 0.58, mastery: 0.38, confidence: 0.76 },
                { date: '2026-05-21', icc: 0.61, mastery: 0.41, confidence: 0.80 },
            ],
            recentResponses: [
                { id_question: 'sa1', id_session: 8998, statement: 'En un sistema abierto en régimen estacionario, ¿qué se conserva?', is_correct: false, confidence_declared: 0.88, answered_at: '2026-05-21T19:08:00Z' },
                { id_question: 'sa2', id_session: 8998, statement: 'Aplicá el balance de energía a una tobera adiabática.', is_correct: false, confidence_declared: 0.75, answered_at: '2026-05-21T19:14:00Z' },
            ],
            diagnosis: {
                title: 'Sobreestimación en balance de sistemas abiertos',
                reasoning: 'Tu confianza promedio (0.80) está muy por encima de tu mastery (0.41). Los errores se repiten en problemas que requieren incluir trabajo de flujo (W_flujo = PV).',
                recommendation: 'Antes de la próxima sesión, dibujá un volumen de control con entradas/salidas y enumerá uno por uno los términos del balance.',
                generated_at: '2026-05-21T19:25:00Z',
            },
        },

        'eq': {
            id_node: 'eq', name: 'Equilibrio químico', description: 'Equilibrio químico',
            id_room: 101, room: { id_room: 101, name: 'Mi repaso · Equilibrio' },
            p_mastery: 0.62, p_transit: 0.10, p_guess: 0.20, p_slip: 0.10,
            attempts: 9,
            icc_value: 0.74, avg_confidence: 0.74, bkt_mastery: 0.62,
            metacognitive_gap: +0.12, profile: 'calibrated',
            updated_at: '2026-05-22T16:30:00Z',
            history: [
                { date: '2026-04-15', icc: 0.68, mastery: 0.50, confidence: 0.58 },
                { date: '2026-04-29', icc: 0.70, mastery: 0.55, confidence: 0.65 },
                { date: '2026-05-12', icc: 0.72, mastery: 0.58, confidence: 0.70 },
                { date: '2026-05-22', icc: 0.74, mastery: 0.62, confidence: 0.74 },
            ],
            recentResponses: [
                { id_question: 'eq1', id_session: 8999, statement: '¿Qué significa que Kc >> 1 para una reacción?', is_correct: true, confidence_declared: 0.70, answered_at: '2026-05-22T16:40:00Z' },
                { id_question: 'eq2', id_session: 8999, statement: 'Calculá Kp dado Kc para N₂ + 3H₂ ⇌ 2NH₃ a 500 K.', is_correct: true, confidence_declared: 0.65, answered_at: '2026-05-22T16:50:00Z' },
            ],
            diagnosis: null,
        },

        'lech': {
            id_node: 'lech', name: 'Principio de Le Chatelier', description: 'Equilibrio químico',
            id_room: 101, room: { id_room: 101, name: 'Mi repaso · Equilibrio' },
            p_mastery: 0.61, p_transit: 0.10, p_guess: 0.20, p_slip: 0.10,
            attempts: 11,
            icc_value: 0.81, avg_confidence: 0.80, bkt_mastery: 0.61,
            metacognitive_gap: +0.19, profile: 'overconfident',
            updated_at: '2026-05-22T16:55:00Z',
            history: [
                { date: '2026-04-12', icc: 0.74, mastery: 0.45, confidence: 0.62 },
                { date: '2026-04-26', icc: 0.78, mastery: 0.52, confidence: 0.70 },
                { date: '2026-05-10', icc: 0.80, mastery: 0.57, confidence: 0.76 },
                { date: '2026-05-22', icc: 0.81, mastery: 0.61, confidence: 0.80 },
            ],
            recentResponses: [
                { id_question: 'le1', id_session: 9001, statement: 'Para N₂ + 3H₂ ⇌ 2NH₃ + calor, ¿qué pasa al aumentar T?', is_correct: true, confidence_declared: 0.55, answered_at: '2026-05-24T18:22:00Z' },
                { id_question: 'le2', id_session: 9001, statement: 'En A(g) ⇌ 2B(g), si reducimos V, ¿hacia dónde se desplaza?', is_correct: true, confidence_declared: 0.80, answered_at: '2026-05-24T18:25:00Z' },
            ],
            diagnosis: null,
        },

        'kpkc': {
            id_node: 'kpkc', name: 'Constantes Kp y Kc', description: 'Equilibrio químico',
            id_room: 101, room: { id_room: 101, name: 'Mi repaso · Equilibrio' },
            p_mastery: 0.70, p_transit: 0.08, p_guess: 0.20, p_slip: 0.10,
            attempts: 7,
            icc_value: 0.86, avg_confidence: 0.66, bkt_mastery: 0.70,
            metacognitive_gap: -0.04, profile: 'calibrated',
            updated_at: '2026-05-14T22:45:00Z',
            history: [
                { date: '2026-04-20', icc: 0.78, mastery: 0.55, confidence: 0.52 },
                { date: '2026-05-04', icc: 0.82, mastery: 0.62, confidence: 0.60 },
                { date: '2026-05-14', icc: 0.86, mastery: 0.70, confidence: 0.66 },
            ],
            recentResponses: [
                { id_question: 'kk1', id_session: 8992, statement: '¿Cómo se relacionan Kp y Kc para una reacción gaseosa?', is_correct: true, confidence_declared: 0.60, answered_at: '2026-05-14T22:52:00Z' },
                { id_question: 'kk2', id_session: 8992, statement: 'Para una reacción Δn=0, ¿qué relación hay entre Kp y Kc?', is_correct: true, confidence_declared: 0.70, answered_at: '2026-05-14T22:55:00Z' },
            ],
            diagnosis: null,
        },

        'cin1': {
            id_node: 'cin1', name: 'Velocidad de reacción', description: 'Cinética',
            id_room: 2, room: { id_room: 2, name: 'Cinética Química · 2026·I' },
            p_mastery: 0.66, p_transit: 0.09, p_guess: 0.20, p_slip: 0.10,
            attempts: 9,
            icc_value: 0.79, avg_confidence: 0.55, bkt_mastery: 0.66,
            metacognitive_gap: -0.11, profile: 'calibrated',
            updated_at: '2026-05-23T20:05:00Z',
            history: [
                { date: '2026-04-08', icc: 0.72, mastery: 0.50, confidence: 0.42 },
                { date: '2026-04-22', icc: 0.75, mastery: 0.56, confidence: 0.48 },
                { date: '2026-05-06', icc: 0.77, mastery: 0.61, confidence: 0.52 },
                { date: '2026-05-23', icc: 0.79, mastery: 0.66, confidence: 0.55 },
            ],
            recentResponses: [
                { id_question: 'cn1', id_session: 9000, statement: '¿Cómo se define la velocidad de una reacción química?', is_correct: true, confidence_declared: 0.50, answered_at: '2026-05-23T20:08:00Z' },
                { id_question: 'cn2', id_session: 9000, statement: '¿Qué unidades tiene la velocidad de reacción?', is_correct: true, confidence_declared: 0.65, answered_at: '2026-05-23T20:13:00Z' },
            ],
            diagnosis: null,
        },

        'cin2': {
            id_node: 'cin2', name: 'Reacciones de 2° orden', description: 'Cinética',
            id_room: 2, room: { id_room: 2, name: 'Cinética Química · 2026·I' },
            p_mastery: 0.74, p_transit: 0.08, p_guess: 0.20, p_slip: 0.10,
            attempts: 12,
            icc_value: 0.82, avg_confidence: 0.58, bkt_mastery: 0.74,
            metacognitive_gap: -0.16, profile: 'underconfident',
            updated_at: '2026-05-17T21:00:00Z',
            history: [
                { date: '2026-03-25', icc: 0.71, mastery: 0.50, confidence: 0.42 },
                { date: '2026-04-08', icc: 0.74, mastery: 0.58, confidence: 0.47 },
                { date: '2026-04-22', icc: 0.77, mastery: 0.65, confidence: 0.51 },
                { date: '2026-05-06', icc: 0.80, mastery: 0.70, confidence: 0.55 },
                { date: '2026-05-17', icc: 0.82, mastery: 0.74, confidence: 0.58 },
            ],
            recentResponses: [
                { id_question: 'c2a', id_session: 8995, statement: 'Para una reacción de 2° orden, ¿qué gráfico es lineal?', is_correct: true, confidence_declared: 0.55, answered_at: '2026-05-17T21:10:00Z' },
                { id_question: 'c2b', id_session: 8995, statement: '¿Cuál es la vida media de una reacción 2° orden?', is_correct: true, confidence_declared: 0.60, answered_at: '2026-05-17T21:18:00Z' },
            ],
            diagnosis: {
                title: 'Subconfianza estable en reacciones de 2° orden',
                reasoning: 'Tu mastery en reacciones 2° orden es 0.74 pero declaraste solo 0.58 de confianza. La subconfianza te lleva a estudiar de más temas que ya dominás.',
                recommendation: 'En tu próxima sesión, antes de responder, declará 10-15 puntos más arriba de lo que sientas. Es entrenamiento de calibración.',
                generated_at: '2026-05-17T21:30:00Z',
            },
        },

        'act': {
            id_node: 'act', name: 'Energía de activación', description: 'Cinética',
            id_room: 2, room: { id_room: 2, name: 'Cinética Química · 2026·I' },
            p_mastery: 0.68, p_transit: 0.09, p_guess: 0.20, p_slip: 0.10,
            attempts: 8,
            icc_value: 0.81, avg_confidence: 0.49, bkt_mastery: 0.68,
            metacognitive_gap: -0.19, profile: 'underconfident',
            updated_at: '2026-05-13T19:30:00Z',
            history: [
                { date: '2026-04-01', icc: 0.72, mastery: 0.52, confidence: 0.40 },
                { date: '2026-04-15', icc: 0.76, mastery: 0.58, confidence: 0.44 },
                { date: '2026-04-29', icc: 0.79, mastery: 0.63, confidence: 0.47 },
                { date: '2026-05-13', icc: 0.81, mastery: 0.68, confidence: 0.49 },
            ],
            recentResponses: [
                { id_question: 'ea1', id_session: 8991, statement: 'Aplicá la ecuación de Arrhenius para calcular Ea.', is_correct: true, confidence_declared: 0.45, answered_at: '2026-05-13T19:35:00Z' },
                { id_question: 'ea2', id_session: 8991, statement: '¿Qué relación hay entre temperatura y velocidad?', is_correct: true, confidence_declared: 0.55, answered_at: '2026-05-13T19:42:00Z' },
            ],
            diagnosis: null,
        },

        'cat': {
            id_node: 'cat', name: 'Catálisis', description: 'Cinética',
            id_room: 2, room: { id_room: 2, name: 'Cinética Química · 2026·I' },
            p_mastery: 0.81, p_transit: 0.06, p_guess: 0.20, p_slip: 0.08,
            attempts: 6,
            icc_value: 0.91, avg_confidence: 0.72, bkt_mastery: 0.81,
            metacognitive_gap: -0.09, profile: 'calibrated',
            updated_at: '2026-05-10T16:15:00Z',
            history: [
                { date: '2026-04-18', icc: 0.82, mastery: 0.65, confidence: 0.55 },
                { date: '2026-05-02', icc: 0.86, mastery: 0.72, confidence: 0.63 },
                { date: '2026-05-10', icc: 0.91, mastery: 0.81, confidence: 0.72 },
            ],
            recentResponses: [
                { id_question: 'ca1', id_session: 8989, statement: '¿Cómo afecta un catalizador a la energía de activación?', is_correct: true, confidence_declared: 0.75, answered_at: '2026-05-10T16:20:00Z' },
                { id_question: 'ca2', id_session: 8989, statement: 'Diferencia entre catálisis homogénea y heterogénea.', is_correct: true, confidence_declared: 0.70, answered_at: '2026-05-10T16:27:00Z' },
            ],
            diagnosis: null,
        },
    },
};


const QUESTION_POOL = [
    {
        id_question: 'p01', node: { id_node: 'ley1', name: '1ª ley de la termodinámica', description: 'Termodinámica clásica' },
        statement: 'En un proceso isobárico a 2 atm, un gas se expande de 1 L a 3 L. ¿Cuál es el trabajo realizado?',
        options: ['0 J (presión constante)', '+405 J', '−405 J', '+202 J'],
        correct_index: 1,
    },
    {
        id_question: 'p02', node: { id_node: 'ley1', name: '1ª ley de la termodinámica', description: 'Termodinámica clásica' },
        statement: '¿Qué afirmación sobre un proceso adiabático es correcta?',
        options: [
            'No hay variación de temperatura.',
            'No hay intercambio de calor.',
            'No hay trabajo realizado.',
            'La presión permanece constante.',
        ],
        correct_index: 1,
    },
    {
        id_question: 'p03', node: { id_node: 'entr', name: 'Entropía y 2ª ley', description: 'Termodinámica clásica' },
        statement: '¿Cuál de los siguientes procesos produce mayor aumento de entropía?',
        options: [
            'Compresión isotérmica reversible.',
            'Mezcla de dos gases ideales distintos.',
            'Solidificación de un líquido.',
            'Cualquier proceso reversible.',
        ],
        correct_index: 1,
    },
    {
        id_question: 'p04', node: { id_node: 'entr', name: 'Entropía y 2ª ley', description: 'Termodinámica clásica' },
        statement: 'Para un gas ideal en expansión libre adiabática, ΔS del sistema es:',
        options: ['Negativo', 'Cero', 'Positivo', 'Indefinido'],
        correct_index: 2,
    },
    {
        id_question: 'p05', node: { id_node: 'gibbs', name: 'Energía libre de Gibbs', description: 'Termodinámica clásica' },
        statement: '¿Cuál es la condición termodinámica de espontaneidad a T y P constantes?',
        options: ['ΔH < 0', 'ΔS > 0', 'ΔG < 0', 'ΔU = 0'],
        correct_index: 2,
    },
    {
        id_question: 'p06', node: { id_node: 'gibbs', name: 'Energía libre de Gibbs', description: 'Termodinámica clásica' },
        statement: 'Si ΔH > 0 y ΔS > 0, ¿cuándo es espontánea la reacción?',
        options: ['A cualquier T', 'A T alta', 'A T baja', 'Nunca'],
        correct_index: 1,
    },
    {
        id_question: 'p07', node: { id_node: 'lech', name: 'Principio de Le Chatelier', description: 'Equilibrio químico' },
        statement: 'Para 2SO₂ + O₂ ⇌ 2SO₃ + calor, al aumentar T el equilibrio:',
        options: [
            'Se desplaza a productos',
            'Se desplaza a reactivos',
            'No se altera',
            'Depende de la P',
        ],
        correct_index: 1,
    },
    {
        id_question: 'p08', node: { id_node: 'lech', name: 'Principio de Le Chatelier', description: 'Equilibrio químico' },
        statement: '¿Cómo afecta agregar un catalizador a un equilibrio químico?',
        options: [
            'Desplaza a productos',
            'Desplaza a reactivos',
            'Acelera pero no desplaza',
            'Cambia Keq',
        ],
        correct_index: 2,
    },
    {
        id_question: 'p09', node: { id_node: 'eq', name: 'Equilibrio químico', description: 'Equilibrio químico' },
        statement: 'Si Kc = 100 para A ⇌ B a 300 K, ¿qué significa?',
        options: [
            'En equilibrio hay 100× más A que B',
            'En equilibrio hay 100× más B que A',
            'No hay reactivos',
            'La reacción es muy lenta',
        ],
        correct_index: 1,
    },
    {
        id_question: 'p10', node: { id_node: 'eq', name: 'Equilibrio químico', description: 'Equilibrio químico' },
        statement: 'Relación entre Kp y Kc para una reacción gaseosa con Δn = 2:',
        options: ['Kp = Kc', 'Kp = Kc · (RT)²', 'Kp = Kc / RT', 'Kp = 2 Kc'],
        correct_index: 1,
    },
    {
        id_question: 'p11', node: { id_node: 'cin2', name: 'Reacciones de 2° orden', description: 'Cinética' },
        statement: 'Para una reacción 2° orden A → P, ¿qué gráfico da línea recta?',
        options: ['[A] vs t', 'ln[A] vs t', '1/[A] vs t', '[A]² vs t'],
        correct_index: 2,
    },
    {
        id_question: 'p12', node: { id_node: 'cin2', name: 'Reacciones de 2° orden', description: 'Cinética' },
        statement: 'Vida media de una reacción 2° orden:',
        options: [
            'Es independiente de [A]₀',
            'Aumenta con [A]₀',
            'Disminuye con [A]₀',
            'No depende del orden',
        ],
        correct_index: 2,
    },
    {
        id_question: 'p13', node: { id_node: 'cin1', name: 'Velocidad de reacción', description: 'Cinética' },
        statement: 'La velocidad inicial de una reacción se duplica al duplicar [A]. El orden respecto a A es:',
        options: ['0', '1', '2', '½'],
        correct_index: 1,
    },
    {
        id_question: 'p14', node: { id_node: 'act', name: 'Energía de activación', description: 'Cinética' },
        statement: 'Según Arrhenius, al aumentar T:',
        options: [
            'Ea aumenta',
            'k disminuye',
            'k aumenta exponencialmente',
            'k no cambia',
        ],
        correct_index: 2,
    },
    {
        id_question: 'p15', node: { id_node: 'cat', name: 'Catálisis', description: 'Cinética' },
        statement: '¿Qué hace un catalizador en una reacción?',
        options: ['Cambia ΔH', 'Reduce Ea', 'Aumenta Keq', 'Cambia los productos'],
        correct_index: 1,
    },
    {
        id_question: 'p16', node: { id_node: 'sis', name: 'Sistemas abiertos', description: 'Termodinámica clásica' },
        statement: 'En un sistema abierto en régimen estacionario, ¿qué cantidad se conserva?',
        options: [
            'La masa total dentro del volumen',
            'El flujo másico (entra = sale)',
            'La energía interna dentro del volumen',
            'La entropía dentro del volumen',
        ],
        correct_index: 1,
    },
    {
        id_question: 'p17', node: { id_node: 'ley2', name: '2ª ley de la termodinámica', description: 'Termodinámica clásica' },
        statement: '¿Cuál es la eficiencia máxima de un ciclo entre 600 K y 300 K?',
        options: ['25%', '50%', '75%', '100%'],
        correct_index: 1,
    },
    {
        id_question: 'p18', node: { id_node: 'ley2', name: '2ª ley de la termodinámica', description: 'Termodinámica clásica' },
        statement: 'Una bomba de calor con COP = 4 entrega 4 kJ por cada 1 kJ consumido. ¿Eso viola la 1ª ley?',
        options: [
            'Sí, sale más energía de la que entra',
            'No, la energía extra viene del foco frío',
            'Sí, viola conservación de masa',
            'No, porque es adiabático',
        ],
        correct_index: 1,
    },
    {
        id_question: 'p19', node: { id_node: 'kpkc', name: 'Constantes Kp y Kc', description: 'Equilibrio químico' },
        statement: 'Para una reacción con Δn = 0, ¿qué relación hay entre Kp y Kc?',
        options: ['Kp = Kc · RT', 'Kp = Kc', 'Kp = Kc / RT', 'No hay relación'],
        correct_index: 1,
    },
    {
        id_question: 'p20', node: { id_node: 'ley1', name: '1ª ley de la termodinámica', description: 'Termodinámica clásica' },
        statement: 'En una reacción endotérmica, ΔH:',
        options: ['Es positivo', 'Es negativo', 'Es cero', 'No se define'],
        correct_index: 0,
    },
    {
        id_question: 'p21', node: { id_node: 'ley1', name: '1ª ley de la termodinámica', description: 'Termodinámica clásica' },
        statement: 'Para un ciclo termodinámico, ΔU del sistema es:',
        options: [
            'Siempre positivo',
            'Siempre cero',
            'Igual a Q',
            'Igual a W',
        ],
        correct_index: 1,
    },
    {
        id_question: 'p22', node: { id_node: 'entr', name: 'Entropía y 2ª ley', description: 'Termodinámica clásica' },
        statement: 'En la fusión del hielo a 0 °C, ΔS del sistema:',
        options: ['Disminuye', 'Es cero', 'Aumenta', 'Depende de la P'],
        correct_index: 2,
    },
    {
        id_question: 'p23', node: { id_node: 'gibbs', name: 'Energía libre de Gibbs', description: 'Termodinámica clásica' },
        statement: 'Si ΔG° = −20 kJ/mol a 298 K, ¿Keq es aproximadamente?',
        options: ['≈ 10⁻⁴', '≈ 1', '≈ 3000', '≈ 10'],
        correct_index: 2,
    },
    {
        id_question: 'p24', node: { id_node: 'cin1', name: 'Velocidad de reacción', description: 'Cinética' },
        statement: 'Las unidades de la constante k para una reacción 1° orden son:',
        options: ['mol/L·s', '1/s', 'L/mol·s', 's'],
        correct_index: 1,
    },
];


const AI_FEEDBACK_BANK = {
    overconfident: [
        'Tu seguridad va más rápido que tu dominio. Declaraste alta confianza pero tu probabilidad real de acertar este tipo de pregunta está bastante por debajo. Recomendación: enunciá el concepto en tus propias palabras y aplicalo a un caso que NO esté en el apunte.',
        'Confianza alta y respuesta incorrecta es la combinación más peligrosa. Cuando declaramos seguridad y fallamos, no aprendemos del error. Tu mastery real está varios puntos abajo de lo que asumiste. Recomendación: enseñale este tema a un compañero sin mirar apuntes.',
    ],
    underconfident: [
        'Sabés más de lo que crees. Tu mastery en este nodo es mayor a tu confianza declarada. La subconfianza también es un problema: te lleva a estudiar de más temas que ya dominás. Recomendación: declará 10-15 puntos más arriba de lo que sientas en la próxima sesión.',
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
    const sid = session.id_session || session.id || 0;

    const shuffled = seededShuffle(QUESTION_POOL, sid);
    const picks = shuffled.slice(0, n);
    const correctMask = seededShuffle(
        Array.from({ length: n }, (_, i) => i < correctCount),
        sid + 13,
    );

    let aiCount = 0;
    const aiMax = profile === 'overconfident' ? 3 : profile === 'underconfident' ? 1 : 0;
    const aiBank = AI_FEEDBACK_BANK[profile] || [];

    return picks.map((q, i) => {
        const isCorrect = correctMask[i];

        let selectedIndex;
        if (isCorrect) {
            selectedIndex = q.correct_index;
        } else {
            const wrongs = [0, 1, 2, 3].filter((k) => k !== q.correct_index);
            selectedIndex = wrongs[(sid + i) % wrongs.length];
        }

        let confidenceDeclared;
        if (profile === 'overconfident') {
            confidenceDeclared = isCorrect ? 0.70 + ((sid + i) % 20) / 100 : 0.75 + ((sid + i) % 20) / 100;
        } else if (profile === 'underconfident') {
            confidenceDeclared = isCorrect ? 0.45 + ((sid + i) % 20) / 100 : 0.35 + ((sid + i) % 20) / 100;
        } else {
            confidenceDeclared = (isCorrect ? 0.65 : 0.45) + ((sid + i) % 15) / 100;
        }
        confidenceDeclared = Math.min(0.99, Math.max(0.01, confidenceDeclared));

        const bktSnapshot = isCorrect
            ? 0.55 + ((sid + i) % 25) / 100
            : 0.30 + ((sid + i) % 25) / 100;

        let aiFeedback = null;
        if (!isCorrect && aiCount < aiMax && aiBank.length > 0 && confidenceDeclared >= 0.70) {
            aiFeedback = aiBank[aiCount % aiBank.length];
            aiCount++;
        }

        return {
            id_response: `${sid}-q${i + 1}`,
            id_question: q.id_question,
            node: q.node,
            statement: q.statement,
            options: q.options,
            correct_index: q.correct_index,
            selected_index: selectedIndex,
            is_correct: isCorrect,
            confidence_declared: Number(confidenceDeclared.toFixed(2)),
            bkt_mastery: Number(Math.min(0.95, bktSnapshot).toFixed(2)),
            ai_feedback: aiFeedback,
            response_time_sec: 30 + ((sid + i * 7) % 80),
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


export function formatBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
