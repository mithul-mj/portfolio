# Generated by Django 5.1.6 on 2025-02-16 11:07

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('typingtest', '0003_paragraph_start_time'),
    ]

    operations = [
        migrations.RenameField(
            model_name='typingattempt',
            old_name='timestamp',
            new_name='created_at',
        ),
        migrations.AlterField(
            model_name='paragraph',
            name='start_time',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
