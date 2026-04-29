from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0012_dietplantemplate_and_seed"),
    ]

    operations = [
        migrations.AddField(
            model_name="dietplantemplate",
            name="image_url",
            field=models.URLField(
                blank=True,
                default="",
                help_text="Optional cover image URL shown on the diet plan card",
            ),
        ),
    ]
