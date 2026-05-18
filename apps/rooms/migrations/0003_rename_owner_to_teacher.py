from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rooms', '0002_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='room',
            old_name='owner',
            new_name='teacher',
        ),
    ]
