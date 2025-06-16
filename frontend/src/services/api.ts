import axios, { AxiosError, AxiosResponse } from 'axios';
import { errorLogger } from '../utils/errorHandling';
// Removed unused imports: withErrorHandling, ErrorType
import { Customer, CustomerListItem, Property, CustomerContact, CustomerReview } from '../types/customer';
import { Job, JobListItem } from '../types/job';
import { Invoice, Estimate, Payment } from '../types/billing';
import { Item, Category, Supplier, StockMovement, PurchaseOrder } from '../types/inventory';
import { Appointment, TechnicianAvailability, ScheduleConflict } from '../types/scheduling';

// Smart API URL detection based on environment
const getApiBaseUrl = (): string => {
  // If explicit URL is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Auto-detect based on current host
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production on Render
    if (hostname === 'aj-long-electric.onrender.com') {
      return 'https://aj-long-electric-backend.onrender.com/api';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
  }
  
  // Fallback to local development
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Log API configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('🌐 API Configuration:', {
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    API_BASE_URL,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL
  });
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for adding auth tokens and logging
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log API requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data
      });
    }

    return config;
  },
  (error) => {
    errorLogger.handleError(error, {
      component: 'APIService',
      action: 'Request Interceptor',
      userMessage: 'Failed to prepare API request'
    });
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle different types of errors
    errorLogger.handleError(error, {
      component: 'APIService',
      action: `${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      userMessage: getErrorMessage(error)
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('authToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/#/login';
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to get user-friendly error messages
const getErrorMessage = (error: AxiosError): string => {
  if (!error.response) {
    // Check for CORS errors
    if (error.message?.includes('CORS') || error.message?.includes('Access-Control-Allow-Origin')) {
      return `CORS error: The backend server at ${API_BASE_URL} is not allowing requests from this domain. Please check your backend CORS configuration.`;
    }
    
    // Check if it's a network error to localhost (backend server not running)
    if (error.code === 'ECONNREFUSED' || error.message?.includes('localhost') || error.message?.includes('Network Error')) {
      return `Backend server is not responding at ${API_BASE_URL}. Please verify the server is running and accessible.`;
    }
    
    return `Network connection error. Cannot reach backend server at ${API_BASE_URL}. Please check your server configuration.`;
  }

  const status = error.response.status;
  const data = error.response.data as any;

  switch (status) {
    case 400:
      return data?.message || 'Invalid request. Please check your input.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 422:
      return data?.message || 'Please check your input and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error occurred. Our team has been notified.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return data?.message || 'An unexpected error occurred. Please try again.';
  }
};

// Commented out unused API wrapper for build optimization
// const createApiMethod = <T>(apiCall: () => Promise<AxiosResponse<T>>, context: string) => {
//   return withErrorHandling(apiCall, {
//     component: 'APIService',
//     action: context
//   });
// };

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

// Job API
export const jobApi = {
  getAll: (params?: any): Promise<{ data: { results: JobListItem[] } }> =>
    api.get('/jobs/', { params }),
  
  getById: (id: number): Promise<{ data: Job }> =>
    api.get(`/jobs/${id}/`),
  
  create: (job: Partial<Job>): Promise<{ data: Job }> =>
    api.post('/jobs/', job),
  
  update: (id: number, job: Partial<Job>): Promise<{ data: Job }> =>
    api.put(`/jobs/${id}/`, job),
  
  delete: (id: number): Promise<void> =>
    api.delete(`/jobs/${id}/`),
  
  updateStatus: (id: number, status: string): Promise<{ data: Job }> =>
    api.patch(`/jobs/${id}/update_status/`, { status }),
  
  assignTechnicians: (id: number, technician_ids: number[]): Promise<{ data: Job }> =>
    api.patch(`/jobs/${id}/assign_technicians/`, { technician_ids }),
};

// Technician API
export const technicianApi = {
  getAll: (params?: any): Promise<{ data: any[] }> =>
    api.get('/jobs/technicians/', { params }),
  
  getAvailable: (params?: any): Promise<{ data: any[] }> =>
    api.get('/jobs/technicians/available/', { params }),
  
  getById: (id: number): Promise<{ data: any }> =>
    api.get(`/jobs/technicians/${id}/`),
};

// Billing API
export const billingApi = {
  // Invoice endpoints
  getInvoices: (params?: any): Promise<{ data: { results: Invoice[] } }> =>
    api.get('/billing/invoices/', { params }),
  
  getInvoiceById: (id: number): Promise<{ data: Invoice }> =>
    api.get(`/billing/invoices/${id}/`),
  
  createInvoice: (invoice: Partial<Invoice>): Promise<{ data: Invoice }> =>
    api.post('/billing/invoices/', invoice),
  
  updateInvoice: (id: number, invoice: Partial<Invoice>): Promise<{ data: Invoice }> =>
    api.put(`/billing/invoices/${id}/`, invoice),
  
  deleteInvoice: (id: number): Promise<void> =>
    api.delete(`/billing/invoices/${id}/`),
  
  sendInvoice: (id: number): Promise<{ data: Invoice }> =>
    api.post(`/billing/invoices/${id}/send/`),
  
  // Estimate endpoints
  getEstimates: (params?: any): Promise<{ data: { results: Estimate[] } }> =>
    api.get('/billing/estimates/', { params }),
  
  getEstimateById: (id: number): Promise<{ data: Estimate }> =>
    api.get(`/billing/estimates/${id}/`),
  
  createEstimate: (estimate: Partial<Estimate>): Promise<{ data: Estimate }> =>
    api.post('/billing/estimates/', estimate),
  
  updateEstimate: (id: number, estimate: Partial<Estimate>): Promise<{ data: Estimate }> =>
    api.put(`/billing/estimates/${id}/`, estimate),
  
  deleteEstimate: (id: number): Promise<void> =>
    api.delete(`/billing/estimates/${id}/`),
  
  convertToInvoice: (id: number): Promise<{ data: Invoice }> =>
    api.post(`/billing/estimates/${id}/convert_to_invoice/`),
  
  // Payment endpoints
  getPayments: (params?: any): Promise<{ data: { results: Payment[] } }> =>
    api.get('/billing/payments/', { params }),
  
  createPayment: (payment: Partial<Payment>): Promise<{ data: Payment }> =>
    api.post('/billing/payments/', payment),
};

// Inventory API
export const inventoryApi = {
  // Item endpoints
  getItems: (params?: any): Promise<{ data: { results: Item[] } }> =>
    api.get('/inventory/items/', { params }),
  
  getItemById: (id: number): Promise<{ data: Item }> =>
    api.get(`/inventory/items/${id}/`),
  
  createItem: (item: Partial<Item>): Promise<{ data: Item }> =>
    api.post('/inventory/items/', item),
  
  updateItem: (id: number, item: Partial<Item>): Promise<{ data: Item }> =>
    api.put(`/inventory/items/${id}/`, item),
  
  deleteItem: (id: number): Promise<void> =>
    api.delete(`/inventory/items/${id}/`),
  
  adjustStock: (id: number, quantity: number, reason: string): Promise<{ data: Item }> =>
    api.post(`/inventory/items/${id}/adjust_stock/`, { quantity, reason }),
  
  // Category endpoints
  getCategories: (): Promise<{ data: Category[] }> =>
    api.get('/inventory/categories/'),
  
  createCategory: (category: Partial<Category>): Promise<{ data: Category }> =>
    api.post('/inventory/categories/', category),
  
  // Supplier endpoints
  getSuppliers: (): Promise<{ data: Supplier[] }> =>
    api.get('/inventory/suppliers/'),
  
  createSupplier: (supplier: Partial<Supplier>): Promise<{ data: Supplier }> =>
    api.post('/inventory/suppliers/', supplier),
  
  // Stock movement endpoints
  getStockMovements: (params?: any): Promise<{ data: { results: StockMovement[] } }> =>
    api.get('/inventory/stock-movements/', { params }),
  
  // Purchase order endpoints
  getPurchaseOrders: (params?: any): Promise<{ data: { results: PurchaseOrder[] } }> =>
    api.get('/inventory/purchase-orders/', { params }),
  
  createPurchaseOrder: (po: Partial<PurchaseOrder>): Promise<{ data: PurchaseOrder }> =>
    api.post('/inventory/purchase-orders/', po),
  
  updatePurchaseOrder: (id: number, po: Partial<PurchaseOrder>): Promise<{ data: PurchaseOrder }> =>
    api.put(`/inventory/purchase-orders/${id}/`, po),
};

// Scheduling API
export const schedulingApi = {
  // Appointment endpoints
  getAppointments: (params?: any): Promise<{ data: { results: Appointment[] } }> =>
    api.get('/scheduling/appointments/', { params }),
  
  getAppointmentById: (id: number): Promise<{ data: Appointment }> =>
    api.get(`/scheduling/appointments/${id}/`),
  
  createAppointment: (appointment: Partial<Appointment>): Promise<{ data: Appointment }> =>
    api.post('/scheduling/appointments/', appointment),
  
  updateAppointment: (id: number, appointment: Partial<Appointment>): Promise<{ data: Appointment }> =>
    api.put(`/scheduling/appointments/${id}/`, appointment),
  
  deleteAppointment: (id: number): Promise<void> =>
    api.delete(`/scheduling/appointments/${id}/`),
  
  updateStatus: (id: number, status: string): Promise<{ data: Appointment }> =>
    api.patch(`/scheduling/appointments/${id}/update_status/`, { status }),
  
  // Technician availability endpoints
  getTechnicianAvailability: (params?: any): Promise<{ data: { results: TechnicianAvailability[] } }> =>
    api.get('/scheduling/technician-availability/', { params }),
  
  createAvailability: (availability: Partial<TechnicianAvailability>): Promise<{ data: TechnicianAvailability }> =>
    api.post('/scheduling/technician-availability/', availability),
  
  // Schedule conflict endpoints
  getScheduleConflicts: (): Promise<{ data: { results: ScheduleConflict[] } }> =>
    api.get('/scheduling/schedule-conflicts/'),
  
  resolveConflict: (id: number, notes: string): Promise<{ data: ScheduleConflict }> =>
    api.patch(`/scheduling/schedule-conflicts/${id}/resolve/`, { resolution_notes: notes }),
};

// Analytics API
export const analyticsApi = {
  getBusinessOverview: (): Promise<{ data: any }> =>
    api.get('/analytics/analytics/business_overview/'),
  
  getFinancialSummary: (): Promise<{ data: any }> =>
    api.get('/analytics/analytics/financial_summary/'),
  
  getOperationalMetrics: (): Promise<{ data: any }> =>
    api.get('/analytics/analytics/operational_metrics/'),
  
  getCustomerInsights: (): Promise<{ data: any }> =>
    api.get('/analytics/analytics/customer_insights/'),
  
  getInventoryInsights: (): Promise<{ data: any }> =>
    api.get('/analytics/analytics/inventory_insights/'),
};

export default api;