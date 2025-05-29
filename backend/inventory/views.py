from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, F
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    Category, Supplier, Item, StockMovement, PurchaseOrder, 
    PurchaseOrderLineItem, InventoryAdjustment, InventoryAdjustmentLineItem
)
from .serializers import (
    CategorySerializer, SupplierSerializer, ItemSerializer, ItemCreateSerializer,
    ItemSummarySerializer, StockMovementSerializer, StockMovementCreateSerializer,
    PurchaseOrderSerializer, PurchaseOrderCreateSerializer, PurchaseOrderSummarySerializer,
    PurchaseOrderLineItemSerializer, PurchaseOrderLineItemCreateSerializer,
    InventoryAdjustmentSerializer, InventoryAdjustmentCreateSerializer,
    InventoryAdjustmentLineItemSerializer, LowStockReportSerializer,
    StockValueReportSerializer, MovementSummarySerializer, InventoryDashboardSerializer
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'parent_category']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get category hierarchy as tree structure"""
        root_categories = self.queryset.filter(parent_category=None)
        serializer = self.get_serializer(root_categories, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Get all items in this category and subcategories"""
        category = self.get_object()
        
        # Get all subcategory IDs recursively
        def get_all_subcategory_ids(cat):
            ids = [cat.id]
            for subcat in cat.subcategories.all():
                ids.extend(get_all_subcategory_ids(subcat))
            return ids
        
        category_ids = get_all_subcategory_ids(category)
        items = Item.objects.filter(category_id__in=category_ids, is_active=True)
        serializer = ItemSummarySerializer(items, many=True)
        return Response(serializer.data)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'country', 'state']
    search_fields = ['name', 'contact_person', 'email', 'city']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Get all items from this supplier"""
        supplier = self.get_object()
        items = supplier.primary_items.filter(is_active=True)
        serializer = ItemSummarySerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def purchase_orders(self, request, pk=None):
        """Get all purchase orders from this supplier"""
        supplier = self.get_object()
        pos = supplier.purchase_orders.all().order_by('-created_at')
        serializer = PurchaseOrderSummarySerializer(pos, many=True)
        return Response(serializer.data)


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['item_type', 'category', 'primary_supplier', 'is_active', 'is_serialized']
    search_fields = ['item_code', 'name', 'description', 'supplier_part_number']
    ordering_fields = ['item_code', 'name', 'current_stock', 'cost_price', 'sell_price', 'created_at']
    ordering = ['item_code']

    def get_serializer_class(self):
        if self.action == 'list':
            return ItemSummarySerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ItemCreateSerializer
        return ItemSerializer

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get items with low stock"""
        items = self.queryset.filter(
            Q(current_stock__lte=F('minimum_stock')) | 
            Q(current_stock__lte=F('reorder_point'))
        ).filter(is_active=True)
        serializer = LowStockReportSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def need_reorder(self, request):
        """Get items that need reordering"""
        items = self.queryset.filter(
            current_stock__lte=F('reorder_point'),
            is_active=True
        )
        serializer = LowStockReportSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stock_value_report(self, request):
        """Get stock value report"""
        items = self.queryset.filter(is_active=True, current_stock__gt=0)
        serializer = StockValueReportSerializer(items, many=True)
        
        total_value = sum(item.stock_value for item in items)
        
        return Response({
            'items': serializer.data,
            'total_stock_value': total_value,
            'item_count': len(items)
        })

    @action(detail=True, methods=['get'])
    def stock_history(self, request, pk=None):
        """Get stock movement history for an item"""
        item = self.get_object()
        movements = item.stock_movements.all().order_by('-movement_date')
        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        """Manually adjust stock level"""
        item = self.get_object()
        new_quantity = request.data.get('new_quantity')
        reason = request.data.get('reason', 'Manual adjustment')
        
        if new_quantity is None:
            return Response(
                {'error': 'new_quantity is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_quantity = Decimal(str(new_quantity))
            old_quantity = item.current_stock
            difference = new_quantity - old_quantity
            
            # Create stock movement record
            StockMovement.objects.create(
                item=item,
                movement_type='adjustment',
                quantity=difference,
                unit_cost=item.cost_price,
                reason=reason,
                recorded_by=request.user if request.user.is_authenticated else None
            )
            
            # Update item stock
            item.current_stock = new_quantity
            item.save()
            
            return Response({
                'message': 'Stock adjusted successfully',
                'old_quantity': old_quantity,
                'new_quantity': new_quantity,
                'difference': difference
            })
            
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid quantity value'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['movement_type', 'item', 'job', 'technician']
    search_fields = ['item__name', 'item__item_code', 'reason', 'notes']
    ordering_fields = ['movement_date', 'created_at']
    ordering = ['-movement_date']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return StockMovementCreateSerializer
        return StockMovementSerializer

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get movement summary by type"""
        movements = self.queryset.values('movement_type').annotate(
            total_movements=Count('id'),
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('unit_cost'))
        )
        
        serializer = MovementSummarySerializer(movements, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent stock movements"""
        days = int(request.query_params.get('days', 7))
        since_date = datetime.now() - timedelta(days=days)
        
        movements = self.queryset.filter(movement_date__gte=since_date)
        serializer = self.get_serializer(movements, many=True)
        return Response(serializer.data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'supplier']
    search_fields = ['po_number', 'supplier__name', 'notes']
    ordering_fields = ['order_date', 'expected_delivery_date', 'total_amount', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return PurchaseOrderSummarySerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        """Mark PO as sent"""
        po = self.get_object()
        po.status = 'sent'
        po.save()
        return Response({'message': 'Purchase order marked as sent'})

    @action(detail=True, methods=['post'])
    def mark_confirmed(self, request, pk=None):
        """Mark PO as confirmed"""
        po = self.get_object()
        po.status = 'confirmed'
        po.save()
        return Response({'message': 'Purchase order confirmed'})

    @action(detail=True, methods=['post'])
    def receive_items(self, request, pk=None):
        """Receive items from purchase order"""
        po = self.get_object()
        line_items_data = request.data.get('line_items', [])
        
        for item_data in line_items_data:
            line_item_id = item_data.get('line_item_id')
            quantity_received = item_data.get('quantity_received', 0)
            
            try:
                line_item = po.line_items.get(id=line_item_id)
                line_item.quantity_received += Decimal(str(quantity_received))
                line_item.save()
                
                # Create stock movement
                StockMovement.objects.create(
                    item=line_item.item,
                    movement_type='purchase',
                    quantity=quantity_received,
                    unit_cost=line_item.unit_cost,
                    purchase_order=po.po_number,
                    recorded_by=request.user if request.user.is_authenticated else None
                )
                
                # Update item stock
                line_item.item.current_stock += Decimal(str(quantity_received))
                line_item.item.save()
                
            except PurchaseOrderLineItem.DoesNotExist:
                continue
        
        # Update PO status
        if all(item.is_fully_received for item in po.line_items.all()):
            po.status = 'received'
        else:
            po.status = 'partial'
        po.save()
        
        return Response({'message': 'Items received successfully'})

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending purchase orders"""
        pending_pos = self.queryset.filter(status__in=['draft', 'sent', 'confirmed', 'partial'])
        serializer = PurchaseOrderSummarySerializer(pending_pos, many=True)
        return Response(serializer.data)


class PurchaseOrderLineItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderLineItem.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['purchase_order', 'item']
    ordering_fields = ['line_number', 'created_at']
    ordering = ['line_number']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PurchaseOrderLineItemCreateSerializer
        return PurchaseOrderLineItemSerializer


class InventoryAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = InventoryAdjustment.objects.all()
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['adjustment_type', 'approved']
    search_fields = ['description', 'notes']
    ordering_fields = ['adjustment_date', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return InventoryAdjustmentCreateSerializer
        return InventoryAdjustmentSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve inventory adjustment"""
        adjustment = self.get_object()
        
        if adjustment.approved:
            return Response(
                {'error': 'Adjustment already approved'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Apply adjustments to item stocks
        for line_item in adjustment.line_items.all():
            # Create stock movement
            StockMovement.objects.create(
                item=line_item.item,
                movement_type='adjustment',
                quantity=line_item.quantity_difference,
                unit_cost=line_item.unit_cost,
                reason=f"Adjustment: {adjustment.description}",
                recorded_by=request.user if request.user.is_authenticated else None
            )
            
            # Update item stock
            line_item.item.current_stock = line_item.quantity_after
            line_item.item.save()
        
        # Mark as approved
        adjustment.approved = True
        adjustment.approved_by = request.user if request.user.is_authenticated else None
        adjustment.approved_date = datetime.now()
        adjustment.save()
        
        return Response({'message': 'Adjustment approved and applied'})

    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        """Get adjustments pending approval"""
        pending = self.queryset.filter(approved=False)
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)


class InventoryAdjustmentLineItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryAdjustmentLineItem.objects.all()
    serializer_class = InventoryAdjustmentLineItemSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['adjustment', 'item']
    ordering_fields = ['line_number', 'created_at']
    ordering = ['line_number']


class InventoryReportsViewSet(viewsets.ViewSet):
    """ViewSet for inventory reports and analytics"""
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get inventory dashboard data"""
        # Basic counts
        total_items = Item.objects.filter(is_active=True).count()
        total_categories = Category.objects.filter(is_active=True).count()
        total_suppliers = Supplier.objects.filter(is_active=True).count()
        
        # Stock alerts
        low_stock_items = Item.objects.filter(
            current_stock__lte=F('minimum_stock'),
            is_active=True
        ).count()
        
        items_need_reorder = Item.objects.filter(
            current_stock__lte=F('reorder_point'),
            is_active=True
        ).count()
        
        # Stock value
        total_stock_value = sum(
            item.stock_value for item in Item.objects.filter(is_active=True)
        )
        
        # Pending POs
        pending_pos = PurchaseOrder.objects.filter(
            status__in=['draft', 'sent', 'confirmed', 'partial']
        ).count()
        
        # Recent movements
        recent_movements = StockMovement.objects.all().order_by('-movement_date')[:10]
        
        # Top moved items (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        top_moved_items = Item.objects.filter(
            stock_movements__movement_date__gte=thirty_days_ago
        ).annotate(
            total_movements=Count('stock_movements')
        ).order_by('-total_movements')[:10]
        
        dashboard_data = {
            'total_items': total_items,
            'total_categories': total_categories,
            'total_suppliers': total_suppliers,
            'low_stock_items': low_stock_items,
            'items_need_reorder': items_need_reorder,
            'total_stock_value': total_stock_value,
            'pending_pos': pending_pos,
            'recent_movements': StockMovementSerializer(recent_movements, many=True).data,
            'top_moved_items': ItemSummarySerializer(top_moved_items, many=True).data
        }
        
        serializer = InventoryDashboardSerializer(dashboard_data)
        return Response(serializer.data)
