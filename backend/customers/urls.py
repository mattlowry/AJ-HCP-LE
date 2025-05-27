from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'customers', views.CustomerViewSet)
router.register(r'properties', views.PropertyViewSet)
router.register(r'contacts', views.CustomerContactViewSet)
router.register(r'reviews', views.CustomerReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
]