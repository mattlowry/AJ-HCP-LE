import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { errorLogger, withErrorHandling, ErrorType } from '../utils/errorHandling';
import { Customer, CustomerListItem, Property, CustomerContact, CustomerReview } from '../types/customer';
import { Job, JobListItem } from '../types/job';
import { Invoice, Estimate, Payment } from '../types/billing';
import { Item, Category, Supplier, StockMovement, PurchaseOrder } from '../types/inventory';
import { Appointment, TechnicianAvailability, ScheduleConflict } from '../types/scheduling';

// Extend the axios config to include metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor for adding auth tokens, performance monitoring, and logging
api.interceptors.request.use(
  (config: ExtendedAxiosRequestConfig) => {
    // Add performance timing metadata
    config.metadata = { startTime: performance.now() };
    
    // Add auth token from secure auth service
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add security headers
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    // Add CSRF protection if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
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

// Response interceptor for error handling, performance monitoring, and logging
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Calculate request duration for performance monitoring
    const config = response.config as ExtendedAxiosRequestConfig;
    const duration = performance.now() - (config.metadata?.startTime || 0);
    
    // Log slow requests
    if (duration > 2000) {
      console.warn(`⚠️ Slow API call: ${response.config.method?.toUpperCase()} ${response.config.url} took ${Math.round(duration)}ms`);
      
      // Log slow requests for production monitoring
      if (process.env.NODE_ENV === 'production') {
        errorLogger.handleError(new Error('Slow API response'), {
          component: 'APIService',
          action: `Slow Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
          userMessage: 'API response was slower than expected'
        });
      }
    }

    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${Math.round(duration)}ms)`, {
        status: response.status,
        data: response.data
      });
    }
    
    return response;
  },
  async (error: AxiosError) => {
    // Handle different types of errors
    const errorDetails = errorLogger.handleError(error, {
      component: 'APIService',
      action: `${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      userMessage: getErrorMessage(error)
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Try to refresh token before giving up
      const { authService } = await import('./authService');
      const newToken = await authService.refreshToken();
      
      if (newToken && error.config) {
        // Retry the original request with new token
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      } else {
        // Refresh failed, logout user
        authService.logout();
      }
    }

    // Handle rate limiting with exponential backoff
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000;
      
      console.warn(`Rate limited. Retrying after ${delay}ms`);
      
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (error.config) {
            api.request(error.config).then(resolve).catch(reject);
          } else {
            reject(error);
          }
        }, delay);
      });
    }

    return Promise.reject(error);
  }
);

// Helper function to get user-friendly error messages
const getErrorMessage = (error: AxiosError): string => {
  if (!error.response) {
    return 'Network connection error. Please check your internet connection.';
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

// Enhanced API wrapper with error handling
const createApiMethod = <T>(apiCall: () => Promise<AxiosResponse<T>>, context: string) => {
  return withErrorHandling(apiCall, {
    component: 'APIService',
    action: context
  });
};

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