export interface Category {
  id: number;
  name: string;
  description?: string;
  parent?: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
}

export interface Item {
  id: number;
  name: string;
  description?: string;
  sku: string;
  category: number;
  category_name?: string;
  supplier?: number;
  supplier_name?: string;
  unit_price: number;
  cost_price: number;
  current_stock: number;
  minimum_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  unit_of_measure: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  item: number;
  item_name?: string;
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
  quantity: number;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  created_at: string;
  created_by?: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier: number;
  supplier_name?: string;
  order_date: string;
  expected_delivery?: string;
  actual_delivery?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  line_items: PurchaseOrderLineItem[];
}

export interface PurchaseOrderLineItem {
  id: number;
  item: number;
  item_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  line_total: number;
}