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
from services.thresholds import BLIND_SPOT_TH

from .metrics import (
    category_breakdown,
    quadrant_counts,
    room_avg_icc,
    room_blind_spots,
    student_cognitive_rows,
    weak_category,
)
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
    """Lee ?section_id= y valida que sea de la sala. Devuelve
    (section_id|None, error|None); sin parámetro o 'all' → sala completa."""
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
            'categories': category_breakdown(Answer.objects.filter(session__student=user)),
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
        bkt_states = BKTState.objects.filter(student=user).select_related('node__room')

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

            room = state.node.room
            result.append({
                'node_id': state.node_id,
                'node_name': state.node.name,
                'name': state.node.name,
                'description': '',
                'room_id': room.id,
                'room_name': room.name,
                'p_mastery': round(state.p_mastery, 4),
                'avg_confidence': round(latest.avg_confidence, 4) if latest else None,
                'icc_value': round(latest.icc_value, 4) if latest else None,
                'profile': latest.profile if latest else None,
                'attempts': state.attempts,
                'trend': trend,
            })

        return Response(result)


# Mismos títulos que muestran el panel y el historial (static/js/app/…): un solo
# fraseo para el mismo perfil en las tres pantallas, en lenguaje llano.
DIAGNOSIS_TITLES = {
    'overconfident': 'Confía de más: cree saber más de lo que realmente sabe',
    'underconfident': 'Confía de menos: sabe más de lo que cree',
    'calibrated': 'Confianza justa: lo que cree y lo que sabe coinciden',
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
                # Vista del propio estudiante: solo la versión escrita para él.
                'reasoning': diag.student_reasoning,
                'recommendation': diag.student_recommendation,
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
            'room': {'id': node.room_id, 'name': node.room.name},
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
            'categories': category_breakdown(
                Answer.objects.filter(session__student=user, question__node_id=node_id)
            ),
            'recent_answers': recent,
        })


class RoomOverviewView(APIView):
    """Panel de sala para el docente: cuadrantes, categorías del grupo, a quién
    atender primero, puntos ciegos y dispersión dominio×confianza."""
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

        rows = student_cognitive_rows(room, section_id)
        counts = quadrant_counts(rows)

        answers = Answer.objects.filter(session__room=room)
        if section_id is not None:
            answers = answers.filter(
                session__student__room_memberships__room=room,
                session__student__room_memberships__section_id=section_id,
            )
        categories = category_breakdown(answers)

        # Atender primero: descalibrados (críticos primero, luego por brecha).
        attend = [r for r in rows if r['quadrant'] in ('overconfident', 'underconfident')]
        attend.sort(key=lambda r: (r['quadrant'] != 'overconfident', -abs(r['gap'])))
        attend_first = []
        for r in attend[:8]:
            s = r['student']
            diag = (
                AIDiagnosis.objects.filter(session__room=room, student=s)
                .order_by('-generated_at').first()
            )
            attend_first.append({
                'id': s.id,
                'first_name': s.first_name,
                'last_name': s.last_name,
                'quadrant': r['quadrant'],
                'quadrant_label': QUADRANTS[r['quadrant']]['label'],
                'critical': is_critical(r['quadrant']),
                'metacognitive_gap': r['gap'],
                'bkt_mastery': r['mastery'],
                'avg_confidence': r['confidence'],
                'weak_category': weak_category(
                    Answer.objects.filter(session__room=room, session__student=s)
                ),
                'diagnosis': (diag.recommendation or diag.reasoning) if diag else None,
            })

        scatter = [{
            'id': r['student'].id,
            'first_name': r['student'].first_name,
            'last_name': r['student'].last_name,
            'mastery': r['mastery'],
            'confidence': r['confidence'],
            'quadrant': r['quadrant'],
        } for r in rows]

        total_students = (
            RoomMembership.objects.filter(room=room).count()
            if section_id is None
            else RoomMembership.objects.filter(room=room, section_id=section_id).count()
        )

        return Response({
            'room': {'id': room.id, 'name': room.name, 'mode': room.mode},
            'students': total_students,
            'evaluated': len(rows),
            'avg_icc': room_avg_icc(room),
            'quadrants': counts,
            'categories': categories,
            'attend_first': attend_first,
            'blind_spots': room_blind_spots(room, section_id),
            'scatter': scatter,
        })


