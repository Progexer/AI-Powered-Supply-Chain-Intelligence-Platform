# SupplyChainIQ 📦🤖

> **AI-Powered Supply Chain Intelligence Platform**

SupplyChainIQ is a full-stack, enterprise-grade decision support platform designed to optimize inventory levels, predict shipment delays, forecast customer demand, and assess supplier risk. The platform operates on a **hybrid database model**—leveraging a live **Supabase (PostgreSQL)** server for production operations and providing dynamic **Isolated User Workspaces** where users can upload and evaluate their own datasets with automated schema adaptation.

---

## 🛠️ Tech Stack & Architecture

### Backend (Python)
* **Framework:** FastAPI
* **Machine Learning:** Scikit-Learn, Joblib, NumPy, Pandas (RandomForest Classifier & Regressor)
* **Database & Auth:** Supabase / PostgreSQL Client
* **Server:** Uvicorn / Gunicorn

### Frontend (JavaScript)
* **Framework:** React.js (Vite)
* **Styling:** TailwindCSS, Modern Vanilla CSS
* **Charts & Visualizations:** Recharts
* **Icons:** Lucide React

### Deployment & DevOps
* **Containerization:** Docker & Docker Compose
* **Web Server / Reverse Proxy:** Nginx (SPA-safe proxy routing)
* **Cloud Environments:** Render (API Service) & Vercel (Static Web Client)

---

## 🚀 Key Features

* **📦 Inventory Optimization:** Real-time calculation of Safety Stock levels and Reorder Points adjusted by customizable Service Level Agreements (90%, 95%, 99%). Detects stockout risks and calculates financial revenue at risk.
* **🚚 Delay Prediction:** ML-powered classifier predicting lead time delays and probability scores based on route, supplier, and order data.
* **📈 Demand Forecasting:** Regression modeling to project future sales volumes and optimize procurement plans.
* **🛡️ Supplier Risk Benchmarking:** Scatter-plot performance matrix indexing supplier cost, quality, delivery, and reliability metrics.
* **📂 Workspace Ingestion Engine:** Upload custom CSV files, automatically validate schema integrity, adapt missing fields, and isolate data views per user.

---

## 📁 Repository Structure

```
├── backend/                  # Python FastAPI Backend
│   ├── routers/              # API Route Handlers (health, inventory, predictions, etc.)
│   ├── services/             # Core Business Logic (ml_service, supabase_service, data_service)
│   ├── config.py             # Pydantic Settings
│   ├── requirements.txt      # Backend Dependencies
│   └── Dockerfile            # Container build for Backend
├── frontend/                 # React Frontend
│   ├── src/                  # Components, Pages, and API Interfaces
│   ├── public/               # Static Assets
│   ├── vite.config.js        # Vite compilation and local proxy config
│   ├── vercel.json           # Single-page-app routing for Vercel
│   └── Dockerfile            # Container build for Frontend (Nginx-backed)
├── supabase/                 # Database Schemas & Seed Scripts
│   ├── sql/                  # Relational migrations (schemas, views, RLS)
│   └── seed_supabase.py      # Optimized bulk database seeding script
├── models/                   # Local ML models and data fallbacks
├── docker-compose.yml        # Multi-container local production orchestrator
└── render.yaml               # Infrastructure blueprint for Render
```

---

## 💻 Local Development Setup

### 1. Backend Service
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

### 2. Frontend Client
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Launch the hot-reloading dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Production Deployment
1. **Backend (Render):** Link repository, set root folder blank, build command `pip install -r backend/requirements.txt`, start command `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`. Configure your database credentials and `CORS_ORIGINS=*` in Render Environment Variables.
2. **Frontend (Vercel):** Link repository, set root folder to `frontend`. Add environment variable `VITE_API_URL` pointing to your Render backend instance. Vercel automatically deploys static assets with SPA routing.
