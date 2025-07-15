# DealHunt Project - Deployment Guide

This guide will help you deploy the DealHunt project using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- Git (to clone the repository)

## Project Structure

The project consists of 3 main services:
1. **MongoDB** - Database service
2. **Backend** - FastAPI Python application
3. **Frontend** - React application served with Nginx

## Environment Files Setup

Before running the project, you need to create the following environment files:

### 1. Backend Environment File (`backend/.env`)

Create a file at `backend/.env` with the following content:

```env
# ── Aliexpress credentials ────────────────────────────────────────────────
APP_KEY=your_aliexpress_app_key
APP_SECRET=your_aliexpress_app_secret
TRACKING_ID=your_tracking_id

# ── eBay credentials ────────────────────────────────────────────────
EBAY_TOKEN=your_ebay_token
EBAY_CAMPAIGN_ID=your_ebay_campaign_id
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_REFRESH_TOKEN=your_ebay_refresh_token

# ── mongo credentials ────────────────────────────────────────────────
MONGODB_URI=mongodb://admin:password123@localhost:27017/dealhunt?authSource=admin

# ── JWT settings ──────────────────────────────────────────────
SECRET_KEY=your_jwt_secret_key_here

# ── Google OAuth credentials ────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ── Email configuration for password reset ────────────────────────────────────────────────
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=your_email@gmail.com
FRONTEND_URL=http://localhost:3000
```

### 2. Frontend Environment File (`frontend/.env`)

Create a file at `frontend/.env` with the following content:

```env
# frontend/.env
# API Configuration
VITE_API_URL=http://localhost:8000

# Development settings
VITE_NODE_ENV=development
```

### 3. Root Environment File (`.env`)

Create a file at the root directory `.env` with the following content:

```env
# Docker Environment Variables
MONGODB_URI=mongodb://admin:password123@mongodb:27017/dealhunt?authSource=admin
FRONTEND_URL=http://localhost:3000
```

## Deployment Instructions

Once you have set up the environment files, follow these simple steps:

### 1. Navigate to the project directory
```bash
cd DealHunt-fullstack-project
```

### 2. Build and start all services
```bash
docker-compose up --build
```

This single command will:
- Build the backend Docker image
- Build the frontend Docker image
- Start MongoDB database
- Start all 3 services in the correct order

### 3. Access the application

After all services are running, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **MongoDB**: localhost:27017

## Verification

To verify that all services are running correctly:

1. Check container status:
```bash
docker-compose ps
```

2. Test backend health:
```bash
curl http://localhost:8000/health
```

3. Open your browser and navigate to http://localhost:3000

## Stopping the Application

To stop all services:
```bash
docker-compose down
```

## Services Overview

### MongoDB Service
- **Image**: mongo:7.0
- **Port**: 27017
- **Credentials**: admin/password123
- **Database**: dealhunt

### Backend Service
- **Technology**: FastAPI (Python)
- **Port**: 8000
- **Features**: 
  - RESTful API
  - MongoDB integration
  - Google OAuth authentication
  - Price monitoring
  - Email notifications

### Frontend Service
- **Technology**: React + Vite
- **Port**: 3000 (mapped from internal port 80)
- **Features**:
  - Modern React application
  - Responsive design
  - Real-time updates
  - User authentication

## Troubleshooting

### Common Issues:

1. **Port already in use**: Make sure ports 3000, 8000, and 27017 are available
2. **Build failures**: Ensure Docker has enough resources allocated
3. **Environment variables**: Double-check that all .env files are created correctly

### Logs:
To view logs for debugging:
```bash
docker-compose logs [service-name]
```

For example:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

## Requirements Met

✅ **3 Services**: MongoDB, Backend (FastAPI), Frontend (React)  
✅ **Single Command Deployment**: `docker-compose up --build`  
✅ **Environment Configuration**: Clear .env file instructions  
✅ **Complete Setup**: No additional manual steps required  
✅ **Browser Access**: Frontend accessible at http://localhost:3000  
✅ **Port Consistency**: All services use consistent port configuration  

## Port Configuration Notes

- **Frontend-Backend Communication**: The frontend is configured to communicate with the backend on port 8000 via environment variables
- **Docker Port Mapping**: All containers expose the correct ports (3000 for frontend, 8000 for backend, 27017 for MongoDB)
- **CORS Configuration**: The backend allows cross-origin requests from the frontend
- **Environment Variables**: The API URL is built into the frontend during Docker build process using the VITE_API_URL environment variable

## Known Issues Fixed

- ✅ **Port Consistency**: Fixed frontend fallback URLs from 8001 to 8000
- ✅ **Environment Variables**: Added VITE_API_URL to Docker build process
- ✅ **API Communication**: Frontend now correctly communicates with backend API

---

**Note**: This project is designed for educational purposes and follows Docker best practices for containerized deployment.