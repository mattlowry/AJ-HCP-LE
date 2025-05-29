export interface Appointment {
  id: number;
  title: string;
  description?: string;
  customer: number;
  customer_name?: string;
  property: number;
  property_address?: string;
  job?: number;
  job_title?: string;
  assigned_technicians: number[];
  technician_names?: string[];
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  appointment_type: 'service_call' | 'estimate' | 'follow_up' | 'maintenance' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  travel_time?: number;
  prep_time?: number;
  notes?: string;
  completion_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TechnicianAvailability {
  id: number;
  technician: number;
  technician_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  availability_type: 'available' | 'busy' | 'off' | 'vacation' | 'sick';
  notes?: string;
}

export interface ScheduleConflict {
  id: number;
  appointment1: number;
  appointment2: number;
  conflict_type: 'time_overlap' | 'travel_time' | 'technician_unavailable' | 'equipment_conflict';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  is_resolved: boolean;
  resolution_notes?: string;
  detected_at: string;
}