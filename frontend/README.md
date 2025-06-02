# AJ Long Electric - Field Service Management System

A comprehensive field service management (FSM) system built for AJ Long Electric, designed to streamline electrical service operations, customer relationships, job scheduling, inventory management, and billing.

## 🚀 Features

### Customer Management
- **Customer Profiles**: Comprehensive customer information with contact details
- **Property Management**: Multiple properties per customer with electrical system details
- **Service History**: Complete history of jobs and interactions
- **Communication Tracking**: Phone, email, and text message preferences

### Job Scheduling & Management
- **Visual Calendar**: Interactive calendar for job scheduling and management
- **Job Workflows**: Complete job lifecycle from scheduling to completion
- **Technician Assignment**: Assign multiple technicians to jobs
- **Material Planning**: Integrated material selection with markup calculation
- **Real-time Status Updates**: Track job progress in real-time

### Inventory Management
- **Stock Tracking**: Real-time inventory levels with automatic reorder alerts
- **Material Catalog**: Comprehensive electrical components catalog
- **Tiered Markup System**: Automated pricing with 6-tier markup structure
- **Job Integration**: Seamless material allocation to jobs
- **Stock Adjustments**: Track usage, purchases, and adjustments

### Billing & Invoicing
- **Automated Invoicing**: Generate invoices from completed jobs
- **Material Markup**: Automatic markup calculation based on cost tiers
- **Payment Tracking**: Monitor payment status and overdue accounts
- **Revenue Analytics**: Track revenue by service type and technician

### Analytics & Reporting
- **Dashboard Metrics**: Real-time business performance indicators
- **Revenue Reports**: Detailed financial analytics and trends
- **Technician Performance**: Individual and team performance metrics
- **Customer Analytics**: Customer value and service patterns

### User Management
- **Role-Based Access**: Admin, Manager, and Technician roles
- **Authentication**: Secure JWT-based authentication
- **Profile Management**: User profiles with contact information
- **Activity Tracking**: Audit trail of user actions

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for component library
- **React Router** for navigation
- **Axios** for API communication
- **React Context** for state management
- **Jest & React Testing Library** for testing

### Backend
- **Django 4.2** with Django REST Framework
- **PostgreSQL** for database
- **Redis** for caching (optional)
- **JWT** for authentication
- **Celery** for background tasks

### Performance Optimizations
- **Code Splitting**: Lazy-loaded components for faster initial load
- **Virtualization**: Efficient rendering of large lists
- **Caching**: Multi-level caching strategy
- **Compression**: Gzip and Brotli compression
- **Bundle Optimization**: Webpack optimizations for smaller bundles

## 📋 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.11+
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ajlongelectric/fsm-system.git
   cd fsm-system
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Admin Panel: http://localhost:8000/admin

## 📖 Documentation

- **[Architecture Guide](ARCHITECTURE.md)** - System architecture and design patterns
- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Development setup and guidelines
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions

## 🧪 Testing

### Frontend Testing
```bash
cd frontend

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run all tests with coverage
npm run test:all
```

### Backend Testing
```bash
cd backend

# Run all tests
python manage.py test

# Run specific app tests
python manage.py test customers

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

## ⚡ Performance Features

### Code Splitting
- Lazy-loaded route components
- Dynamic imports for large dependencies
- Preloading of critical components

### Virtualization
- Virtual scrolling for large customer/job lists
- Efficient rendering of 1000+ items
- Smooth scrolling performance

### Caching Strategy
- API response caching
- Static asset caching
- Database query optimization

### Bundle Optimization
- Tree shaking for unused code
- Compression (Gzip/Brotli)
- Asset optimization

## 🏗️ Project Structure

```
fsm-system/
├── backend/                 # Django backend
│   ├── fsm_core/           # Main Django project
│   ├── apps/               # Django applications
│   │   ├── customers/      # Customer management
│   │   ├── jobs/          # Job scheduling
│   │   ├── inventory/     # Inventory management
│   │   ├── billing/       # Billing & invoicing
│   │   └── analytics/     # Analytics & reporting
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   └── package.json       # Node dependencies
├── docs/                   # Documentation
└── README.md
```

## 🔧 Development

### Available Scripts

#### Frontend
```bash
npm start              # Start development server
npm run build          # Build for production
npm run test           # Run tests
npm run test:integration # Run integration tests
npm run perf:analyze   # Analyze bundle size
```

#### Backend
```bash
python manage.py runserver    # Start development server
python manage.py test         # Run tests
python manage.py migrate      # Run migrations
python manage.py shell        # Django shell
```

### Code Quality

- **ESLint** for JavaScript/TypeScript linting
- **Prettier** for code formatting
- **Black** for Python code formatting
- **Pre-commit hooks** for automated checks

## 🚀 Deployment

### Production Deployment

1. **Railway (Recommended for MVP)**
   - Simple deployment with automatic builds
   - Integrated database provisioning
   - Custom domain support

2. **Vercel + PlanetScale**
   - Optimal for scaling and performance
   - Global CDN for frontend
   - Serverless database

3. **AWS (Enterprise)**
   - Full control and scalability
   - CloudFront + S3 + ECS/EC2
   - RDS + ElastiCache

See [Deployment Guide](DEPLOYMENT.md) for detailed instructions.

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Role-based Access Control** (RBAC)
- **Input Validation** and sanitization
- **CSRF Protection** enabled
- **HTTPS Enforcement** in production
- **Security Headers** for XSS protection
- **API Rate Limiting** to prevent abuse

## 📊 Business Logic

### Material Markup System
Automated pricing with tiered markup structure:
- $0-$25: 50% markup
- $25.01-$50: 40% markup  
- $50.01-$100: 35% markup
- $100.01-$250: 30% markup
- $250.01-$500: 25% markup
- $500+: 20% markup

### Job Workflow
1. **Scheduling**: Customer selects service, property, and preferred time
2. **Assignment**: Manager assigns technicians and materials
3. **Execution**: Technician updates job status and adds notes
4. **Completion**: Job marked complete with photos and final materials
5. **Billing**: Automatic invoice generation with material markup

### Customer Management
- Multiple properties per customer
- Service history and preferences
- Communication tracking
- Billing and payment history

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Customer management
- ✅ Job scheduling
- ✅ Inventory management
- ✅ Basic billing
- ✅ User authentication

### Phase 2 (Next)
- [ ] Mobile technician app
- [ ] Advanced analytics
- [ ] Customer portal
- [ ] Automated notifications
- [ ] GPS tracking

### Phase 3 (Future)
- [ ] AI-powered scheduling optimization
- [ ] Predictive maintenance
- [ ] IoT device integration
- [ ] Advanced reporting
- [ ] Multi-location support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code formatting
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## 📝 License

This project is proprietary software developed for AJ Long Electric. All rights reserved.

## 📞 Support

For technical support or questions:
- **Email**: support@ajlongelectric.com
- **Documentation**: See docs/ directory
- **Issues**: Create GitHub issues for bugs and feature requests

## 🏆 Team

- **Lead Developer**: Development team
- **Project Manager**: AJ Long Electric management
- **QA Testing**: Internal testing team
- **UI/UX Design**: Design team

---

**AJ Long Electric FSM** - Streamlining electrical service operations with modern technology.