from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ServiceTypeViewSet, TechnicianViewSet, JobViewSet, 
    EmergencyCallViewSet, JobPhotoViewSet, JobTimeEntryViewSet
)

router = DefaultRouter()
router.register(r'service-types', ServiceTypeViewSet)
router.register(r'technicians', TechnicianViewSet)
router.register(r'jobs', JobViewSet)
router.register(r'emergency-calls', EmergencyCallViewSet)
router.register(r'job-photos', JobPhotoViewSet)
router.register(r'time-entries', JobTimeEntryViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]