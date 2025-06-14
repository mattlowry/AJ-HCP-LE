export interface Job {
  id: number;
  job_number: string;
  title: string;
  description: string;
  customer: number;
  customer_name?: string;
  property: number;
  property_address?: string;
  assigned_to: number[];
  assigned_technicians?: string[];
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  service_type: string;
  estimated_duration: number;
  actual_duration?: number;
  estimated_cost: number;
  actual_cost?: number;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  notes?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface JobListItem {
  id: number;
  job_number: string;
  title: string;
  customer_name: string;
  property_address: string;  
  status: string;
  priority: string;
  scheduled_start?: string;
  estimated_cost: number;
  // Add commonly used properties from Job interface
  service_type?: string;
  description?: string;
  estimated_duration?: number;
  assigned_technicians?: string[];
  actual_cost?: number;
  notes?: string;
  updated_at?: string;
  created_at?: string;
}