class RoomsMetricsSummaryView(APIView):
    """Vista "todas mis salas": una fila por sala del docente con su estado de
    grupo (calibración, distribución de cuadrantes, en riesgo, categoría floja)
    + totales agregados, para comparar salas de un vistazo."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'teacher':
            return Response({'rooms': [], 'totals': {}})

        rooms = Room.objects.filter(teacher=request.user).order_by('-created_at')
        result = []
        agg_students = agg_at_risk = agg_critical = 0
        icc_sum = 0.0
        icc_n = 0
        for room in rooms:
            rows = student_cognitive_rows(room)
            counts = quadrant_counts(rows)
            at_risk = counts['overconfident'] + counts['underconfident']
            students = RoomMembership.objects.filter(room=room).count()
            avg_icc = room_avg_icc(room)
            sessions = EvaluationSession.objects.filter(
                room=room, status=EvaluationSession.STATUS_COMPLETED
            ).count()
            result.append({
                'id': room.id,
                'name': room.name,
                'mode': room.mode,
                'students': students,
                'evaluated': len(rows),
                'sessions': sessions,
                'avg_icc': avg_icc,
                'quadrants': counts,
                'at_risk_count': at_risk,
                'critical_count': counts['overconfident'],
                'weak_category': weak_category(Answer.objects.filter(session__room=room)),
            })
            agg_students += students
            agg_at_risk += at_risk
            agg_critical += counts['overconfident']
            if rows:
                icc_sum += avg_icc
                icc_n += 1

        return Response({
            'rooms': result,
            'totals': {
                'rooms': len(result),
                'students': agg_students,
                'at_risk': agg_at_risk,
                'critical': agg_critical,
                'avg_icc': round(icc_sum / icc_n, 4) if icc_n else 0.0,
            },
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
                'alert': ipc < BLIND_SPOT_TH,
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

        # En riesgo = descalibración: se cruza dominio real (BKT) con confianza en
        # 4 cuadrantes; el crítico es "no sabe y está confiado". No depende de Claude.
        result = []
        memberships = RoomMembership.objects.filter(room=room).select_related('student')
        if section_id is not None:
            memberships = memberships.filter(section_id=section_id)
            
        all_cis = CognitiveIndex.objects.filter(
            node__room=room
        ).order_by('-calculated_at')
        
        cis_by_student = {}
        for ci in all_cis:
            if ci.student_id not in cis_by_student:
                cis_by_student[ci.student_id] = {}
            if ci.node_id not in cis_by_student[ci.student_id]:
                cis_by_student[ci.student_id][ci.node_id] = ci

        for m in memberships:
            student_cis = cis_by_student.get(m.student_id, {})
            if not student_cis:
                continue
                
            def _avg(attr):
                vals = [getattr(ci, attr) for ci in student_cis.values() if getattr(ci, attr) is not None]
                return sum(vals) / len(vals) if vals else None

            mastery = _avg('bkt_mastery')
            conf = _avg('avg_confidence')
            gap = _avg('metacognitive_gap')
            
            if mastery is None or conf is None:
                continue
            quadrant = classify_quadrant(mastery, conf)
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
                'metacognitive_gap': round(float(gap or 0.0), 4),
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
        
        all_cis = CognitiveIndex.objects.filter(
            node__room=room
        ).order_by('-calculated_at')
        
        cis_by_student = {}
        for ci in all_cis:
            if ci.student_id not in cis_by_student:
                cis_by_student[ci.student_id] = {}
            if ci.node_id not in cis_by_student[ci.student_id]:
                cis_by_student[ci.student_id][ci.node_id] = ci

        roster = []
        for m in memberships:
            cells = [round(float(mastery.get((m.student_id, n.id), 0.0)), 4) for n in nodes]
            student_cis = cis_by_student.get(m.student_id, {})
            
            def _avg(attr):
                vals = [getattr(ci, attr) for ci in student_cis.values() if getattr(ci, attr) is not None]
                return sum(vals) / len(vals) if vals else None

            mast = _avg('bkt_mastery')
            conf = _avg('avg_confidence')
            gap = _avg('metacognitive_gap')
            
            gap_val = gap or 0.0
            if gap_val > 0.2:
                profile = 'overconfident'
            elif gap_val < -0.2:
                profile = 'underconfident'
            else:
                profile = 'calibrated'
            
            # Cuadrante 2x2 (dominio real × confianza); None si el estudiante aún
            # no tiene datos cognitivos.
            if mast is None or conf is None:
                quadrant = None
            else:
                quadrant = classify_quadrant(mast, conf)
                
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
            'categories': category_breakdown(
                Answer.objects.filter(session__room=room, session__student=student)
            ),
            'diagnoses': AIDiagnosisSerializer(diagnoses, many=True).data,
        })
