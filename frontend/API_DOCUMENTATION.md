# AJ Long Electric FSM - API Documentation

This document provides comprehensive API documentation for the Field Service Management system backend.

## Base Information

- **Base URL**: `https://api.ajlongelectric.com/api/v1/`
- **Authentication**: JWT Bearer tokens
- **Content Type**: `application/json`
- **API Version**: v1

## Authentication

### Obtain Token

```http
POST /auth/token/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "admin"
  }
}
```

### Refresh Token

```http
POST /auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Using Authentication

Include the access token in all authenticated requests:

```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided data is invalid",
    "details": {
      "email": ["This field is required."],
      "phone": ["Enter a valid phone number."]
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_1234567890"
  }
}
```

### HTTP Status Codes

- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## Pagination

All list endpoints support pagination:

### Request Parameters

- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 20, max: 100)

### Response Format

```json
{
  "count": 150,
  "next": "https://api.ajlongelectric.com/api/v1/customers/?page=3",
  "previous": "https://api.ajlongelectric.com/api/v1/customers/?page=1",
  "results": [...]
}
```

## Filtering and Search

### Query Parameters

- `search` - Full-text search across relevant fields
- `ordering` - Sort by field (prefix with `-` for descending)
- Field-specific filters (see individual endpoints)

### Example

```http
GET /customers/?search=john&customer_type=residential&ordering=-created_at
```

---

# Customer Management API

## List Customers

```http
GET /customers/
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search in name, email, phone |
| customer_type | string | Filter by type: `residential`, `commercial` |
| city | string | Filter by city |
| state | string | Filter by state |
| created_after | date | Filter by creation date |
| has_active_jobs | boolean | Filter customers with active jobs |

### Response

```json
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "555-0123",
      "address": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zip_code": "62701",
      "customer_type": "residential",
      "preferred_contact_method": "phone",
      "properties_count": 2,
      "active_jobs_count": 1,
      "total_revenue": 2500.00,
      "recent_jobs": [
        {
          "id": 5,
          "title": "Outlet Installation",
          "status": "scheduled",
          "scheduled_date": "2024-01-20T10:00:00Z"
        }
      ],
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z"
    }
  ]
}
```

## Create Customer

```http
POST /customers/
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "phone": "555-0124",
  "address": "456 Oak Ave",
  "city": "Springfield",
  "state": "IL",
  "zip_code": "62702",
  "customer_type": "residential",
  "preferred_contact_method": "email"
}
```

### Validation Rules

- `first_name`: Required, max 100 characters
- `last_name`: Required, max 100 characters
- `email`: Required, valid email, unique
- `phone`: Required, valid phone format
- `customer_type`: One of: `residential`, `commercial`
- `preferred_contact_method`: One of: `phone`, `email`, `text`

## Get Customer Details

```http
GET /customers/{id}/
```

### Response

```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "555-0123",
  "address": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip_code": "62701",
  "customer_type": "residential",
  "preferred_contact_method": "phone",
  "properties": [
    {
      "id": 1,
      "street_address": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "zip_code": "62701",
      "property_type": "single_family",
      "electrical_panel_location": "Basement",
      "electrical_panel_type": "200A Main",
      "special_instructions": "Key under mat",
      "latitude": 39.7817,
      "longitude": -89.6501
    }
  ],
  "recent_jobs": [...],
  "billing_info": {
    "total_invoiced": 5000.00,
    "total_paid": 4500.00,
    "outstanding_balance": 500.00
  },
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

## Update Customer

```http
PUT /customers/{id}/
PATCH /customers/{id}/
```

## Delete Customer

```http
DELETE /customers/{id}/
```

## Customer Properties

### List Customer Properties

```http
GET /customers/{id}/properties/
```

### Add Property to Customer

```http
POST /customers/{id}/add_property/
Content-Type: application/json

