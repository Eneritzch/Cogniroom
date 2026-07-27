import json

import anthropic
from django.conf import settings


QUESTION_SCHEMA = {
    'type': 'object',
    'properties': {
        'questions': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'text': {'type': 'string'},
                    'question_type': {
                        'type': 'string',
                        'enum': ['single', 'true_false', 'multiple'],
                    },
                    'options': {'type': 'array', 'items': {'type': 'string'}},
                    'correct_indices': {'type': 'array', 'items': {'type': 'integer'}},
                    'difficulty': {'type': 'string', 'enum': ['easy', 'medium', 'hard']},
                    'cognitive_level': {
                        'type': 'string',
                        'enum': ['recordar', 'comprender', 'aplicar', 'analizar', 'evaluar', 'crear'],
                    },
                    'rationale': {'type': 'string'},
                    'misconception_targeted': {'type': 'string'},
                },
                'required': [
                    'text', 'question_type', 'options', 'correct_indices',
                    'difficulty', 'cognitive_level', 'rationale', 'misconception_targeted',
                ],
                'additionalProperties': False,
            },
        }
    },
    'required': ['questions'],
    'additionalProperties': False,
}

JUDGE_SCHEMA = {
    'type': 'object',
    'properties': {
        'evaluations': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'single_correct': {'type': 'integer', 'enum': [1, 2, 3, 4, 5]},
                    'plausible_distractors': {'type': 'integer', 'enum': [1, 2, 3, 4, 5]},
                    'standalone_stem': {'type': 'integer', 'enum': [1, 2, 3, 4, 5]},
                    'grounded_in_material': {'type': 'integer', 'enum': [1, 2, 3, 4, 5]},
                    'homogeneous_options': {'type': 'integer', 'enum': [1, 2, 3, 4, 5]},
                    'comment': {'type': 'string'},
                },
                'required': [
                    'single_correct', 'plausible_distractors', 'standalone_stem',
                    'grounded_in_material', 'homogeneous_options', 'comment',
                ],
                'additionalProperties': False,
            },
        }
    },
    'required': ['evaluations'],
    'additionalProperties': False,
}

DIAGNOSIS_SCHEMA = {
    'type': 'object',
    'properties': {
        'profile': {'type': 'string', 'enum': ['overconfident', 'underconfident', 'calibrated']},
        'risk_level': {'type': 'string', 'enum': ['high', 'medium', 'low']},
        'risk_nodes': {'type': 'array', 'items': {'type': 'string'}},
        'prediction': {'type': 'number'},
        'problem_type': {
            'type': 'string',
            'enum': [
                'vacio_conceptual', 'confusion_conceptual', 'error_procedimental',
                'aplicacion_incorrecta', 'sin_patron',
            ],
        },
        'reasoning': {'type': 'string'},
        'recommendation': {'type': 'string'},
        'student_reasoning': {'type': 'string'},
        'student_recommendation': {'type': 'string'},
    },
    'required': [
        'profile', 'risk_level', 'risk_nodes', 'prediction',
        'problem_type', 'reasoning', 'recommendation',
        'student_reasoning', 'student_recommendation',
    ],
    'additionalProperties': False,
}

JUDGE_RULES = (
    'Eres un evaluador psicométrico independiente. Calificas ítems de opción '
    'múltiple contra una rúbrica, del 1 (deficiente) al 5 (excelente), siendo '
    'estricto y escéptico. Criterios:\n'
    '- single_correct: ¿hay exactamente una opción inequívocamente correcta?\n'
    '- plausible_distractors: ¿los distractores son plausibles y atacan errores '
    'conceptuales reales y distintos?\n'
    '- standalone_stem: ¿el enunciado se puede responder sin leer las opciones?\n'
    '- grounded_in_material: ¿la pregunta se ancla en el material provisto?\n'
    '- homogeneous_options: ¿las opciones son homogéneas en longitud, gramática '
    'y detalle?\n'
    'Devuelve una evaluación por pregunta, en el mismo orden recibido. '
    '"comment" es una justificación breve en español.'
)

