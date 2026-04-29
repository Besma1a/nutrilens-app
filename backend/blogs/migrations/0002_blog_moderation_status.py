from django.db import migrations, models


def backfill_blog_status(apps, schema_editor):
    Blog = apps.get_model("blogs", "Blog")
    Blog.objects.filter(is_published=True).update(moderation_status="Approved")
    Blog.objects.filter(is_published=False).update(moderation_status="Pending")


class Migration(migrations.Migration):
    dependencies = [
        ("blogs", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="blog",
            name="moderation_status",
            field=models.CharField(
                choices=[("Pending", "Pending"), ("Approved", "Approved"), ("Rejected", "Rejected")],
                default="Pending",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="blog",
            name="is_published",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(backfill_blog_status, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name="blog",
            index=models.Index(
                fields=["moderation_status", "-created_at"],
                name="blogs_blog_moderat_2950cf_idx",
            ),
        ),
    ]