{
  "street_address": "789 Pine St",
  "city": "Springfield",
  "state": "IL",
  "zip_code": "62703",
  "property_type": "single_family",
  "electrical_panel_location": "Garage",
  "electrical_panel_type": "100A Sub",
  "electrical_panel_age": "10 years",
  "special_instructions": "Dogs in backyard",
  "access_notes": "Gate code: 1234"
}
```

### Property Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| street_address | string | Yes | Property street address |
| city | string | Yes | City |
| state | string | Yes | State (2-letter code) |
| zip_code | string | Yes | ZIP/postal code |
| property_type | string | Yes | `single_family`, `apartment`, `commercial`, `other` |
| electrical_panel_location | string | No | Location of electrical panel |
| electrical_panel_type | string | No | Type/size of electrical panel |
| electrical_panel_age | string | No | Age of electrical panel |
| special_instructions | text | No | Special access or work instructions |
| access_notes | text | No | Access codes, keys, etc. |

---

# Job Management API

## List Jobs

```http
GET /jobs/
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | `scheduled`, `in_progress`, `completed`, `cancelled` |
| customer | integer | Filter by customer ID |
| assigned_technician | integer | Filter by technician ID |
| scheduled_date | date | Filter by scheduled date |
| scheduled_after | datetime | Jobs scheduled after this date |
| scheduled_before | datetime | Jobs scheduled before this date |
| priority | string | `low`, `medium`, `high`, `urgent` |

### Response

```json
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "title": "Kitchen Outlet Installation",
      "description": "Install GFCI outlets in kitchen area",
      "status": "scheduled",
      "priority": "medium",
      "customer": {
        "id": 1,
        "full_name": "John Doe",
        "phone": "555-0123"
      },
      "property": {
        "id": 1,
        "street_address": "123 Main St",
        "city": "Springfield",
        "state": "IL"
      },
      "assigned_technicians": [
        {
          "id": 2,
          "full_name": "Mike Johnson",
          "phone": "555-0125"
        }
      ],
      "scheduled_date": "2024-01-20T10:00:00Z",
      "estimated_duration": "02:00:00",
      "materials_cost": 150.00,
      "labor_cost": 200.00,
      "total_cost": 350.00,
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

## Create Job

```http
POST /jobs/
Content-Type: application/json

{
  "title": "Panel Upgrade",
  "description": "Upgrade electrical panel from 100A to 200A",
  "customer": 1,
  "property": 1,
  "scheduled_date": "2024-01-25T09:00:00Z",
  "estimated_duration": "04:00:00",
  "priority": "high",
  "assigned_technicians": [2, 3],
  "materials": [
    {
      "item_id": 15,
      "quantity": 1,
      "cost_price": 450.00,
      "markup_percentage": 25
    }
  ],
  "special_instructions": "Customer will be home all day"
}
```

### Job Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Job title/summary |
| description | text | No | Detailed job description |
| customer | integer | Yes | Customer ID |
| property | integer | Yes | Property ID |
| scheduled_date | datetime | Yes | When job is scheduled |
| estimated_duration | time | No | Estimated job duration |
| priority | string | No | Job priority level |
| assigned_technicians | array | No | List of technician IDs |
| materials | array | No | Materials needed for job |
| special_instructions | text | No | Special instructions |

## Update Job Status

```http
PATCH /jobs/{id}/update_status/
Content-Type: application/json

{
  "status": "in_progress",
  "notes": "Started work on electrical panel"
}
```

### Status Transitions

- `scheduled` → `in_progress`, `cancelled`
- `in_progress` → `completed`, `cancelled`
- `completed` → No transitions allowed
- `cancelled` → `scheduled` (with manager permission)

## Assign Technicians

```http
PATCH /jobs/{id}/assign_technicians/
Content-Type: application/json

{
  "technician_ids": [2, 3]
}
```

## Job Materials

### List Job Materials

```http
GET /jobs/{id}/materials/
```

### Add Materials to Job

```http
POST /jobs/{id}/add_materials/
Content-Type: application/json

{
  "materials": [
    {
      "item_id": 10,
      "quantity": 5,
      "cost_price": 25.00,
      "markup_percentage": 50
    }
  ]
}
```

---

# Inventory Management API

## List Inventory Items

```http
GET /inventory/items/
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| category | integer | Filter by category ID |
| is_active | boolean | Filter active/inactive items |
| low_stock | boolean | Items below reorder level |
| search | string | Search in name, SKU, description |

### Response

```json
{
  "count": 150,
  "results": [
    {
      "id": 1,
      "name": "GFCI Outlet - 20A",
      "sku": "OUT-GFCI-20A",
      "description": "20 Amp GFCI outlet with LED indicator",
      "category": {
        "id": 1,
        "name": "Outlets"
      },
      "cost_price": 18.97,
      "markup_percentage": 50,
      "selling_price": 28.46,
      "current_stock": 45,
      "reorder_level": 10,
      "max_stock": 100,
      "location": "Aisle 2, Shelf B",
      "supplier": "ElectricPro Supply",
      "is_active": true,
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-10T15:30:00Z"
    }
  ]
}
```

## Create Inventory Item