GENERATION_RULES = (
    'Eres un experto en psicometría y diseño de ítems de opción múltiple para '
    'evaluación universitaria. Construyes preguntas siguiendo las reglas de '
    'Haladyna:\n'
    '1. Exactamente una opción inequívocamente correcta.\n'
    '2. Los TRES distractores deben ser individualmente plausibles para un '
    'estudiante que estudió a medias: cada uno nace de un error conceptual '
    'real y distinto, tiene forma y nivel de detalle parecidos a la respuesta '
    'correcta, y nunca es absurdo ni descartable de un vistazo. Si no encuentras '
    'tres errores plausibles, baja la cantidad de preguntas antes que rellenar '
    'con distractores débiles. Prohibido "todas/ninguna de las anteriores".\n'
    '3. El enunciado debe poder responderse sin ver las opciones.\n'
    '4. Opciones homogéneas en longitud, gramática y nivel de detalle.\n'
    '5. Una sola idea por pregunta; sin dobles negaciones.\n'
    '6. Anclado únicamente en el material provisto. Si el material no alcanza '
    'para una pregunta limpia, genera menos preguntas.\n\n'
    'Tipos de pregunta (campo "question_type") y "correct_indices" (lista de '
    'índices correctos, base 0):\n'
    '- "single": opción única, 3-5 opciones, exactamente UNA correcta.\n'
    '- "true_false": exactamente 2 opciones ("Verdadero" y "Falso") y UNA '
    'correcta; el enunciado es una afirmación evaluable.\n'
    '- "multiple": 4-6 opciones con DOS O MÁS correctas; las reglas de '
    'distractores aplican a las incorrectas, y todas las correctas deben estar '
    'inequívocamente respaldadas por el material.\n'
    'Para cada pregunta, "rationale" explica por qué las correctas lo son y '
    '"misconception_targeted" nombra el error conceptual que capturan los '
    'distractores. Clasifica además el nivel cognitivo en "cognitive_level" '
    '(taxonomía de Bloom): "recordar" (datos/definiciones), "comprender" '
    '(explicar/interpretar), "aplicar" (usar en un caso concreto), "analizar" '
    '(descomponer/relacionar), "evaluar" (juzgar con criterios) o "crear" '
    '(proponer/diseñar algo nuevo). Responde en español.'
)


