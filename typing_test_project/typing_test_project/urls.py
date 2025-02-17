from django.contrib import admin
from django.urls import path, include  # Import `include` to link app URLs

urlpatterns = [
    path('admin/', admin.site.urls),  # Admin panel
    path('', include('typingtest.urls')),  # Include URLs from `typingtest` app
]
