from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CalendarViewSet, TechnicianAvailabilityViewSet, AppointmentViewSet,
    ScheduleTemplateViewSet, ScheduleConflictViewSet, ScheduleOptimizationViewSet
)

router = DefaultRouter()
router.register(r'calendars', CalendarViewSet)
router.register(r'availability', TechnicianAvailabilityViewSet)
router.register(r'appointments', AppointmentViewSet)
router.register(r'templates', ScheduleTemplateViewSet)
router.register(r'conflicts', ScheduleConflictViewSet)
router.register(r'optimizations', ScheduleOptimizationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]