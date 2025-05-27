import axios from 'axios';
import { Customer, CustomerListItem, Property, CustomerContact, CustomerReview } from '../types/customer';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Customer API
export const customerApi = {
  getAll: (params?: any): Promise<{ data: { results: CustomerListItem[] } }> =>
    api.get('/customers/', { params }),
  
  getById: (id: number): Promise<{ data: Customer }> =>
    api.get(`/customers/${id}/`),
  
  create: (customer: Partial<Customer>): Promise<{ data: Customer }> =>
    api.post('/customers/', customer),
  
  update: (id: number, customer: Partial<Customer>): Promise<{ data: Customer }> =>
    api.put(`/customers/${id}/`, customer),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/customers/${id}/`),
  
  getProperties: (id: number): Promise<{ data: Property[] }> =>
    api.get(`/customers/${id}/properties/`),
  
  addProperty: (id: number, property: Partial<Property>): Promise<{ data: Property }> =>
    api.post(`/customers/${id}/add_property/`, property),
  
  getContacts: (id: number): Promise<{ data: CustomerContact[] }> =>
    api.get(`/customers/${id}/contacts/`),
  
  addContact: (id: number, contact: Partial<CustomerContact>): Promise<{ data: CustomerContact }> =>
    api.post(`/customers/${id}/add_contact/`, contact),
  
  getReviews: (id: number): Promise<{ data: CustomerReview[] }> =>
    api.get(`/customers/${id}/reviews/`),
  
  addReview: (id: number, review: Partial<CustomerReview>): Promise<{ data: CustomerReview }> =>
    api.post(`/customers/${id}/add_review/`, review),
};

// Property API
export const propertyApi = {
  getAll: (params?: any): Promise<{ data: { results: Property[] } }> =>
    api.get('/properties/', { params }),
  
  getById: (id: number): Promise<{ data: Property }> =>
    api.get(`/properties/${id}/`),
  
  create: (property: Partial<Property>): Promise<{ data: Property }> =>
    api.post('/properties/', property),
  
  update: (id: number, property: Partial<Property>): Promise<{ data: Property }> =>
    api.put(`/properties/${id}/`, property),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/properties/${id}/`),
};

// Contact API
export const contactApi = {
  getAll: (params?: any): Promise<{ data: { results: CustomerContact[] } }> =>
    api.get('/contacts/', { params }),
  
  getById: (id: number): Promise<{ data: CustomerContact }> =>
    api.get(`/contacts/${id}/`),
  
  update: (id: number, contact: Partial<CustomerContact>): Promise<{ data: CustomerContact }> =>
    api.put(`/contacts/${id}/`, contact),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/contacts/${id}/`),
};

// Review API
export const reviewApi = {
  getAll: (params?: any): Promise<{ data: { results: CustomerReview[] } }> =>
    api.get('/reviews/', { params }),
  
  getById: (id: number): Promise<{ data: CustomerReview }> =>
    api.get(`/reviews/${id}/`),
  
  update: (id: number, review: Partial<CustomerReview>): Promise<{ data: CustomerReview }> =>
    api.put(`/reviews/${id}/`, review),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/reviews/${id}/`),
};

export default api;