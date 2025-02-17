from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils.timezone import now
from .models import Paragraph, TypingAttempt
from .forms import ParagraphForm
import time
from django.utils.timezone import now

# 🔹 Admin Adds Paragraph & Start Time

def add_paragraph(request):
    if request.method == "POST":
        form = ParagraphForm(request.POST)
        if form.is_valid():
            paragraph = form.save(commit=False)
            paragraph.start_time = form.cleaned_data['start_time']  # Admin sets start time
            paragraph.save()
            return redirect('typing_test')  
    else:
        form = ParagraphForm()
    return render(request, 'add_paragraph.html', {'form': form})


# 🔹 User Login View
def user_login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        user = authenticate(request, username=username, password="default")  # Dummy password
        
        if user is None:
            from django.contrib.auth.models import User
            user, _ = User.objects.get_or_create(username=username)
            user.set_password("default")  # Set default password (not secure)
            user.save()
            user = authenticate(request, username=username, password="default")

        login(request, user)  
        return redirect('typing_test')  

    return render(request, 'login.html')  


# 🔹 Logout View
def user_logout(request):
    logout(request)
    return redirect('login')  


from django.utils.timezone import now  # ✅ Import now() from Django

from django.utils.timezone import now
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .models import Paragraph, TypingAttempt

@login_required
def typing_test(request):
    """ View to render the typing test page with the latest paragraph. """
    paragraph = Paragraph.objects.order_by('-id').first()

    return render(request, 'typing_test.html', {
        'paragraph': paragraph,
        'start_time': paragraph.start_time.strftime('%Y-%m-%dT%H:%M:%S') if paragraph.start_time else None
    })

from django.utils.timezone import now
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .models import Paragraph, TypingAttempt
import difflib  # ✅ Used for better accuracy calculation

@login_required
def result(request):
    """ View to process the typing test results and calculate WPM & accuracy. """
    if request.method == "POST":
        paragraph_id = request.POST.get("paragraph_id")
        user_input = request.POST.get("user_input", "").strip()  # ✅ Trim input to avoid false inflation
        
        paragraph = get_object_or_404(Paragraph, id=paragraph_id)

        # ✅ Ensure the paragraph has a valid start time
        if not paragraph.start_time:
            return render(request, 'error.html', {'message': "Start time missing!"})

        # ✅ Get time values
        start_time = paragraph.start_time.timestamp()  # Stored start time (server-side)
        end_time = now().timestamp()  # Current server time

        # ✅ Ensure start_time is before end_time
        if end_time < start_time:
            return render(request, 'error.html', {'message': "Invalid start time detected!"})

        # ✅ Calculate time taken in minutes
        time_taken = (end_time - start_time) / 60

        # ✅ Prevent unrealistic time values
        if time_taken <= 0:
            time_taken = 0.1  # Avoid division by zero

        # ✅ Handle empty input to prevent unrealistic WPM
        total_chars = len(user_input)
        if total_chars == 0:
            wpm = 0  # If user input is empty, WPM should be 0
        else:
            wpm = (total_chars / 5) / time_taken  # ✅ Standard WPM formula (5 chars = 1 word)

        # ✅ Use difflib for better accuracy calculation
        similarity = difflib.SequenceMatcher(None, user_input, paragraph.text).ratio()
        accuracy = similarity * 100  # Convert to percentage

        # ✅ Debugging Output
        print(f"[DEBUG] Start Time: {start_time}, End Time: {end_time}, Time Taken: {time_taken:.2f} min")
        print(f"[DEBUG] Total Chars: {total_chars}, WPM: {wpm:.2f}, Accuracy: {accuracy:.2f}%")

        # ✅ Save result to database
        TypingAttempt.objects.create(
            user=request.user,
            paragraph=paragraph,
            user_input=user_input,
            wpm=round(wpm, 2),
            accuracy=round(accuracy, 2)
        )

        return render(request, 'result.html', {
            'wpm': round(wpm, 2),
            'accuracy': round(accuracy, 2)
        })

    return redirect('typing_test')



# 🔹 Admin Panel View (Optional)
@login_required
def admin_panel(request):
    if not request.user.is_staff:
        return redirect('typing_test')  

    paragraphs = Paragraph.objects.all()
    attempts = TypingAttempt.objects.all()

    return render(request, 'admin_panel.html', {'paragraphs': paragraphs, 'attempts': attempts})
