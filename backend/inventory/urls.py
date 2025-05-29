from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CategoryViewSet)
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'items', views.ItemViewSet)
router.register(r'stock-movements', views.StockMovementViewSet)
router.register(r'purchase-orders', views.PurchaseOrderViewSet)
router.register(r'purchase-order-line-items', views.PurchaseOrderLineItemViewSet)
router.register(r'inventory-adjustments', views.InventoryAdjustmentViewSet)
router.register(r'inventory-adjustment-line-items', views.InventoryAdjustmentLineItemViewSet)
router.register(r'reports', views.InventoryReportsViewSet, basename='inventory-reports')

urlpatterns = [
    path('api/', include(router.urls)),
]