from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('cognitive', '0003_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='cognitiveindex',
            old_name='declared_confidence',
            new_name='avg_confidence',
        ),
        migrations.RenameField(
            model_name='cognitiveindex',
            old_name='icc',
            new_name='icc_value',
        ),
        migrations.RenameField(
            model_name='cognitiveindex',
            old_name='gap',
            new_name='metacognitive_gap',
        ),
        migrations.RenameField(
            model_name='cognitiveindex',
            old_name='created_at',
            new_name='calculated_at',
        ),
        migrations.RenameField(
            model_name='blindspotindex',
            old_name='ipc',
            new_name='ipc_value',
        ),
        migrations.RenameField(
            model_name='blindspotindex',
            old_name='students_count',
            new_name='total_student',
        ),
        migrations.RenameField(
            model_name='aidiagnosis',
            old_name='profile',
            new_name='classification',
        ),
        migrations.RenameField(
            model_name='aidiagnosis',
            old_name='prediction',
            new_name='failure_probability',
        ),
        migrations.RenameField(
            model_name='aidiagnosis',
            old_name='risk_nodes',
            new_name='risk_node',
        ),
        migrations.RenameField(
            model_name='aidiagnosis',
            old_name='created_at',
            new_name='generated_at',
        ),
    ]
