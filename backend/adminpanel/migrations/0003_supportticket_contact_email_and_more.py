from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("adminpanel", "0002_nutritionistadminprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="supportticket",
            name="contact_email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AddField(
            model_name="supportticket",
            name="contact_name",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="supportticket",
            name="message",
            field=models.TextField(blank=True, default=""),
        ),
    ]
