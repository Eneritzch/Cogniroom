import random

from services.claude_service import CognitiveAnalysisService

from .models import AIGenerationLog, Question


def shuffle_options(options, correct_indices, qtype):
    """Randomiza el orden y reubica las correctas: los modelos tienden a poner la
    correcta primera, lo que el estudiante detectaría. V/F conserva su orden."""
    if qtype == Question.TYPE_TRUE_FALSE or len(options) < 2:
        return options, sorted(correct_indices)
    order = list(range(len(options)))
    random.shuffle(order)
    new_options = [options[i] for i in order]
    correct_set = set(correct_indices)
    new_correct = sorted(j for j, old in enumerate(order) if old in correct_set)
    return new_options, new_correct


def persist_generated(node, generated, source_pdf, fallback_difficulty):
    created = []
    for item in generated:
        try:
            options = item.get('options', [])
            qtype = item.get('question_type', Question.TYPE_SINGLE)
            indices = item.get('correct_indices') or []
            if not isinstance(options, list) or not (2 <= len(options) <= 6):
                continue
            if qtype not in (Question.TYPE_SINGLE, Question.TYPE_TRUE_FALSE, Question.TYPE_MULTIPLE):
                continue
            if not isinstance(indices, list) or not indices:
                continue
            indices = [int(i) for i in indices]
            if len(set(indices)) != len(indices):
                continue
            if any(i < 0 or i >= len(options) for i in indices):
                continue
            if qtype in Question.SINGLE_ANSWER_TYPES and len(indices) != 1:
                continue
            if qtype == Question.TYPE_TRUE_FALSE and len(options) != 2:
                continue
            # El modelo pone la correcta siempre primera; randomizar es
            # imprescindible para que el estudiante no la adivine.
            options, indices = shuffle_options(options, indices, qtype)
            level = item.get('cognitive_level', '')
            if level not in dict(Question.COGNITIVE_LEVEL_CHOICES):
                level = ''
            q = Question.objects.create(
                node=node,
                statement=item.get('text', ''),
                difficulty=item.get('difficulty', fallback_difficulty),
                question_type=qtype,
                cognitive_level=level,
                options=options,
                correct_indices=indices,
                correct_index=indices[0],
                rationale=item.get('rationale', ''),
                source=Question.SOURCE_AI,
                source_pdf=source_pdf,
            )
            created.append(q)
        except (ValueError, TypeError):
            continue
    return created


def run_generation(teacher, room, node, source_pdf, difficulty, count, content, file_id, question_type, focus):
    """Genera, guarda y registra el consumo. Devuelve las preguntas creadas."""
    claude = CognitiveAnalysisService()
    generated = claude.generate_questions(
        difficulty=difficulty, count=count, content=content,
        file_id=file_id, question_type=question_type, focus=focus,
    )
    created = persist_generated(node, generated, source_pdf, difficulty)

    usage = claude.last_usage
    if usage is not None:
        AIGenerationLog.objects.create(
            teacher=teacher, room=room, node=node,
            model=CognitiveAnalysisService.MODEL_GENERATION,
            requested_count=count, created_count=len(created),
            input_tokens=getattr(usage, 'input_tokens', 0) or 0,
            output_tokens=getattr(usage, 'output_tokens', 0) or 0,
            cache_read_tokens=getattr(usage, 'cache_read_input_tokens', 0) or 0,
        )
    return created
