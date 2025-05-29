export interface Invoice {
  id: number;
  invoice_number: string;
  customer: number;
  customer_name?: string;
  job?: number;
  job_title?: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  notes?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
  line_items: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Estimate {
  id: number;
  estimate_number: string;
  customer: number;
  customer_name?: string;
  job?: number;
  job_title?: string;
  issue_date: string;
  valid_until: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
  line_items: EstimateLineItem[];
}

export interface EstimateLineItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Payment {
  id: number;
  invoice: number;
  invoice_number?: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  reference_number?: string;
  notes?: string;
  created_at: string;
}