```http
POST /inventory/items/
Content-Type: application/json

{
  "name": "LED Dimmer Switch",
  "sku": "SW-DIM-LED",
  "description": "LED compatible dimmer switch",
  "category": 2,
  "cost_price": 24.99,
  "current_stock": 25,
  "reorder_level": 5,
  "max_stock": 50,
  "location": "Aisle 1, Shelf A",
  "supplier": "ElectricPro Supply"
}
```

## Adjust Stock

```http
POST /inventory/items/{id}/adjust_stock/
Content-Type: application/json

{
  "quantity": -5,
  "reason": "Used in job #123",
  "reference_id": 123,
  "reference_type": "job"
}
```

### Stock Adjustment Types

- `job_usage` - Materials used in a job
- `purchase` - New inventory received
- `damage` - Items damaged/lost
- `transfer` - Transfer between locations
- `correction` - Inventory count correction

## Inventory Categories

### List Categories

```http
GET /inventory/categories/
```

### Response

```json
[
  {
    "id": 1,
    "name": "Outlets",
    "description": "Electrical outlets and receptacles",
    "items_count": 25
  },
  {
    "id": 2,
    "name": "Switches",
    "description": "Light switches and dimmers",
    "items_count": 18
  }
]
```

---

# Billing and Invoicing API

## List Invoices

