from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tax-rates', views.TaxRateViewSet)
router.register(r'invoices', views.InvoiceViewSet)
router.register(r'invoice-line-items', views.InvoiceLineItemViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'estimates', views.EstimateViewSet)
router.register(r'estimate-line-items', views.EstimateLineItemViewSet)
router.register(r'billing-settings', views.BillingSettingsViewSet)

urlpatterns = [
    path('', include(router.urls)),
]