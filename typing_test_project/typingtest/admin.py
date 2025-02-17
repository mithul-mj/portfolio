from django.contrib import admin
from .models import Paragraph, TypingAttempt  # Import your models

# Register models to show them in the Django admin panel
@admin.register(Paragraph)
class ParagraphAdmin(admin.ModelAdmin):
    list_display = ('text', 'start_time')  # Display fields in the admin list view
    search_fields = ('text',)  # Enable search by text

@admin.register(TypingAttempt)
class TypingAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'paragraph', 'wpm', 'accuracy', 'created_at')  # Show fields
    search_fields = ('user__username',)  # Search by username
    list_filter = ('created_at',)  # Add filter by date