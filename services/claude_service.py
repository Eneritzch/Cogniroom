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
                    'rationale': {'type': 'string'},
                    'misconception_targeted': {'type': 'string'},
                },
                'required': [
                    'text', 'question_type', 'options', 'correct_indices',
                    'difficulty', 'rationale', 'misconception_targeted',
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
    'distractores. Responde en español.'
)


class CognitiveAnalysisService:
    MODEL_GENERATION = 'claude-opus-4-8'
    MODEL_ANALYSIS = 'claude-sonnet-4-6'
    MAX_TOKENS_GENERATION = 8000
    MAX_TOKENS_ANALYSIS = 1024

    def __init__(self):
        api_key = getattr(settings, 'ANTHROPIC_API_KEY', '') or ''
        self.client = anthropic.Anthropic(api_key=api_key) if api_key else None
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

    def analyze_student(self, student_data: dict) -> dict:
        defaults = {
            'profile': 'calibrated',
            'risk_level': 'low',
            'risk_nodes': [],
            'prediction': 0.5,
            'reasoning': '',
            'recommendation': '',
        }

        system = (
            'Eres un sistema experto en análisis cognitivo académico. '
            'Respondes únicamente en JSON válido, sin texto adicional, '
            'sin markdown, sin backticks.'
        )

        user_prompt = (
            'Analiza el perfil cognitivo del estudiante con los siguientes datos:\n'
            f"- icc_avg: {student_data.get('icc_avg', 0.0)}\n"
            f"- bkt_nodes: {json.dumps(student_data.get('bkt_nodes', {}), ensure_ascii=False)}\n"
            f"- confidence_avg: {student_data.get('confidence_avg', 0.0)}\n"
            f"- overconfident_nodes: {json.dumps(student_data.get('overconfident_nodes', []), ensure_ascii=False)}\n"
            f"- error_patterns: {json.dumps(student_data.get('error_patterns', []), ensure_ascii=False)}\n\n"
            'Responde con un JSON con este formato exacto:\n'
            '{\n'
            '  "profile": "overconfident|underconfident|calibrated",\n'
            '  "risk_level": "high|medium|low",\n'
            '  "risk_nodes": ["nodo1", "nodo2"],\n'
            '  "prediction": 0.0,\n'
            '  "reasoning": "texto",\n'
            '  "recommendation": "texto"\n'
            '}'
        )

        raw = self._message(system, user_prompt)
        if not raw:
            return defaults

        try:
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                return defaults
            for key, default_value in defaults.items():
                parsed.setdefault(key, default_value)
            return parsed
        except (json.JSONDecodeError, ValueError):
            return defaults

    def upload_pdf(self, fileobj, filename: str) -> str:
        # Sube el PDF a la Files API de Anthropic una sola vez y devuelve su
        # file_id (para generar con el PDF nativo). Devuelve '' si la IA no está
        # activa o si la subida falla — el flujo siempre puede caer a pdfplumber.
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
        # Bloque cacheable del material: PDF nativo (document) si hay file_id,
        # si no texto plano. El cache_control deja que las generaciones
        # siguientes lo lean a ~10% del costo.
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

    def _generation_messages(self, node_name, difficulty, count, content='', file_id='', question_type=''):
        # El material va primero y marcado como cacheable; la instrucción (que
        # varía por nodo/dificultad/cantidad) va después del breakpoint para no
        # invalidar el prefijo cacheado.
        type_labels = {
            'single': 'todas de opción única (question_type="single")',
            'true_false': 'todas de verdadero/falso (question_type="true_false")',
            'multiple': 'todas de opción múltiple (question_type="multiple")',
        }
        type_clause = type_labels.get(
            question_type,
            'combinando tipos (single, true_false, multiple) según convenga al material',
        )
        return [{
            'role': 'user',
            'content': [
                self._material_block(content, file_id),
                {
                    'type': 'text',
                    'text': (
                        f'Genera exactamente {count} preguntas sobre el tema '
                        f'"{node_name}" con dificultad "{difficulty}", {type_clause}, '
                        'basadas únicamente en el material de referencia anterior.'
                    ),
                },
            ],
        }]

    def estimate_generation_tokens(
        self, content='', node_name='', difficulty='medium', count=1, file_id=''
    ) -> int:
        # Estimación de tokens de entrada para mostrar el costo aproximado en el
        # panel del docente antes de generar. Devuelve 0 si la IA no está activa.
        # La Files API no es compatible con el endpoint de token counting, así
        # que para PDF nativo no hay estimación previa (la devolvemos en 0).
        if self.client is None or file_id:
            return 0
        messages = self._generation_messages(node_name, difficulty, count, content=content)
        try:
            resp = self.client.messages.count_tokens(
                model=self.MODEL_GENERATION,
                system=GENERATION_RULES,
                messages=messages,
            )
            return resp.input_tokens
        except anthropic.AnthropicError:
            return 0

    def generate_questions(
        self,
        node_name: str,
        difficulty: str,
        count: int,
        content: str = '',
        file_id: str = '',
        question_type: str = '',
    ) -> list:
        if self.client is None:
            return []

        self.last_usage = None
        kwargs = dict(
            model=self.MODEL_GENERATION,
            max_tokens=self.MAX_TOKENS_GENERATION,
            thinking={'type': 'adaptive'},
            output_config={
                'effort': 'high',
                'format': {'type': 'json_schema', 'schema': QUESTION_SCHEMA},
            },
            system=GENERATION_RULES,
            messages=self._generation_messages(
                node_name, difficulty, count,
                content=content, file_id=file_id, question_type=question_type,
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
    ) -> str:
        system = (
            'Eres un tutor académico que explica errores de manera clara y '
            'concisa. Responde en texto plano, máximo 150 palabras, sin '
            'markdown, sin backticks, sin JSON.'
        )

        user_prompt = (
            f'Pregunta: {question_text}\n'
            f'Respuesta seleccionada (incorrecta): {selected_answer}\n'
            f'Respuesta correcta: {correct_answer}\n'
            f'Contexto BKT: {json.dumps(bkt_context, ensure_ascii=False)}\n\n'
            'Explica al estudiante por qué su respuesta es incorrecta y '
            'cómo entender la respuesta correcta. Máximo 150 palabras.'
        )

        return self._message(system, user_prompt) or ''