class CognitiveAnalysisService:
    # Generación con Sonnet (no Opus): para redactar MCQ a partir de material dado,
    # Sonnet rinde de sobra y responde ~2-3x más rápido y barato que Opus.
    MODEL_GENERATION = 'claude-sonnet-4-6'
    MODEL_ANALYSIS = 'claude-sonnet-4-6'
    MAX_TOKENS_GENERATION = 8000
    MAX_TOKENS_ANALYSIS = 1024

    def __init__(self):
        api_key = getattr(settings, 'ANTHROPIC_API_KEY', '') or ''
        # max_retries sobre el default (2): la generación es pesada y la API devuelve 529
        # transitorios; sin esto el docente vería "0 preguntas" por saturación pasajera.
        self.client = anthropic.Anthropic(api_key=api_key, max_retries=4) if api_key else None
        self.last_usage = None

    def _message(self, system: str, user: str) -> str:
        if self.client is None:
            return ''
        try:
            response = self.client.messages.create(
                model=self.MODEL_ANALYSIS,
                max_tokens=self.MAX_TOKENS_ANALYSIS,
                system=system,
                messages=[{'role': 'user', 'content': user}],
            )
            parts = []
            for block in response.content:
                text = getattr(block, 'text', None)
                if text:
                    parts.append(text)
            return ''.join(parts).strip()
        except anthropic.AnthropicError:
            return ''

    def analyze_student(self, student_data: dict, error_context: dict = None) -> dict:
        defaults = {
            'profile': 'calibrated',
            'risk_level': 'low',
            'risk_nodes': [],
            'prediction': 0.5,
            'reasoning': '',
            'recommendation': '',
            'student_reasoning': '',
            'student_recommendation': '',
            'problem_type': 'sin_patron',
        }
        if self.client is None:
            return defaults

        known_nodes = student_data.get('known_nodes', []) or []

        system = (
            'Eres un analista pedagógico. Del mismo diagnóstico escribes DOS '
            'versiones con audiencias distintas: una para el docente (habla del '
            'estudiante en tercera persona) y otra para el propio estudiante '
            '(le hablas a él, de "tú"). Diagnosticas SOLO a partir de los datos '
            'provistos: no inventes causas, temas ni hechos que no estén en la '
            'evidencia. Si no hay un patrón claro, dilo (problem_type '
            '"sin_patron") en vez de especular.'
        )

        error_block = ''
        if error_context:
            error_block = (
                '\nError puntual que disparó este análisis (basa el diagnóstico en esto):\n'
                f"- Tema: {error_context.get('node', '')}\n"
                f"- Pregunta: {error_context.get('question', '')}\n"
                f"- Respondió (incorrecto): {error_context.get('selected', '')}\n"
                f"- Respuesta correcta: {error_context.get('correct', '')}\n"
                f"- Por qué la correcta lo es: {error_context.get('rationale', '')}\n"
            )

        user_prompt = (
            'Analiza el perfil del estudiante con los siguientes datos:\n'
            f"- icc_avg: {student_data.get('icc_avg', 0.0)}\n"
            f"- bkt_nodes: {json.dumps(student_data.get('bkt_nodes', {}), ensure_ascii=False)}\n"
            f"- confidence_avg: {student_data.get('confidence_avg', 0.0)}\n"
            f"- overconfident_nodes: {json.dumps(student_data.get('overconfident_nodes', []), ensure_ascii=False)}\n"
            f"- error_patterns: {json.dumps(student_data.get('error_patterns', []), ensure_ascii=False)}\n"
            f"{error_block}\n"
            'Elige "risk_nodes" ÚNICAMENTE de esta lista de temas reales: '
            f"{json.dumps(known_nodes, ensure_ascii=False)}. Si ninguno aplica, deja "
            'la lista vacía. NO inventes ni traduzcas nombres de temas.\n\n'
            '"problem_type" (valor interno, elige uno): "vacio_conceptual" (no '
            'conoce el concepto), "confusion_conceptual" (mezcla conceptos), '
            '"error_procedimental" (conoce pero falla al aplicar), '
            '"aplicacion_incorrecta" (aplica bien un concepto equivocado) o '
            '"sin_patron" (sin patrón claro).\n\n'
            'MUY IMPORTANTE — los cuatro textos van en español claro y cotidiano, '
            'sin jerga (nada de "BKT", "ICC", "metacognición", "calibración", '
            '"nodo", ni números/probabilidades) y hablando de "temas".\n\n'
            'PARA EL DOCENTE (tercera persona, habla DEL estudiante):\n'
            '"reasoning" (1-2 frases): nombra EXACTAMENTE qué idea confunde el '
            'estudiante y con cuál la está mezclando, y por qué probablemente pasa, '
            'apoyándote en su error concreto.\n'
            '"recommendation" (1-2 frases): una acción concreta que el docente puede '
            'pedirle, dirigida a ESA confusión puntual — por ejemplo, que contraste '
            'los dos conceptos que mezcla y explique con sus palabras en qué se '
            'diferencian. NO des consejos genéricos como "que relea el tema" sin '
            'decir qué comparar o revisar.\n\n'
            'PARA EL ESTUDIANTE (segunda persona, le hablas A ÉL de "tú", con '
            'cercanía y sin culpabilizar):\n'
            '"student_reasoning" (1-2 frases): explícale qué idea está mezclando y '
            'con cuál, partiendo de su error concreto. Ejemplo de tono: "Estás '
            'tomando X como si fuera Y, y por eso...".\n'
            '"student_recommendation" (1-2 frases): una acción concreta que él mismo '
            'puede hacer ahora, empezando por un verbo en imperativo dirigido a él '
            '("Abre...", "Compara...", "Escribe..."). \n'
            'PROHIBIDO en los campos "student_*": referirse al estudiante en tercera '
            'persona ("el estudiante", "el alumno"), hablarle al docente, o dar '
            'instrucciones sobre él ("pide al estudiante que...", "haz que...", '
            '"pídele..."). Esos textos los lee el estudiante en su propia pantalla.'
        )

        try:
            response = self.client.messages.create(
                model=self.MODEL_ANALYSIS,
                max_tokens=self.MAX_TOKENS_ANALYSIS,
                output_config={
                    'format': {'type': 'json_schema', 'schema': DIAGNOSIS_SCHEMA},
                },
                system=system,
                messages=[{'role': 'user', 'content': user_prompt}],
            )
        except anthropic.AnthropicError:
            return defaults

        raw = ''
        for block in response.content:
            if getattr(block, 'type', None) == 'text':
                raw = block.text
                break
        if not raw:
            return defaults

        try:
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                return defaults
        except (json.JSONDecodeError, ValueError):
            return defaults

        # Descarta temas que el modelo haya inventado fuera de la sala.
        known_set = set(known_nodes)
        risk_nodes = parsed.get('risk_nodes') or []
        parsed['risk_nodes'] = [n for n in risk_nodes if n in known_set]

        try:
            parsed['prediction'] = min(1.0, max(0.0, float(parsed.get('prediction', 0.5))))
        except (TypeError, ValueError):
            parsed['prediction'] = defaults['prediction']

        for key, default_value in defaults.items():
            parsed.setdefault(key, default_value)
        return parsed

    def upload_pdf(self, fileobj, filename: str) -> str:
        # Sube el PDF una sola vez a la Files API y devuelve su file_id. Devuelve '' si la
        # IA está apagada o la subida falla: siempre se puede caer a pdfplumber.
        if self.client is None:
            return ''
        try:
            uploaded = self.client.beta.files.upload(
                file=(filename, fileobj, 'application/pdf'),
                betas=['files-api-2025-04-14'],
            )
            return uploaded.id
        except anthropic.AnthropicError:
            return ''

    def _material_block(self, content: str, file_id: str):
        # Material cacheable: PDF nativo si hay file_id, si no texto plano. El cache_control
        # deja que las siguientes generaciones lo lean a ~10% del costo.
        if file_id:
            return {
                'type': 'document',
                'source': {'type': 'file', 'file_id': file_id},
                'cache_control': {'type': 'ephemeral'},
            }
        return {
            'type': 'text',
            'text': f'Material de referencia:\n\n{content}',
            'cache_control': {'type': 'ephemeral'},
        }

    def _generation_messages(self, difficulty, count, content='', file_id='', question_type='', focus=''):
        # El material va primero y cacheable; la instrucción, que varía, va después del
        # breakpoint para no invalidar el prefijo cacheado.
        type_labels = {
            'single': 'todas de opción única (question_type="single")',
            'true_false': 'todas de verdadero/falso (question_type="true_false")',
            'multiple': 'todas de opción múltiple (question_type="multiple")',
        }
        type_clause = type_labels.get(
            question_type,
            'combinando tipos (single, true_false, multiple) según convenga al material',
        )
        # El recorte temático lo da el enfoque del docente (no el nombre del nodo,
        # que puede ser arbitrario). Vacío = cubrir todo el material.
        focus = (focus or '').strip()
        scope = f' Enfócate únicamente en estos temas o secciones del material: {focus}.' if focus else ''
        return [{
            'role': 'user',
            'content': [
                self._material_block(content, file_id),
                {
                    'type': 'text',
                    'text': (
                        f'Genera exactamente {count} preguntas con dificultad "{difficulty}", '
                        f'{type_clause}, basadas únicamente en el material de referencia anterior.'
                        f'{scope}'
                    ),
                },
            ],
        }]

    def generate_questions(
        self,
        difficulty: str,
        count: int,
        content: str = '',
        file_id: str = '',
        question_type: str = '',
        focus: str = '',
    ) -> list:
        if self.client is None:
            return []

        self.last_usage = None
        kwargs = dict(
            model=self.MODEL_GENERATION,
            max_tokens=self.MAX_TOKENS_GENERATION,
            thinking={'type': 'adaptive'},
            output_config={
                # 'medium' en vez de 'high': para MCQ sobre material dado, el esfuerzo
                # alto solo añadía latencia sin mejorar preguntas de forma perceptible.
                'effort': 'medium',
                'format': {'type': 'json_schema', 'schema': QUESTION_SCHEMA},
            },
            system=GENERATION_RULES,
            messages=self._generation_messages(
                difficulty, count,
                content=content, file_id=file_id, question_type=question_type, focus=focus,
            ),
        )
        try:
            if file_id:
                response = self.client.beta.messages.create(betas=['files-api-2025-04-14'], **kwargs)
            else:
                response = self.client.messages.create(**kwargs)
            self.last_usage = response.usage
        except anthropic.AnthropicError:
            return []

        raw = ''
        for block in response.content:
            if getattr(block, 'type', None) == 'text':
                raw = block.text
                break

        if not raw:
            return []

        try:
            parsed = json.loads(raw)
            questions = parsed.get('questions', []) if isinstance(parsed, dict) else []
            return questions if isinstance(questions, list) else []
        except (json.JSONDecodeError, ValueError):
            return []

    def judge_questions(self, questions: list, content: str) -> list:
        if self.client is None or not questions:
            return []

        items = []
        for i, q in enumerate(questions):
            items.append(
                f'Pregunta {i + 1}:\n'
                f"  tipo: {q.get('question_type', 'single')}\n"
                f"  enunciado: {q.get('text', '')}\n"
                f"  opciones: {json.dumps(q.get('options', []), ensure_ascii=False)}\n"
                f"  correctas (índices): {q.get('correct_indices', [])}\n"
            )

        user_prompt = (
            'Material de referencia:\n'
            f'{content}\n\n'
            f'Evalúa las siguientes {len(questions)} preguntas:\n\n'
            + '\n'.join(items)
        )

        try:
            response = self.client.messages.create(
                model=self.MODEL_ANALYSIS,
                max_tokens=self.MAX_TOKENS_GENERATION,
                output_config={
                    'format': {'type': 'json_schema', 'schema': JUDGE_SCHEMA},
                },
                system=JUDGE_RULES,
                messages=[{'role': 'user', 'content': user_prompt}],
            )
        except anthropic.AnthropicError:
            return []

        raw = ''
        for block in response.content:
            if getattr(block, 'type', None) == 'text':
                raw = block.text
                break

        if not raw:
            return []

        try:
            parsed = json.loads(raw)
            evaluations = parsed.get('evaluations', []) if isinstance(parsed, dict) else []
            return evaluations if isinstance(evaluations, list) else []
        except (json.JSONDecodeError, ValueError):
            return []

    def explain_error(
        self,
        question_text: str,
        selected_answer: str,
        correct_answer: str,
        bkt_context: dict,
        is_correct: bool = False,
    ) -> str:
        system = (
            'Eres un tutor cercano que le habla directamente al estudiante en '
            'español claro y cotidiano, como una persona real. Sin tecnicismos '
            'ni jerga (nada de "BKT", "ICC", "metacognición", "nodo", '
            '"calibración"), sin markdown, sin backticks, sin JSON. Máximo 120 '
            'palabras.'
        )

        node = bkt_context.get('node', '') if isinstance(bkt_context, dict) else ''

        if is_correct:
            # Se dispara aunque el alumno ACIERTE (cuando su confianza no coincide
            # con lo que sabe). No hay que tratarlo como un error.
            user_prompt = (
                f'Tema: {node}\n'
                f'Pregunta: {question_text}\n'
                f'Respuesta del estudiante: {selected_answer} — es CORRECTA.\n'
                f'Respuesta correcta: {correct_answer}\n\n'
                'El estudiante ACERTÓ, pero respondió con poca seguridad. '
                'Confírmale con calidez que su respuesta fue correcta, explícale '
                'en una o dos frases por qué lo es, y anímalo a confiar más en lo '
                'que ya sabe. No digas ni insinúes que se equivocó ni menciones '
                'ningún "error del sistema".'
            )
        else:
            user_prompt = (
                f'Tema: {node}\n'
                f'Pregunta: {question_text}\n'
                f'Respuesta del estudiante (incorrecta): {selected_answer}\n'
                f'Respuesta correcta: {correct_answer}\n\n'
                'Explícale con amabilidad y en lenguaje sencillo por qué su '
                'respuesta no es correcta y cómo entender la respuesta correcta.'
            )

        return self._message(system, user_prompt) or ''
