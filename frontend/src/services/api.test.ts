// Mock axios before importing anything else
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    })),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }
}));

import axios from 'axios';
import { customerApi, jobApi, inventoryApi } from './api';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the error logger
jest.mock('../utils/errorHandling', () => ({
  errorLogger: {
    handleError: jest.fn(),
    getInstance: jest.fn(() => ({
      handleError: jest.fn()
    }))
  },
  withErrorHandling: jest.fn((fn) => fn)
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create to return the mocked axios instance
    mockedAxios.create.mockReturnValue(mockedAxios);
    
    // Mock interceptors
    mockedAxios.interceptors = {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    } as any;
  });

  describe('Customer API', () => {
    describe('getAll', () => {
      it('should fetch all customers', async () => {
        const mockResponse = {
          data: {
            results: [
              { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
              { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
            ]
          }
        };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await customerApi.getAll();

        expect(mockedAxios.get).toHaveBeenCalledWith('/customers/', { params: undefined });
        expect(result).toEqual(mockResponse);
      });

      it('should handle query parameters', async () => {
        const mockResponse = { data: { results: [] } };
        const params = { search: 'john', page: 1 };

        mockedAxios.get.mockResolvedValue(mockResponse);

        await customerApi.getAll(params);

        expect(mockedAxios.get).toHaveBeenCalledWith('/customers/', { params });
      });
    });

    describe('getById', () => {
      it('should fetch customer by ID', async () => {
        const mockCustomer = { 
          id: 1, 
          first_name: 'John', 
          last_name: 'Doe', 
          email: 'john@example.com' 
        };
        const mockResponse = { data: mockCustomer };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await customerApi.getById(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('/customers/1/');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('create', () => {
      it('should create a new customer', async () => {
        const newCustomer = {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '555-1234'
        };
        const mockResponse = { data: { id: 1, ...newCustomer } };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await customerApi.create(newCustomer);

        expect(mockedAxios.post).toHaveBeenCalledWith('/customers/', newCustomer);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('update', () => {
      it('should update an existing customer', async () => {
        const updateData = { first_name: 'Johnny' };
        const mockResponse = { data: { id: 1, first_name: 'Johnny' } };

        mockedAxios.put.mockResolvedValue(mockResponse);

        const result = await customerApi.update(1, updateData);

        expect(mockedAxios.put).toHaveBeenCalledWith('/customers/1/', updateData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('delete', () => {
      it('should delete a customer', async () => {
        mockedAxios.delete.mockResolvedValue({});

        await customerApi.delete(1);

        expect(mockedAxios.delete).toHaveBeenCalledWith('/customers/1/');
      });
    });

    describe('property management', () => {
      it('should get customer properties', async () => {
        const mockProperties = [
          { id: 1, street_address: '123 Main St', customer: 1 }
        ];
        const mockResponse = { data: mockProperties };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await customerApi.getProperties(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('/customers/1/properties/');
        expect(result).toEqual(mockResponse);
      });

      it('should add property to customer', async () => {
        const newProperty = {
          street_address: '456 Oak Ave',
          city: 'Springfield',
          state: 'IL',
          zip_code: '62701'
        };
        const mockResponse = { data: { id: 2, customer: 1, ...newProperty } };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await customerApi.addProperty(1, newProperty);

        expect(mockedAxios.post).toHaveBeenCalledWith('/customers/1/add_property/', newProperty);
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Job API', () => {
    describe('getAll', () => {
      it('should fetch all jobs', async () => {
        const mockJobs = [
          { id: 1, title: 'Outlet Installation', customer: 1 },
          { id: 2, title: 'Panel Upgrade', customer: 2 }
        ];
        const mockResponse = { data: { results: mockJobs } };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await jobApi.getAll();

        expect(mockedAxios.get).toHaveBeenCalledWith('/jobs/', { params: undefined });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('create', () => {
      it('should create a new job', async () => {
        const newJob = {
          title: 'New Installation',
          customer: 1,
          description: 'Install new outlets'
        };
        const mockResponse = { data: { id: 3, ...newJob } };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await jobApi.create(newJob);

        expect(mockedAxios.post).toHaveBeenCalledWith('/jobs/', newJob);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateStatus', () => {
      it('should update job status', async () => {
        const mockResponse = { data: { id: 1, status: 'completed' } };

        mockedAxios.patch.mockResolvedValue(mockResponse);

        const result = await jobApi.updateStatus(1, 'completed');

        expect(mockedAxios.patch).toHaveBeenCalledWith('/jobs/1/update_status/', { status: 'completed' });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('assignTechnicians', () => {
      it('should assign technicians to job', async () => {
        const technicianIds = [1, 2];
        const mockResponse = { data: { id: 1, assigned_technicians: technicianIds } };

        mockedAxios.patch.mockResolvedValue(mockResponse);

        const result = await jobApi.assignTechnicians(1, technicianIds);

        expect(mockedAxios.patch).toHaveBeenCalledWith('/jobs/1/assign_technicians/', { technician_ids: technicianIds });
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Inventory API', () => {
    describe('getItems', () => {
      it('should fetch inventory items', async () => {
        const mockItems = [
          { id: 1, name: 'Standard Outlet', sku: 'OUT-001', current_stock: 50 },
          { id: 2, name: 'GFCI Outlet', sku: 'OUT-002', current_stock: 25 }
        ];
        const mockResponse = { data: { results: mockItems } };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await inventoryApi.getItems();

        expect(mockedAxios.get).toHaveBeenCalledWith('/inventory/items/', { params: undefined });
        expect(result).toEqual(mockResponse);
      });

      it('should handle filter parameters', async () => {
        const params = { is_active: true, category: 1 };
        const mockResponse = { data: { results: [] } };

        mockedAxios.get.mockResolvedValue(mockResponse);

        await inventoryApi.getItems(params);

        expect(mockedAxios.get).toHaveBeenCalledWith('/inventory/items/', { params });
      });
    });

    describe('adjustStock', () => {
      it('should adjust item stock', async () => {
        const mockResponse = { data: { id: 1, current_stock: 45 } };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await inventoryApi.adjustStock(1, -5, 'Used in job');

        expect(mockedAxios.post).toHaveBeenCalledWith('/inventory/items/1/adjust_stock/', { 
          quantity: -5, 
          reason: 'Used in job' 
        });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getCategories', () => {
      it('should fetch inventory categories', async () => {
        const mockCategories = [
          { id: 1, name: 'Outlets' },
          { id: 2, name: 'Switches' }
        ];
        const mockResponse = { data: mockCategories };

        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await inventoryApi.getCategories();

        expect(mockedAxios.get).toHaveBeenCalledWith('/inventory/categories/');
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(customerApi.getAll()).rejects.toThrow('Network Error');
    });

    it('should handle HTTP error responses', async () => {
      const httpError = {
        response: {
          status: 404,
          data: { message: 'Customer not found' }
        }
      };
      mockedAxios.get.mockRejectedValue(httpError);

      await expect(customerApi.getById(999)).rejects.toEqual(httpError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      };
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(customerApi.getAll()).rejects.toEqual(timeoutError);
    });
  });

  describe('Authentication', () => {
    it('should include auth token in requests when available', () => {
      // Mock localStorage
      const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
      mockGetItem.mockReturnValue('mock-auth-token');

      // The interceptor should be called during axios.create
      expect(mockedAxios.create).toHaveBeenCalled();
      expect(mockedAxios.interceptors.request.use).toHaveBeenCalled();

      mockGetItem.mockRestore();
    });
  });
});