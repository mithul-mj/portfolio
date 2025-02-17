from django import forms
from .models import Paragraph

class ParagraphForm(forms.ModelForm):
    start_time = forms.DateTimeField(
        input_formats=['%Y-%m-%d %H:%M:%S'],
        widget=forms.DateTimeInput(attrs={'type': 'datetime-local'})
    )

    class Meta:
        model = Paragraph
        fields = ['text', 'start_time']
