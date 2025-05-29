from rest_framework import serializers
from .models import (
    Category, Supplier, Item, StockMovement, PurchaseOrder, 
    PurchaseOrderLineItem, InventoryAdjustment, InventoryAdjustmentLineItem
)
from customers.serializers import CustomerSerializer
from jobs.serializers import JobSerializer, TechnicianSerializer


class CategorySerializer(serializers.ModelSerializer):
    subcategories_count = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    parent_category_name = serializers.CharField(source='parent_category.name', read_only=True)

    class Meta:
        model = Category
        fields = '__all__'

    def get_subcategories_count(self, obj):
        return obj.subcategories.count()

    def get_items_count(self, obj):
        return obj.items.count()


class SupplierSerializer(serializers.ModelSerializer):
    active_items_count = serializers.SerializerMethodField()
    purchase_orders_count = serializers.SerializerMethodField()
    full_address = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = '__all__'

    def get_active_items_count(self, obj):
        return obj.primary_items.filter(is_active=True).count()

    def get_purchase_orders_count(self, obj):
        return obj.purchase_orders.count()

    def get_full_address(self, obj):
        address_parts = [obj.address_line1, obj.address_line2, obj.city, obj.state, obj.zip_code]
        return ", ".join(filter(None, address_parts))


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='primary_supplier.name', read_only=True)
    stock_status = serializers.SerializerMethodField()
    recent_movements = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = '__all__'

    def get_stock_status(self, obj):
        if obj.needs_reorder:
            return 'needs_reorder'
        elif obj.is_low_stock:
            return 'low_stock'
        else:
            return 'normal'

    def get_recent_movements(self, obj):
        recent = obj.stock_movements.all()[:5]
        return StockMovementSerializer(recent, many=True).data


class ItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = '__all__'


class ItemSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for item lists"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_status = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ['id', 'item_code', 'name', 'item_type', 'category_name', 
                 'current_stock', 'unit_of_measure', 'cost_price', 'sell_price', 
                 'stock_status', 'is_active']

    def get_stock_status(self, obj):
        if obj.needs_reorder:
            return 'needs_reorder'
        elif obj.is_low_stock:
            return 'low_stock'
        else:
            return 'normal'


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model = StockMovement
        fields = '__all__'


class StockMovementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = '__all__'


class PurchaseOrderLineItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_unit = serializers.CharField(source='item.unit_of_measure', read_only=True)

    class Meta:
        model = PurchaseOrderLineItem
        fields = '__all__'


class PurchaseOrderLineItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderLineItem
        fields = '__all__'


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    line_items = PurchaseOrderLineItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    items_count = serializers.SerializerMethodField()
    completion_percentage = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = '__all__'

    def get_items_count(self, obj):
        return obj.line_items.count()

    def get_completion_percentage(self, obj):
        line_items = obj.line_items.all()
        if not line_items:
            return 0
        
        total_ordered = sum(item.quantity_ordered for item in line_items)
        total_received = sum(item.quantity_received for item in line_items)
        
        if total_ordered > 0:
            return round((total_received / total_ordered) * 100, 2)
        return 0


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    line_items = PurchaseOrderLineItemCreateSerializer(many=True, required=False)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        purchase_order = PurchaseOrder.objects.create(**validated_data)
        
        for line_item_data in line_items_data:
            PurchaseOrderLineItem.objects.create(
                purchase_order=purchase_order, 
                **line_item_data
            )
        
        return purchase_order


class PurchaseOrderSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for PO lists"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'po_number', 'supplier_name', 'status', 'order_date', 
                 'expected_delivery_date', 'total_amount', 'items_count']

    def get_items_count(self, obj):
        return obj.line_items.count()


class InventoryAdjustmentLineItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_code = serializers.CharField(source='item.item_code', read_only=True)
    item_unit = serializers.CharField(source='item.unit_of_measure', read_only=True)

    class Meta:
        model = InventoryAdjustmentLineItem
        fields = '__all__'


class InventoryAdjustmentSerializer(serializers.ModelSerializer):
    line_items = InventoryAdjustmentLineItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    total_value_impact = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = InventoryAdjustment
        fields = '__all__'

    def get_total_value_impact(self, obj):
        return sum(item.total_value_impact for item in obj.line_items.all())

    def get_items_count(self, obj):
        return obj.line_items.count()


class InventoryAdjustmentCreateSerializer(serializers.ModelSerializer):
    line_items = InventoryAdjustmentLineItemSerializer(many=True, required=False)

    class Meta:
        model = InventoryAdjustment
        fields = '__all__'

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        adjustment = InventoryAdjustment.objects.create(**validated_data)
        
        for line_item_data in line_items_data:
            InventoryAdjustmentLineItem.objects.create(
                adjustment=adjustment, 
                **line_item_data
            )
        
        return adjustment


# Reporting and Analytics Serializers
class LowStockReportSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='primary_supplier.name', read_only=True)
    stock_deficit = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ['id', 'item_code', 'name', 'category_name', 'supplier_name',
                 'current_stock', 'minimum_stock', 'reorder_point', 'stock_deficit', 
                 'unit_of_measure', 'cost_price']

    def get_stock_deficit(self, obj):
        return max(0, obj.minimum_stock - obj.current_stock)


class StockValueReportSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_value = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ['id', 'item_code', 'name', 'category_name', 'current_stock', 
                 'unit_of_measure', 'cost_price', 'stock_value']

    def get_stock_value(self, obj):
        return obj.stock_value


class MovementSummarySerializer(serializers.Serializer):
    """Serializer for movement summary statistics"""
    movement_type = serializers.CharField()
    total_movements = serializers.IntegerField()
    total_quantity = serializers.DecimalField(max_digits=10, decimal_places=3)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)


class InventoryDashboardSerializer(serializers.Serializer):
    """Serializer for inventory dashboard data"""
    total_items = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    total_suppliers = serializers.IntegerField()
    low_stock_items = serializers.IntegerField()
    items_need_reorder = serializers.IntegerField()
    total_stock_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    pending_pos = serializers.IntegerField()
    recent_movements = StockMovementSerializer(many=True)
    top_moved_items = ItemSummarySerializer(many=True)