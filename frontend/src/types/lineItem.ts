export interface LineItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: 'material' | 'labor' | 'service';
  sku?: string;
  unit?: string;
}

export interface JobPricing {
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount?: number;
  total_amount: number;
}

export interface JobEstimate {
  line_items: LineItem[];
  pricing: JobPricing;
  notes?: string;
  valid_until?: string;
}