```http
GET /billing/invoices/
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | `draft`, `sent`, `paid`, `overdue`, `cancelled` |
| customer | integer | Filter by customer ID |
| due_date_before | date | Invoices due before date |
| due_date_after | date | Invoices due after date |
| amount_min | decimal | Minimum invoice amount |
| amount_max | decimal | Maximum invoice amount |

### Response

```json
{
  "count": 30,
  "results": [
    {
      "id": 1,
      "invoice_number": "INV-2024-001",
      "customer": {
        "id": 1,
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "job": {
        "id": 5,
        "title": "Kitchen Outlet Installation"
      },
      "status": "sent",
      "issue_date": "2024-01-15",
      "due_date": "2024-02-14",
      "subtotal": 350.00,
      "tax_amount": 28.00,
      "total_amount": 378.00,
      "amount_paid": 0.00,
      "balance_due": 378.00,
      "line_items": [
        {
          "description": "Labor - Outlet Installation",
          "quantity": 2,
          "rate": 75.00,
          "amount": 150.00
        },
        {
          "description": "GFCI Outlet",
          "quantity": 2,
          "rate": 28.46,
          "amount": 56.92
        }
      ],
      "payment_terms": "Net 30",
      "notes": "Thank you for your business!",
      "created_at": "2024-01-15T16:00:00Z"
    }
  ]
}
```

## Create Invoice

```http
POST /billing/invoices/
Content-Type: application/json

{
  "customer": 1,
  "job": 5,
  "due_date": "2024-02-14",
  "line_items": [
    {
      "description": "Labor - Panel Upgrade",
      "quantity": 4,
      "rate": 85.00,
      "amount": 340.00
    }
  ],
  "tax_rate": 8.0,
  "payment_terms": "Net 30",
  "notes": "Panel upgrade completed per estimate"
}
```

## Update Invoice Status

```http
PATCH /billing/invoices/{id}/update_status/
Content-Type: application/json

{
  "status": "paid",
  "payment_date": "2024-01-20",
  "payment_method": "credit_card",
  "payment_reference": "ch_1234567890"
}
```

## Send Invoice

```http
POST /billing/invoices/{id}/send/
Content-Type: application/json

{
  "send_method": "email",
  "recipient_email": "john@example.com",
  "message": "Please find attached your invoice for recent electrical work."
}
```

---

# Analytics and Reporting API

## Dashboard Metrics

```http
GET /analytics/dashboard/
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | `today`, `week`, `month`, `quarter`, `year` |
| start_date | date | Custom date range start |
| end_date | date | Custom date range end |

### Response

```json
{
  "period": "month",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "metrics": {
    "total_revenue": 15750.00,
    "jobs_completed": 25,
    "jobs_scheduled": 12,
    "new_customers": 8,
    "average_job_value": 630.00,
    "technician_utilization": 85.5,
    "customer_satisfaction": 4.7
  },
  "trends": {
    "revenue_growth": 12.5,
    "job_completion_rate": 94.2,
    "response_time_avg": "02:15:00"
  },
  "top_services": [
    {
      "service": "Outlet Installation",
      "count": 8,
      "revenue": 2400.00
    }
  ]
}
```

## Revenue Report

```http
GET /analytics/revenue/
```

### Response

```json
{
  "summary": {
    "total_revenue": 45250.00,
    "total_invoiced": 48000.00,
    "outstanding_receivables": 2750.00,
    "collection_rate": 94.3
  },
  "monthly_breakdown": [
    {
      "month": "2024-01",
      "revenue": 15750.00,
      "invoiced": 16200.00,
      "collected": 15300.00
    }
  ],
  "revenue_by_service": [
    {
      "service_type": "Panel Upgrades",
      "revenue": 18500.00,
      "percentage": 40.9
    }
  ]
}
```

## Technician Performance

```http
GET /analytics/technicians/
```

### Response

```json
{
  "technicians": [
    {
      "id": 2,
      "name": "Mike Johnson",
      "jobs_completed": 18,
      "hours_worked": 144,
      "revenue_generated": 8250.00,
      "efficiency_rating": 92.5,
      "customer_ratings": 4.8,
      "certifications": [
        "Master Electrician",
        "OSHA 30"
      ]
    }
  ],
  "team_averages": {
    "jobs_per_technician": 15.2,
    "hours_per_week": 38.5,
    "customer_rating": 4.6
  }
}
```

---

# User Management API

## List Users

```http
GET /users/
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| role | string | `admin`, `manager`, `technician` |
| is_active | boolean | Filter active/inactive users |
| is_active_technician | boolean | Filter active technicians |

### Response

```json
{
  "count": 12,
  "results": [
    {
      "id": 1,
      "email": "admin@ajlongelectric.com",
      "first_name": "Admin",
      "last_name": "User",
      "role": "admin",
      "phone": "555-0100",
      "is_active": true,
      "is_active_technician": false,
      "date_joined": "2024-01-01T00:00:00Z",
      "last_login": "2024-01-15T08:30:00Z"
    }
  ]
}
```

## Create User

```http
POST /users/
Content-Type: application/json

{
  "email": "technician@ajlongelectric.com",
  "password": "SecurePassword123!",
  "first_name": "New",
  "last_name": "Technician",
  "role": "technician",
  "phone": "555-0130",
  "is_active_technician": true
}
```

## Update User Profile

```http
PATCH /users/{id}/
Content-Type: application/json

{
  "phone": "555-0131",
  "is_active_technician": false
}
```

---

# Webhooks

## Available Webhooks

| Event | Description |
|-------|-------------|
| `job.status_changed` | Job status updated |
| `invoice.created` | New invoice created |
| `invoice.paid` | Invoice payment received |
| `customer.created` | New customer added |
| `inventory.low_stock` | Item below reorder level |

## Webhook Payload Format

```json
{
  "event": "job.status_changed",
  "timestamp": "2024-01-15T14:30:00Z",
  "data": {
    "job_id": 5,
    "previous_status": "scheduled",
    "new_status": "in_progress",
    "changed_by": {
      "id": 2,
      "name": "Mike Johnson"
    }
  },
  "webhook_id": "wh_1234567890"
}
```

## Webhook Security

All webhooks include an `X-Signature` header with HMAC-SHA256 signature:

```
X-Signature: sha256=a8b2c3d4e5f6...
```

Verify using your webhook secret:

```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected_signature}", signature)
```

---

# Rate Limiting

## Limits

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **Webhook endpoints**: 10 requests per minute

## Headers

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

## Rate Limit Exceeded

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 3600
  }
}
```

---

# SDKs and Libraries

## JavaScript/TypeScript

```bash
npm install @ajlongelectric/fsm-api-client
```

```typescript
import { FSMApiClient } from '@ajlongelectric/fsm-api-client';

const client = new FSMApiClient({
  baseUrl: 'https://api.ajlongelectric.com',
  apiKey: 'your-api-key'
});

// Get customers
const customers = await client.customers.list();

// Create job
const job = await client.jobs.create({
  title: 'Panel Upgrade',
  customer: 1,
  scheduled_date: '2024-01-20T10:00:00Z'
});
```

## Python

```bash
pip install ajlongelectric-fsm-client
```

```python
from ajlongelectric import FSMClient

client = FSMClient(
    base_url='https://api.ajlongelectric.com',
    api_key='your-api-key'
)

# Get customers
customers = client.customers.list()

# Create job
job = client.jobs.create({
    'title': 'Panel Upgrade',
    'customer': 1,
    'scheduled_date': '2024-01-20T10:00:00Z'
})
```

This API documentation provides comprehensive coverage of all endpoints, making it easy for developers to integrate with the AJ Long Electric FSM system.