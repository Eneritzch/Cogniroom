import json

from django.conf import settings


class CognitiveAnalysisService:
    MODEL = 'claude-sonnet-4-5'
    MAX_TOKENS = 1024

    def __init__(self):
        from anthropic import Anthropic

        api_key = getattr(settings, 'ANTHROPIC_API_KEY', '') or ''
        self.client = Anthropic(api_key=api_key) if api_key else None

    def _message(self, system: str, user: str) -> str:
        if self.client is None:
            return ''
        try:
            response = self.client.messages.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=system,
                messages=[{'role': 'user', 'content': user}],
            )
            parts = []
            for block in response.content:
                text = getattr(block, 'text', None)
                if text:
                    parts.append(text)
            return ''.join(parts).strip()
        except Exception:
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

    def generate_questions(
        self,
        content: str,
        node_name: str,
        difficulty: str,
        count: int,
    ) -> list:
        system = (
            'Eres un sistema experto en generación de preguntas académicas '
            'de opción múltiple. Respondes únicamente en JSON válido, sin '
            'texto adicional, sin markdown, sin backticks.'
        )

        user_prompt = (
            f'Genera exactamente {count} preguntas de opción múltiple sobre '
            f'el tema "{node_name}" con dificultad "{difficulty}", basadas '
            f'en el siguiente contenido:\n\n{content}\n\n'
            'Responde con un JSON array exacto con este formato:\n'
            '[\n'
            '  {\n'
            '    "text": "pregunta",\n'
            '    "options": ["op1", "op2", "op3", "op4"],\n'
            '    "correct_index": 0,\n'
            f'    "difficulty": "{difficulty}"\n'
            '  }\n'
            ']\n'
            'Cada pregunta debe tener exactamente 4 opciones y un correct_index entre 0 y 3.'
        )

        raw = self._message(system, user_prompt)
        if not raw:
            return []

        try:
            parsed = json.loads(raw)
            if not isinstance(parsed, list):
                return []
            return parsed
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
