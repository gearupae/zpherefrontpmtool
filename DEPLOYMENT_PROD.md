# Production deployment guide (frontend)

Build
- Install and build with the backend API URL
  REACT_APP_API_URL=https://api.yourdomain.com npm ci
  REACT_APP_API_URL=https://api.yourdomain.com npm run build
- The output is in frontend/build

Nginx example
  server {
    listen 443 ssl;
    server_name app.yourdomain.com;

    root /var/www/zphere/frontend/build;
    index index.html;

    location / {
      try_files $uri /index.html;
    }
  }

Environment variables
- REACT_APP_API_URL must point to your backend (e.g., https://api.yourdomain.com)
- REACT_APP_APP_NAME and REACT_APP_VERSION are optional; see env.example
