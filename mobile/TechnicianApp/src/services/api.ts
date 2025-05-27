import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Job, JobUpdate} from '../types/Job';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api' 
  : 'https://your-production-api.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // Authentication
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login/', { username, password });
    const { token, user } = response.data;
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  },

  // Jobs
  getJobs: async (): Promise<Job[]> => {
    const response = await api.get('/jobs/');
    return response.data;
  },

  getJobById: async (jobId: string): Promise<Job> => {
    const response = await api.get(`/jobs/${jobId}/`);
    return response.data;
  },

  updateJob: async (jobId: string, update: JobUpdate): Promise<Job> => {
    const response = await api.patch(`/jobs/${jobId}/`, update);
    return response.data;
  },

  getTechnicianJobs: async (technicianId: string): Promise<Job[]> => {
    const response = await api.get(`/jobs/technician/${technicianId}/`);
    return response.data;
  },

  // Location tracking
  updateTechnicianLocation: async (latitude: number, longitude: number) => {
    const response = await api.post('/technicians/location/', {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },

  // File uploads
  uploadJobPhoto: async (jobId: string, photoUri: string) => {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'job-photo.jpg',
    } as any);

    const response = await api.post(`/jobs/${jobId}/photos/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;