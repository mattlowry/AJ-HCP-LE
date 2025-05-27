"""
Utility functions for job scheduling and route optimization
"""
import math
from typing import List, Tuple, Dict, Optional
from datetime import datetime, timedelta
from django.db.models import Q
from .models import Job, Technician, ServiceType


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the distance between two geographic points using the Haversine formula
    Returns distance in miles
    """
    # Convert latitude and longitude from degrees to radians
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in miles
    r = 3956
    
    return c * r


def estimate_travel_time(distance_miles: float, avg_speed_mph: float = 35) -> timedelta:
    """
    Estimate travel time based on distance and average speed
    Default average speed accounts for city driving conditions
    """
    hours = distance_miles / avg_speed_mph
    return timedelta(hours=hours)


class RouteOptimizer:
    """
    Basic route optimization for technician scheduling
    Uses nearest neighbor algorithm as a starting point
    """
    
    def __init__(self, start_lat: float = 39.9526, start_lng: float = -75.1652):
        """
        Initialize with Philadelphia area as default starting point
        """
        self.start_lat = start_lat
        self.start_lng = start_lng
    
    def optimize_technician_route(self, technician: Technician, date: datetime.date) -> List[Job]:
        """
        Optimize the route for a technician's jobs on a given date
        Returns jobs ordered by optimal travel sequence
        """
        # Get scheduled jobs for the technician on the specified date
        jobs = Job.objects.filter(
            assigned_technician=technician,
            scheduled_date=date,
            status__in=['scheduled', 'in_progress']
        ).select_related('property')
        
        if not jobs.exists():
            return []
        
        # Use technician's current location or default start point
        current_lat = technician.current_location_lat or self.start_lat
        current_lng = technician.current_location_lng or self.start_lng
        
        return self._nearest_neighbor_route(list(jobs), current_lat, current_lng)
    
    def _nearest_neighbor_route(self, jobs: List[Job], start_lat: float, start_lng: float) -> List[Job]:
        """
        Implement nearest neighbor algorithm for route optimization
        """
        if not jobs:
            return []
        
        optimized_route = []
        remaining_jobs = jobs.copy()
        current_lat, current_lng = start_lat, start_lng
        
        while remaining_jobs:
            nearest_job = None
            nearest_distance = float('inf')
            
            for job in remaining_jobs:
                # Get job location from property
                if job.property.latitude and job.property.longitude:
                    distance = calculate_distance(
                        current_lat, current_lng,
                        float(job.property.latitude), float(job.property.longitude)
                    )
                    
                    if distance < nearest_distance:
                        nearest_distance = distance
                        nearest_job = job
            
            if nearest_job:
                optimized_route.append(nearest_job)
                remaining_jobs.remove(nearest_job)
                
                # Update current position
                if nearest_job.property.latitude and nearest_job.property.longitude:
                    current_lat = float(nearest_job.property.latitude)
                    current_lng = float(nearest_job.property.longitude)
            else:
                # If no job has location data, just add remaining jobs in order
                optimized_route.extend(remaining_jobs)
                break
        
        return optimized_route
    
    def calculate_route_metrics(self, jobs: List[Job], start_lat: float, start_lng: float) -> Dict:
        """
        Calculate total distance, estimated travel time, and other route metrics
        """
        if not jobs:
            return {
                'total_distance_miles': 0,
                'total_travel_time': timedelta(0),
                'total_job_time': timedelta(0),
                'route_efficiency_score': 0
            }
        
        total_distance = 0
        current_lat, current_lng = start_lat, start_lng
        total_job_duration = timedelta(0)
        
        for job in jobs:
            if job.property.latitude and job.property.longitude:
                # Add travel distance to this job
                distance = calculate_distance(
                    current_lat, current_lng,
                    float(job.property.latitude), float(job.property.longitude)
                )
                total_distance += distance
                
                # Update current position
                current_lat = float(job.property.latitude)
                current_lng = float(job.property.longitude)
            
            # Add estimated job duration
            if job.service_type and job.service_type.estimated_duration_hours:
                total_job_duration += timedelta(hours=float(job.service_type.estimated_duration_hours))
            elif job.ai_suggested_duration:
                total_job_duration += timedelta(hours=float(job.ai_suggested_duration))
            else:
                # Default 2 hour estimate
                total_job_duration += timedelta(hours=2)
        
        total_travel_time = estimate_travel_time(total_distance)
        
        # Calculate efficiency score (higher is better)
        # Based on ratio of productive time vs travel time
        if total_travel_time.total_seconds() > 0:
            efficiency_score = total_job_duration.total_seconds() / (
                total_job_duration.total_seconds() + total_travel_time.total_seconds()
            ) * 100
        else:
            efficiency_score = 100
        
        return {
            'total_distance_miles': round(total_distance, 2),
            'total_travel_time': total_travel_time,
            'total_job_time': total_job_duration,
            'route_efficiency_score': round(efficiency_score, 1),
            'estimated_completion': datetime.now() + total_job_duration + total_travel_time
        }


class SchedulingAssistant:
    """
    AI-assisted scheduling helper functions
    """
    
    @staticmethod
    def suggest_technician_for_job(job: Job) -> List[Technician]:
        """
        Suggest best technicians for a job based on skills, availability, and location
        """
        # Get technicians with required skill level
        required_skill = job.service_type.skill_level_required if job.service_type else 'apprentice'
        
        skill_hierarchy = {
            'apprentice': ['apprentice', 'journeyman', 'master'],
            'journeyman': ['journeyman', 'master'],
            'master': ['master']
        }
        
        eligible_skills = skill_hierarchy.get(required_skill, ['apprentice', 'journeyman', 'master'])
        
        # Filter available technicians
        candidates = Technician.objects.filter(
            skill_level__in=eligible_skills,
            is_available=True
        ).select_related('user')
        
        # Check if it's an emergency
        if job.priority == 'emergency':
            candidates = candidates.filter(emergency_availability=True)
        
        # Score candidates based on various factors
        scored_candidates = []
        
        for tech in candidates:
            score = 0
            
            # Skill match bonus
            if tech.skill_level == required_skill:
                score += 10
            elif tech.skill_level == 'master':
                score += 5
            
            # Specialty match bonus
            if job.service_type and tech.specialties.filter(id=job.service_type.id).exists():
                score += 15
            
            # Location proximity bonus (if we have location data)
            if (tech.current_location_lat and tech.current_location_lng and 
                job.property.latitude and job.property.longitude):
                distance = calculate_distance(
                    float(tech.current_location_lat), float(tech.current_location_lng),
                    float(job.property.latitude), float(job.property.longitude)
                )
                # Closer is better (max 10 points for being within 5 miles)
                if distance <= 5:
                    score += 10
                elif distance <= 15:
                    score += 5
            
            # Workload consideration (fewer jobs = higher score)
            current_jobs = Job.objects.filter(
                assigned_technician=tech,
                scheduled_date=job.scheduled_date or datetime.now().date(),
                status__in=['scheduled', 'in_progress']
            ).count()
            
            if current_jobs == 0:
                score += 10
            elif current_jobs <= 2:
                score += 5
            
            scored_candidates.append((tech, score))
        
        # Sort by score (highest first) and return technicians
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        return [tech for tech, score in scored_candidates[:5]]  # Return top 5
    
    @staticmethod
    def estimate_job_complexity(job: Job) -> int:
        """
        AI-assisted job complexity estimation (1-10 scale)
        This would be enhanced with actual AI/ML models in production
        """
        complexity = 5  # Base complexity
        
        # Service type complexity
        if job.service_type:
            if 'panel' in job.service_type.name.lower() or 'upgrade' in job.service_type.name.lower():
                complexity += 2
            elif 'emergency' in job.service_type.name.lower():
                complexity += 1
            elif 'outlet' in job.service_type.name.lower():
                complexity -= 1
        
        # Priority influence
        if job.priority == 'emergency':
            complexity += 1
        elif job.priority == 'high':
            complexity += 0.5
        
        # Description analysis (simple keyword matching)
        description_lower = job.description.lower()
        complex_keywords = ['rewire', 'panel', 'upgrade', 'troubleshoot', 'repair']
        simple_keywords = ['outlet', 'switch', 'fixture', 'install']
        
        for keyword in complex_keywords:
            if keyword in description_lower:
                complexity += 0.5
        
        for keyword in simple_keywords:
            if keyword in description_lower:
                complexity -= 0.3
        
        # Ensure complexity stays within 1-10 range
        return max(1, min(10, round(complexity)))
    
    @staticmethod
    def suggest_optimal_time_slot(job: Job, technician: Technician, date: datetime.date) -> Optional[str]:
        """
        Suggest optimal time slot for scheduling a job
        """
        # Get existing jobs for the technician on that date
        existing_jobs = Job.objects.filter(
            assigned_technician=technician,
            scheduled_date=date,
            status__in=['scheduled', 'in_progress']
        ).order_by('scheduled_start_time')
        
        # Define work hours
        work_start = datetime.strptime('08:00', '%H:%M').time()
        work_end = datetime.strptime('17:00', '%H:%M').time()
        
        # Estimate job duration
        if job.service_type and job.service_type.estimated_duration_hours:
            duration_hours = float(job.service_type.estimated_duration_hours)
        else:
            duration_hours = 2.0  # Default estimate
        
        # Find gaps in the schedule
        current_time = work_start
        
        for existing_job in existing_jobs:
            if existing_job.scheduled_start_time:
                gap_duration = (
                    datetime.combine(date, existing_job.scheduled_start_time) - 
                    datetime.combine(date, current_time)
                ).total_seconds() / 3600
                
                if gap_duration >= duration_hours:
                    return current_time.strftime('%H:%M')
                
                # Move current time to after this job
                if existing_job.scheduled_end_time:
                    current_time = existing_job.scheduled_end_time
                else:
                    # Estimate end time
                    est_duration = existing_job.service_type.estimated_duration_hours if existing_job.service_type else 2
                    end_time = (
                        datetime.combine(date, existing_job.scheduled_start_time) + 
                        timedelta(hours=float(est_duration))
                    ).time()
                    current_time = end_time
        
        # Check if there's time at the end of the day
        remaining_hours = (
            datetime.combine(date, work_end) - 
            datetime.combine(date, current_time)
        ).total_seconds() / 3600
        
        if remaining_hours >= duration_hours:
            return current_time.strftime('%H:%M')
        
        return None  # No available slot found