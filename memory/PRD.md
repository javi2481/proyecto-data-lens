# DataLens - Product Requirements Document

## Original Problem Statement
DataLens es una plataforma web donde cualquier persona sube un archivo de datos (CSV, Excel, JSON, Parquet) y en menos de 60 segundos recibe un análisis profesional completo: estadísticas descriptivas, distribuciones, correlaciones, alertas de calidad, datos faltantes, duplicados, y recomendaciones accionables.

## User Personas
1. **Analistas Junior**: Necesitan análisis rápidos sin código
2. **PMs/Emprendedores**: Requieren insights de sus datos de negocio
3. **Estudiantes**: Aprenden análisis de datos
4. **Contadores**: Trabajan con planillas y necesitan validación

## Core Requirements (Static)
- Upload multi-formato: CSV, XLSX, XLS, JSON, Parquet
- Detección automática de encoding, separadores y tipos
- Análisis estadístico completo (media, mediana, percentiles, etc.)
- Visualizaciones interactivas con Recharts
- Alertas de calidad (missing, duplicados, correlaciones altas)
- Comparación de datasets
- Export PDF y links compartibles (Pro)
- Planes: Free (5MB/50K filas), Pro ($12/mes), Team ($29/mes)

## Architecture
- **Frontend**: React + Recharts + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + Python
- **Database**: MongoDB (usuarios, reportes, sesiones)
- **Storage**: Emergent Object Storage (archivos temporales)
- **Auth**: Google OAuth via Emergent Auth
- **Payments**: Stripe Checkout

## What's Been Implemented (MVP - April 2026)

### Backend
- [x] Google OAuth authentication with Emergent Auth
- [x] User management with plans (free/pro/team)
- [x] File upload to Object Storage
- [x] Mock data profiling (statistics, correlations, alerts)
- [x] Reports CRUD
- [x] Dataset comparison endpoint
- [x] Public sharing with tokens
- [x] Stripe checkout integration
- [x] Plan limits enforcement
- [x] PDF export with WeasyPrint
- [x] Stripe Customer Portal for subscription management

### Frontend  
- [x] Landing page with feature highlights
- [x] Google login flow
- [x] Dashboard with file upload dropzone
- [x] Profile data visualization (Overview, Variables, Correlations, Alerts)
- [x] Recharts integration for charts
- [x] Reports list page
- [x] Dataset comparison page
- [x] Pricing page with 3 plans
- [x] Public report view
- [x] Dark/Light mode toggle
- [x] Spanish/English language toggle

### Integrations
- [x] Emergent Google Auth
- [x] Emergent Object Storage
- [x] Stripe Checkout (test mode)

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Connect to real ydata-profiling service (Railway container)
- [x] PDF export implementation with WeasyPrint
- [x] Stripe customer portal for subscription management

### P1 - High Priority
- [ ] Real-time analysis progress updates (WebSocket)
- [ ] Historical reports view in dashboard
- [ ] User settings page
- [ ] Email notifications for plan limits

### P2 - Medium Priority  
- [ ] Google Sheets connection
- [ ] Scheduled quality alerts
- [ ] Time-series mode (tsmode=True)
- [ ] Modo Analista AI with LLM summaries

### P3 - Future
- [ ] Airtable/Supabase DB connections
- [ ] Team collaboration features
- [ ] Custom branding for Team plan
- [ ] MercadoPago integration

## Next Tasks List
1. Deploy ydata-profiling container to Railway
2. Connect backend to ydata-profiling service
3. Implement WeasyPrint PDF generation
4. Add Stripe customer portal for subscription management
5. Create user settings page
6. Add report history to dashboard sidebar
