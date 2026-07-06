from collections import Counter

from django.db.models import Avg
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.rooms.models import Room, RoomMembership
from apps.sessions.models import Answer, EvaluationSession
from services.cognitive_quadrant import QUADRANTS, classify_quadrant, is_critical

from .models import (
    AIDiagnosis,
    BKTState,
    BlindSpotIndex,
    CognitiveIndex,
)
from .serializers import (
    AIDiagnosisSerializer,
    BKTStateSerializer,
    BlindSpotIndexSerializer,
)


def _parse_section(request, room):
    """Lee ?section_id= y valida que pertenezca a la sala.

    Devuelve (section_id|None, error_response|None). Sin parámetro (o 'all')
    → (None, None): comportamiento de sala completa, intacto.
    """
    raw = request.query_params.get('section_id')
    if raw in (None, '', 'all'):
        return None, None
    try:
        sid = int(raw)
    except (TypeError, ValueError):
        return None, Response({'detail': 'Invalid section_id.'}, status=status.HTTP_400_BAD_REQUEST)
    if not room.sections.filter(id=sid).exists():
        return None, Response(
            {'detail': 'Section not found in this room.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return sid, None


class MyProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        last_diag = (
            AIDiagnosis.objects.filter(student=user).order_by('-generated_at').first()
        )
        icc_avg = (
            CognitiveIndex.objects.filter(student=user)
            .aggregate(avg=Avg('icc_value'))['avg']
            or 0.0
        )
        bkt_states = BKTState.objects.filter(student=user).select_related('node')
        avg_mastery = bkt_states.aggregate(avg=Avg('p_mastery'))['avg'] or 0.0

        profiles = list(
            CognitiveIndex.objects.filter(student=user).values_list('profile', flat=True)
        )
        predominant = None
        if profiles:
            predominant = Counter(profiles).most_common(1)[0][0]

        total_sessions = EvaluationSession.objects.filter(student=user).count()
        total_answers = Answer.objects.filter(session__student=user).count()
        ai_diagnoses_count = AIDiagnosis.objects.filter(student=user).count()

        return Response({
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'institution': user.institution.name if user.institution_id else '',
            'role': user.role,
            'date_joined': user.date_joined,
            'icc_avg': round(float(icc_avg), 4),
            'avg_mastery': round(float(avg_mastery), 4),
            'predominant_profile': predominant,
            'total_sessions': total_sessions,
            'total_answers': total_answers,
            'nodes_tracked': bkt_states.count(),
            'ai_diagnoses_count': ai_diagnoses_count,
            'last_diagnosis': AIDiagnosisSerializer(last_diag).data if last_diag else None,
            'bkt_states': BKTStateSerializer(bkt_states, many=True).data,
        })


class MyDiagnosesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        diagnoses = (
            AIDiagnosis.objects.filter(student=request.user)
            .order_by('-generated_at')
        )
        return Response(AIDiagnosisSerializer(diagnoses, many=True).data)


class MyNodesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        bkt_states = BKTState.objects.filter(student=user).select_related('node')

        result = []
        for state in bkt_states:
            indices = list(
                CognitiveIndex.objects.filter(student=user, node=state.node)
                .order_by('-calculated_at')[:3]
            )
            latest = indices[0] if indices else None
            trend = 'estable'
            if len(indices) >= 2:
                diff = indices[0].icc_value - indices[-1].icc_value
                if diff > 0.05:
                    trend = 'mejorando'
                elif diff < -0.05:
                    trend = 'empeorando'

            result.append({
                'node_id': state.node_id,
                'node_name': state.node.name,
                'name': state.node.name,
                'description': '',
                'p_mastery': round(state.p_mastery, 4),
                'avg_confidence': round(latest.avg_confidence, 4) if latest else None,
                'icc_value': round(latest.icc_value, 4) if latest else None,
                'profile': latest.profile if latest else None,
                'attempts': state.attempts,
                'trend': trend,
            })

        return Response(result)


DIAGNOSIS_TITLES = {
    'overconfident': 'Brecha de sobreconfianza detectada',
    'underconfident': 'Subestimación del propio dominio',
    'calibrated': 'Calibración alineada',
}


class MyNodeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, node_id):
        user = request.user
        bkt = get_object_or_404(
            BKTState.objects.select_related('node__room'),
            student=user, node_id=node_id,
        )
        node = bkt.node

        latest_ci = (
            CognitiveIndex.objects.filter(student=user, node_id=node_id)
            .order_by('-calculated_at')
            .first()
        )

        diag = (
            AIDiagnosis.objects.filter(student=user, node_id=node_id)
            .order_by('-generated_at')
            .first()
        )
        diagnosis = None
        if diag:
            diagnosis = {
                'title': DIAGNOSIS_TITLES.get(diag.classification, 'Diagnóstico cognitivo'),
                'reasoning': diag.reasoning,
                'recommendation': diag.recommendation,
                'generated_at': diag.generated_at,
            }

        answers = (
            Answer.objects.filter(session__student=user, question__node_id=node_id)
            .select_related('question')
            .order_by('-answered_at')[:10]
        )
        recent = [{
            'statement': a.question.statement,
            'confidence_declared': a.confidence_declared,
            'bkt_mastery': a.bkt_mastery_snapshot,
            'is_correct': a.is_correct,
            'answered_at': a.answered_at,
            'id_session': a.session_id,
        } for a in answers]

        return Response({
            'node_id': node.id,
            'name': node.name,
            'description': '',
            'room': {'id_room': node.room_id, 'name': node.room.name},
            'updated_at': bkt.updated_at,
            'profile': latest_ci.profile if latest_ci else 'calibrated',
            'avg_confidence': latest_ci.avg_confidence if latest_ci else 0.0,
            'bkt_mastery': latest_ci.bkt_mastery if latest_ci else round(bkt.p_mastery, 4),
            'icc_value': latest_ci.icc_value if latest_ci else 0.0,
            'attempts': bkt.attempts,
            'p_mastery': round(bkt.p_mastery, 4),
            'p_transit': round(bkt.p_transit, 4),
            'p_guess': round(bkt.p_guess, 4),
            'p_slip': round(bkt.p_slip, 4),
            'diagnosis': diagnosis,
            'recentResponses': recent,
        })


class BlindSpotsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can view blind spots.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        section_id, error = _parse_section(request, room)
        if error:
            return error

        if section_id is None:
            spots = BlindSpotIndex.objects.filter(room=room).order_by('ipc_value')
            return Response(BlindSpotIndexSerializer(spots, many=True).data)

        # Por sección: el IPC almacenado es de sala completa, así que se recalcula
        # (promedio de ICC de los alumnos de la sección) por nodo, en vivo.
        result = []
        for node in room.nodes.order_by('id'):
            ci = CognitiveIndex.objects.filter(
                node=node,
                student__room_memberships__room=room,
                student__room_memberships__section_id=section_id,
            )
            total = ci.values('student').distinct().count()
            if total == 0:
                continue
            ipc = round(float(ci.aggregate(v=Avg('icc_value'))['v'] or 0.0), 4)
            result.append({
                'id': None,
                'node': node.id,
                'node_name': node.name,
                'room': room.id,
                'ipc_value': ipc,
                'total_student': total,
                'calculated_at': None,
                'alert': ipc < 0.5,
            })
        result.sort(key=lambda s: s['ipc_value'])
        return Response(result)


class AtRiskView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can view at-risk students.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        section_id, error = _parse_section(request, room)
        if error:
            return error

        # En riesgo = descalibración metacognitiva. Se cruza lo que el estudiante
        # REALMENTE sabe (BKT) con lo que CREE saber (confianza) en 4 cuadrantes;
        # el crítico es "no sabe y está confiado". Se calcula desde las métricas
        # reales (no depende de que Claude haya corrido). Los cuadrantes sanos
        # (sabe y confía / no sabe y lo reconoce) no se listan como alerta.
        result = []
        memberships = RoomMembership.objects.filter(room=room).select_related('student')
        if section_id is not None:
            memberships = memberships.filter(section_id=section_id)
        for m in memberships:
            agg = (
                CognitiveIndex.objects.filter(node__room=room, student=m.student)
                .aggregate(gap=Avg('metacognitive_gap'), conf=Avg('avg_confidence'),
                           mastery=Avg('bkt_mastery'))
            )
            if agg['mastery'] is None or agg['conf'] is None:
                continue
            quadrant = classify_quadrant(agg['mastery'], agg['conf'])
            if quadrant not in ('overconfident', 'underconfident'):
                continue
            critical = is_critical(quadrant)
            result.append({
                'first_name': m.student.first_name,
                'last_name': m.student.last_name,
                'profile': quadrant,
                'quadrant': quadrant,
                'quadrant_label': QUADRANTS[quadrant]['label'],
                'critical': critical,
                'metacognitive_gap': round(float(agg['gap'] or 0.0), 4),
                'risk_level': 'high' if critical else 'medium',
            })

        # Los críticos primero; dentro de cada grupo, por magnitud de la brecha.
        result.sort(key=lambda s: (not s['critical'], -abs(s['metacognitive_gap'])))
        return Response(result)


class RoomHeatmapView(APIView):
    """Matriz de dominio (BKT) por estudiante × nodo, para el heatmap de métricas."""
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can view metrics.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        section_id, error = _parse_section(request, room)
        if error:
            return error

        nodes = list(room.nodes.order_by('id'))
        memberships = (
            RoomMembership.objects.filter(room=room)
            .select_related('student', 'section')
            .order_by('student__first_name', 'student__last_name')
        )
        if section_id is not None:
            memberships = memberships.filter(section_id=section_id)

        mastery = {
            (b.student_id, b.node_id): b.p_mastery
            for b in BKTState.objects.filter(node__room=room)
        }

        roster = []
        for m in memberships:
            cells = [round(float(mastery.get((m.student_id, n.id), 0.0)), 4) for n in nodes]
            agg = (
                CognitiveIndex.objects.filter(node__room=room, student=m.student)
                .aggregate(gap=Avg('metacognitive_gap'), conf=Avg('avg_confidence'),
                           mastery=Avg('bkt_mastery'))
            )
            gap = agg['gap'] or 0.0
            if gap > 0.2:
                profile = 'overconfident'
            elif gap < -0.2:
                profile = 'underconfident'
            else:
                profile = 'calibrated'
            # Cuadrante 2x2 (dominio real × confianza); None si el estudiante aún
            # no tiene datos cognitivos.
            if agg['mastery'] is None or agg['conf'] is None:
                quadrant = None
            else:
                quadrant = classify_quadrant(agg['mastery'], agg['conf'])
            roster.append({
                'id': m.student_id,
                'first_name': m.student.first_name,
                'last_name': m.student.last_name,
                'profile': profile,
                'quadrant': quadrant,
                'id_section': m.section_id,
                'cells': cells,
            })

        sections = [{
            'id_section': s.id,
            'code': s.code,
            'name': s.name,
            'students': RoomMembership.objects.filter(section=s).count(),
        } for s in room.sections.all()]

        return Response({
            'name': room.name,
            'students': memberships.count(),
            'nodes': [{'id_node': n.id, 'name': n.name, 'description': ''} for n in nodes],
            'roster': roster,
            'sections': sections,
        })


class StudentDetailView(APIView):
    """Detalle de un estudiante para el docente dueño: resumen + desglose por
    nodo + diagnósticos de Claude, todo acotado a esta sala."""
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id, student_id):
        room = get_object_or_404(Room, id=room_id)
        if room.teacher_id != request.user.id:
            return Response(
                {'detail': 'Only the room owner can view student detail.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = (
            RoomMembership.objects.filter(room=room, student_id=student_id)
            .select_related('student', 'section')
            .first()
        )
        if not membership:
            return Response(
                {'detail': 'Student is not a member of this room.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        student = membership.student

        # Desglose por nodo: BKTState = lo que sabe ahora; último CognitiveIndex
        # = confianza/ICC/perfil de su última respuesta en ese nodo.
        bkt_by_node = {
            b.node_id: b
            for b in BKTState.objects.filter(student=student, node__room=room)
        }
        nodes_data = []
        for node in room.nodes.order_by('id'):
            bkt = bkt_by_node.get(node.id)
            latest = (
                CognitiveIndex.objects.filter(student=student, node=node)
                .order_by('-calculated_at')
                .first()
            )
            if not bkt and not latest:
                continue  # el estudiante no tocó este nodo
            nodes_data.append({
                'node_id': node.id,
                'node_name': node.name,
                'bkt_mastery': round(bkt.p_mastery, 4) if bkt else round(float(latest.bkt_mastery), 4),
                'avg_confidence': round(float(latest.avg_confidence), 4) if latest else None,
                'icc_value': round(float(latest.icc_value), 4) if latest else None,
                'profile': latest.profile if latest else None,
                'attempts': bkt.attempts if bkt else 0,
            })

        # Resumen = promedio de las filas por nodo, así el encabezado queda
        # coherente con la tabla (no mezcla histórico con estado actual).
        def _avg(vals):
            vals = [v for v in vals if v is not None]
            return round(sum(vals) / len(vals), 4) if vals else 0.0

        mastery_avg = _avg([n['bkt_mastery'] for n in nodes_data])
        conf_avg = _avg([n['avg_confidence'] for n in nodes_data])
        icc_avg = _avg([n['icc_value'] for n in nodes_data])
        gap = round(conf_avg - mastery_avg, 4)
        if gap > 0.2:
            profile = 'overconfident'
        elif gap < -0.2:
            profile = 'underconfident'
        else:
            profile = 'calibrated'
        quadrant = classify_quadrant(mastery_avg, conf_avg) if nodes_data else None

        diagnoses = (
            AIDiagnosis.objects.filter(session__room=room, student=student)
            .order_by('-generated_at')
        )

        section = None
        if membership.section_id:
            section = {'code': membership.section.code, 'name': membership.section.name}

        return Response({
            'student': {
                'id': student.id,
                'first_name': student.first_name,
                'last_name': student.last_name,
                'username': student.username,
                'email': student.email,
            },
            'section': section,
            'summary': {
                'profile': profile,
                'quadrant': quadrant,
                'quadrant_label': QUADRANTS[quadrant]['label'] if quadrant else None,
                'avg_confidence': conf_avg,
                'bkt_mastery': mastery_avg,
                'icc_value': icc_avg,
                'metacognitive_gap': gap,
                'answers_count': Answer.objects.filter(
                    session__room=room, session__student=student
                ).count(),
            },
            'nodes': nodes_data,
            'diagnoses': AIDiagnosisSerializer(diagnoses, many=True).data,
        })
