"""
URL configuration for fsm_core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve
from django.http import HttpResponse
import os

def react_app_view(request):
    """Fallback view for React app"""
    try:
        # Try to serve the React index.html
        return TemplateView.as_view(template_name='index.html')(request)
    except:
        # Fallback HTML if React build not found
        return HttpResponse("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>AJ Long Electric - Field Service Management</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 50px; text-align: center; }
                .container { max-width: 600px; margin: 0 auto; }
                .status { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏗️ AJ Long Electric</h1>
                <h2>Field Service Management System</h2>
                <div class="status">
                    <h3>✅ Backend is Running!</h3>
                    <p>The Django API server is operational.</p>
                    <p>Frontend is currently building...</p>
                </div>
                <h3>Available Services:</h3>
                <ul style="text-align: left;">
                    <li><a href="/admin/">Django Admin Interface</a></li>
                    <li><a href="/api/customers/">Customer API</a></li>
                    <li><a href="/api/properties/">Property API</a></li>
                    <li><a href="/api/contacts/">Contact API</a></li>
                    <li><a href="/api/reviews/">Review API</a></li>
                </ul>
                <p><small>React frontend will be available once the build completes.</small></p>
            </div>
        </body>
        </html>
        """)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('customers.urls')),
    # Future app URLs will be added here
    
    # Serve React app with fallback
    path('', react_app_view),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve React static files in production
if not settings.DEBUG:
    urlpatterns += [
        path('static/<path:path>', serve, {'document_root': settings.STATIC_ROOT}),
    ]
