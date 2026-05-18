from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0004_pdfdocument_extracted_text_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='question',
            old_name='text',
            new_name='statement',
        ),
    ]
