export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  customer_type: 'residential' | 'commercial';
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  company_name?: string;
  preferred_contact_method: 'email' | 'phone' | 'text';
  notes?: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  full_address: string;
  properties?: Property[];
  contacts?: CustomerContact[];
  reviews?: CustomerReview[];
}

export interface Property {
  id: number;
  customer: number;
  property_type: 'single_family' | 'townhouse' | 'condo' | 'apartment' | 'commercial' | 'industrial';
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  square_footage?: number;
  year_built?: number;
  bedrooms?: number;
  bathrooms?: number;
  main_panel_brand?: string;
  main_panel_amperage?: number;
  main_panel_age?: number;
  has_gfci_outlets: boolean;
  has_afci_breakers: boolean;
  electrical_last_updated?: string;
  gate_code?: string;
  access_instructions?: string;
  key_location?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  full_address: string;
}

export interface CustomerContact {
  id: number;
  customer: number;
  contact_type: 'primary' | 'secondary' | 'emergency' | 'billing';
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  relationship?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerReview {
  id: number;
  customer: number;
  rating: 1 | 2 | 3 | 4 | 5;
  review_text: string;
  source: string;
  sentiment_score?: number;
  sentiment_label?: 'positive' | 'neutral' | 'negative';
  created_at: string;
  updated_at: string;
}

export interface CustomerListItem {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  customer_type: 'residential' | 'commercial';
  full_address: string;
  property_count: number;
  last_job_date?: string;
  created_at: string;
}