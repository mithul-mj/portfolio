from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import now

class Paragraph(models.Model):
    text = models.TextField()
    start_time = models.DateTimeField(default=now)  # Admin sets race start time

class TypingAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    paragraph = models.ForeignKey(Paragraph, on_delete=models.CASCADE)
    user_input = models.TextField()
    wpm = models.FloatField()
    accuracy = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
