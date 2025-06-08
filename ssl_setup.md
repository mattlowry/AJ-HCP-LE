# SSL/HTTPS Setup Guide for AJ Long Electric FSM

## Production SSL Configuration

### 1. Environment Variables for SSL

Add these to your production environment variables:

```bash
# SSL Configuration
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
USE_HTTPS=True

# Domain Configuration  
ALLOWED_HOSTS=aj-long-electric.com,www.aj-long-electric.com,aj-long-electric.onrender.com
CSRF_TRUSTED_ORIGINS=https://aj-long-electric.com,https://www.aj-long-electric.com,https://aj-long-electric.onrender.com
```

### 2. Deployment Platform SSL Setup

#### For Railway/Render/Heroku:
- These platforms provide automatic SSL certificates via Let's Encrypt
- SSL is enabled by default for custom domains
- Configure custom domain in platform dashboard
- Update DNS records to point to platform

#### For Custom Server/VPS:
- Use Certbot for Let's Encrypt certificates
- Configure nginx/Apache for SSL termination
- Set up automatic certificate renewal

### 3. Django SSL Configuration

The settings.py has been configured with:
- SECURE_SSL_REDIRECT (controlled by environment variable)
- SECURE_HSTS_SECONDS (1 year for maximum security)
- SECURE_HSTS_INCLUDE_SUBDOMAINS=True
- SECURE_HSTS_PRELOAD=True
- Secure cookie settings

### 4. Frontend HTTPS Configuration

Update frontend API base URL to use HTTPS:
- Development: http://localhost:8000/api/
- Production: https://your-domain.com/api/

### 5. SSL Verification Checklist

- [ ] SSL certificate installed and valid
- [ ] HTTPS redirect working (HTTP -> HTTPS)
- [ ] HSTS headers present
- [ ] Security headers configured
- [ ] Mixed content warnings resolved
- [ ] API calls using HTTPS
- [ ] WebSocket connections using WSS (if applicable)

### 6. SSL Testing

Test SSL configuration with:
- SSL Labs Test: https://www.ssllabs.com/ssltest/
- Security Headers: https://securityheaders.com/
- Mozilla Observatory: https://observatory.mozilla.org/

### 7. Certificate Monitoring

- Set up monitoring for certificate expiration
- Configure automatic renewal (Let's Encrypt expires every 90 days)
- Test renewal process in staging environment

## Implementation Status: ✅ CONFIGURED
All SSL settings are now properly configured in Django settings.
Next step: Deploy to production platform and configure domain SSL.