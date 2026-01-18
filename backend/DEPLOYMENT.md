# Backend Deployment Guide - AceExam

This document provides instructions for deploying the AceExam backend service.

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **MySQL**: v8.0 or higher
- **Process Manager**: PM2 (Recommended)

## 2. Database Setup

1. **Create Database**:
   Log in to your MySQL server and create a database named `aceexam`:
   ```sql
   CREATE DATABASE aceexam DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **User Permissions**:
   Ensure the database user has sufficient permissions:
   ```sql
   GRANT ALL PRIVILEGES ON aceexam.* TO 'your_user'@'%' IDENTIFIED BY 'your_password';
   FLUSH PRIVILEGES;
   ```

3. **Initialize Schema**:
   The backend automatically initializes tables on startup, but you can manually apply [schema.sql](./schema.sql) if needed.

4. **Import Question Data**:
   Ensure the frontend `data.json` is available and run the import script:
   ```bash
   npm run import
   ```

## 3. Environment Configuration

Create a `.env` file in the `backend/` directory based on the following template:

```env
DB_HOST=your_mysql_host
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=aceexam
PORT=3003
```

## 4. Installation & Deployment

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Start with PM2 (Production)**:
   ```bash
   pm2 start index.js --name "aceexam-backend"
   ```

3. **Verify Service**:
   Check if the API is responding:
   ```bash
   curl http://localhost:3003/api/health
   ```

## 5. Nginx Configuration (Reverse Proxy)

To expose the backend securely and support WebSockets, use the following Nginx configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Socket.io specific path
    location /socket.io/aceexam {
        proxy_pass http://localhost:3003/socket.io/aceexam;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 6. Security Considerations

- **SSL**: Always use HTTPS in production (Certbot/Let's Encrypt).
- **Firewall**: Ensure port `3003` is not exposed directly to the public internet unless necessary; use Nginx as a gateway.
- **Database**: Do not use the `root` user for the application.
