from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'dashboards', views.DashboardViewSet)
router.register(r'metrics', views.MetricViewSet)
router.register(r'metric-values', views.MetricValueViewSet)
router.register(r'reports', views.ReportViewSet)
router.register(r'data-exports', views.DataExportViewSet)
router.register(r'activity-logs', views.UserActivityLogViewSet)
router.register(r'analytics', views.AnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]