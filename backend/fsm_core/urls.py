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
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve
from django.http import HttpResponse, JsonResponse
import os

def api_health_check(request):
    """Simple API health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'message': 'AJ Long Electric Backend API is running',
        'endpoints': [
            '/api/customers/',
            '/api/jobs/technicians/',
            '/api/jobs/',
            '/api/scheduling/',
            '/api/billing/',
            '/api/inventory/',
            '/api/analytics/',
        ]
    })

def react_app_view(request):
    """Fallback view for React app"""
    import os
    from django.template.loader import get_template
    
    try:
        # Check if React build exists
        react_index_path = os.path.join(settings.BASE_DIR.parent, 'frontend', 'build', 'index.html')
        if os.path.exists(react_index_path):
            # Serve React app
            template = get_template('index.html')
            return HttpResponse(template.render({}, request))
    except Exception as e:
        print(f"React template error: {e}")
    
    # Fallback HTML if React build not found
    return HttpResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>AJ Long Electric - Field Service Management</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 50px; text-align: center; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
            .warning { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
            .api-list { text-align: left; background: #f8f9fa; padding: 15px; border-radius: 5px; }
            .api-list a { color: #007bff; text-decoration: none; font-weight: bold; }
            .api-list a:hover { text-decoration: underline; }
            .credentials { background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #17a2b8; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚡ AJ Long Electric</h1>
            <h2>Field Service Management System</h2>
            
            <div class="status">
                <h3>✅ Backend Server Online</h3>
                <p>Django API server is running successfully!</p>
            </div>
            
            <div class="warning">
                <h3>🔧 Frontend Building</h3>
                <p>React frontend is currently building. This page will automatically show the full application once ready.</p>
            </div>
            
            <div class="credentials">
                <h3>🔑 Admin Access</h3>
                <p><strong>Username:</strong> admin</p>
                <p><strong>Password:</strong> admin123</p>
            </div>
            
            <h3>Available Services:</h3>
            <div class="api-list">
                <ul>
                    <li><a href="/admin/">🛡️ Django Admin Interface</a></li>
                    <li><a href="/api/health/">🔍 API Health Check</a></li>
                    <li><a href="/api/customers/">👥 Customer API</a></li>
                    <li><a href="/api/customers/properties/">🏠 Property API</a></li>
                    <li><a href="/api/customers/contacts/">📞 Contact API</a></li>
                    <li><a href="/api/customers/reviews/">⭐ Review API</a></li>
                    <li><a href="/api/jobs/">📋 Job Management API</a></li>
                    <li><a href="/api/jobs/technicians/">🔧 Technician API</a></li>
                    <li><a href="/api/jobs/emergency-calls/">🚨 Emergency Call API</a></li>
                    <li><a href="/api/scheduling/">📅 Scheduling API</a></li>
                    <li><a href="/api/billing/">💰 Billing API</a></li>
                    <li><a href="/api/inventory/">📦 Inventory API</a></li>
                    <li><a href="/api/analytics/">📊 Analytics API</a></li>
                </ul>
            </div>
            
            <p><small>This system manages customer data, properties, scheduling, and billing for electrical services.</small></p>
        </div>
    </body>
    </html>
    """)

urlpatterns = [
    path('admin/', admin.site.urls),
    # API health check endpoint - moved to specific path to avoid conflict
    path('api/health/', api_health_check, name='api_health_check'),
    # API endpoints under /api/ prefix for consistency
    path('api/', include('customers.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/scheduling/', include('scheduling.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/analytics/', include('analytics.urls')),
    # Future app URLs will be added here
]

# Serve React app with fallback
react_build_path = os.path.join(settings.BASE_DIR.parent, 'frontend', 'build')
react_index_exists = os.path.exists(os.path.join(react_build_path, 'index.html'))

if react_index_exists:
    try:
        # Try to serve React app if build exists
        urlpatterns += [
            re_path(r'^static/(?P<path>.*)$', serve, {'document_root': os.path.join(react_build_path, 'static')}),
            re_path(r'^(?!admin|api|jobs).*$', TemplateView.as_view(template_name='index.html')),
        ]
    except Exception:
        # Fallback if template loading fails
        urlpatterns += [path('', react_app_view)]
else:
    # Fallback if React build not found
    urlpatterns += [path('', react_app_view)]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
