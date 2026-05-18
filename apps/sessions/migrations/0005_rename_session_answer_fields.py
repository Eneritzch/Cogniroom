from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('evaluation_sessions', '0004_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='evaluationsession',
            old_name='completed_at',
            new_name='finished_at',
        ),
        migrations.RenameField(
            model_name='answer',
            old_name='declared_confidence',
            new_name='confidence_declared',
        ),
        migrations.RenameField(
            model_name='answer',
            old_name='response_time_seconds',
            new_name='response_time_sec',
        ),
        migrations.RenameField(
            model_name='answer',
            old_name='created_at',
            new_name='answered_at',
        ),
    ]
