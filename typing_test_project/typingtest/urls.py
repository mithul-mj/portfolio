from django.urls import path  # Import path function
from . import views  # Import views from current app

# Define URL patterns
urlpatterns = [
    path('add/', views.add_paragraph, name='add_paragraph'),  # URL for adding paragraphs
    path('', views.user_login, name='login'),  
    path('logout/', views.user_logout, name='logout'),  
    path('test/', views.typing_test, name='typing_test'),  
    path('result/', views.result, name='result'),
]
