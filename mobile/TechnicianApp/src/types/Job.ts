export interface Job {
  id: string;
  title: string;
  description: string;
  customer: Customer;
  status: JobStatus;
  priority: JobPriority;
  scheduled_date: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  estimated_duration: number;
  assigned_technician: string;
  location: Location;
  requirements: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export type JobStatus = 
  | 'scheduled'
  | 'in_progress' 
  | 'completed'
  | 'cancelled'
  | 'on_hold';

export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface JobUpdate {
  status?: JobStatus;
  notes?: string;
  completion_photos?: string[];
  work_performed?: string;
  parts_used?: PartUsed[];
  time_started?: string;
  time_completed?: string;
}

export interface PartUsed {
  part_id: string;
  part_name: string;
  quantity: number;
  cost: number;
}