from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Request, Query, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "datalens"
storage_key = None

# ydata-profiling service URL (configurable)
PROFILING_SERVICE_URL = os.environ.get("PROFILING_SERVICE_URL", "")

# Pricing Plans
PLANS = {
    "free": {"price": 0, "max_file_size_mb": 5, "max_rows": 50000, "reports_per_month": 5, "export_pdf": False, "compare": False},
    "pro": {"price": 12.0, "max_file_size_mb": 100, "max_rows": 1000000, "reports_per_month": 50, "export_pdf": True, "compare": True},
    "team": {"price": 29.0, "max_file_size_mb": 500, "max_rows": 5000000, "reports_per_month": -1, "export_pdf": True, "compare": True}
}

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    plan: str = "free"
    stripe_customer_id: Optional[str] = None
    reports_this_month: int = 0
    month_reset: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m"))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Report(BaseModel):
    report_id: str = Field(default_factory=lambda: f"rpt_{uuid.uuid4().hex[:12]}")
    user_id: str
    filename: str
    file_size: int
    file_type: str
    storage_path: str
    status: str = "pending"  # pending, processing, completed, failed
    profile_data: Optional[Dict[str, Any]] = None
    alerts: Optional[List[Dict[str, Any]]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    is_public: bool = False
    public_token: Optional[str] = None

class ComparisonReport(BaseModel):
    comparison_id: str = Field(default_factory=lambda: f"cmp_{uuid.uuid4().hex[:12]}")
    user_id: str
    report_a_id: str
    report_b_id: str
    comparison_data: Optional[Dict[str, Any]] = None
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PaymentTransaction(BaseModel):
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    user_id: str
    session_id: str
    plan: str
    amount: float
    currency: str = "usd"
    status: str = "initiated"
    payment_status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============ OBJECT STORAGE ============

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not configured, storage disabled")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Object Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ============ AUTH HELPERS ============

async def get_current_user(authorization: str = Header(None), request: Request = None) -> User:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    if not token and request:
        token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Reset monthly counter if needed
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    if user.get("month_reset") != current_month:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"reports_this_month": 0, "month_reset": current_month}}
        )
        user["reports_this_month"] = 0
        user["month_reset"] = current_month
    
    return User(**user)

async def get_optional_user(authorization: str = Header(None), request: Request = None) -> Optional[User]:
    try:
        return await get_current_user(authorization, request)
    except:
        return None

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/session")
async def create_session(request: Request):
    """Exchange session_id from Emergent Auth for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Get user data from Emergent Auth
    try:
        resp = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10
        )
        resp.raise_for_status()
        auth_data = resp.json()
    except Exception as e:
        logger.error(f"Auth verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid session_id")
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(user_id=user_id, email=email, name=name, picture=picture)
        await db.users.insert_one(new_user.model_dump())
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    response = JSONResponse(content={"user": user, "session_token": session_token})
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    return response

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, user: User = Depends(get_current_user)):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return response

# ============ FILE UPLOAD ============

ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls', '.json', '.parquet'}
MIME_TYPES = {
    'csv': 'text/csv',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'json': 'application/json',
    'parquet': 'application/octet-stream'
}

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Read file
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    
    # Check plan limits
    plan = PLANS.get(user.plan, PLANS["free"])
    if file_size_mb > plan["max_file_size_mb"]:
        raise HTTPException(
            status_code=400, 
            detail=f"File size ({file_size_mb:.1f}MB) exceeds your plan limit ({plan['max_file_size_mb']}MB). Upgrade to Pro for larger files."
        )
    
    # Check monthly report limit
    if plan["reports_per_month"] > 0 and user.reports_this_month >= plan["reports_per_month"]:
        raise HTTPException(
            status_code=400,
            detail=f"Monthly report limit reached ({plan['reports_per_month']}). Upgrade your plan for more reports."
        )
    
    # Upload to storage
    storage_path = f"{APP_NAME}/uploads/{user.user_id}/{uuid.uuid4().hex}{ext}"
    content_type = MIME_TYPES.get(ext.lstrip('.'), 'application/octet-stream')
    
    try:
        result = put_object(storage_path, content, content_type)
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")
    
    # Create report record
    report = Report(
        user_id=user.user_id,
        filename=file.filename,
        file_size=len(content),
        file_type=ext.lstrip('.'),
        storage_path=result.get("path", storage_path)
    )
    
    await db.reports.insert_one(report.model_dump())
    
    # Increment report counter
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$inc": {"reports_this_month": 1}}
    )
    
    return {"report_id": report.report_id, "filename": file.filename, "status": "pending"}

# ============ PROFILING (MOCK for now, will connect to Railway container) ============

import pandas as pd
import io
import numpy as np

def transform_ydata_profile(raw_profile: dict, content: bytes, file_type: str) -> Dict[str, Any]:
    """Transform ydata-profiling JSON output to our dashboard format"""
    try:
        # Parse file for sample data
        if file_type == 'csv':
            df = pd.read_csv(io.BytesIO(content))
        elif file_type in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(content))
        elif file_type == 'json':
            df = pd.read_json(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
        
        # Extract table stats
        table = raw_profile.get("table", {})
        variables_raw = raw_profile.get("variables", {})
        correlations_raw = raw_profile.get("correlations", {})
        alerts_raw = raw_profile.get("alerts", [])
        
        # Build overview
        overview = {
            "n_rows": table.get("n", 0),
            "n_columns": table.get("n_var", 0),
            "n_cells": table.get("n", 0) * table.get("n_var", 0),
            "n_missing": table.get("n_cells_missing", 0),
            "missing_percent": round(table.get("p_cells_missing", 0) * 100, 2),
            "n_duplicates": table.get("n_duplicates", 0),
            "duplicate_percent": round(table.get("p_duplicates", 0) * 100, 2),
            "memory_size_bytes": table.get("memory_size", 0),
            "column_types": table.get("types", {})
        }
        
        # Build variables
        variables = {}
        for name, var in variables_raw.items():
            var_info = {
                "name": name,
                "type": var.get("type", "Unknown"),
                "n_missing": var.get("n_missing", 0),
                "missing_percent": round(var.get("p_missing", 0) * 100, 2),
                "n_unique": var.get("n_distinct", 0),
                "unique_percent": round(var.get("p_distinct", 0) * 100, 2)
            }
            
            if var.get("type") == "Numeric":
                var_info["is_numeric"] = True
                var_info["mean"] = var.get("mean")
                var_info["std"] = var.get("std")
                var_info["min"] = var.get("min")
                var_info["max"] = var.get("max")
                var_info["median"] = var.get("median")
                var_info["q1"] = var.get("25%")
                var_info["q3"] = var.get("75%")
                var_info["skewness"] = var.get("skewness")
                var_info["kurtosis"] = var.get("kurtosis")
                if var.get("histogram"):
                    var_info["histogram"] = var["histogram"]
            else:
                var_info["is_numeric"] = False
                if var.get("value_counts_without_nan"):
                    top_values = list(var["value_counts_without_nan"].items())[:10]
                    var_info["top_values"] = [{"value": str(k), "count": int(v)} for k, v in top_values]
            
            variables[name] = var_info
        
        # Build correlations
        correlations = {}
        if correlations_raw.get("pearson"):
            pearson = correlations_raw["pearson"]
            # ydata-profiling returns list of lists or dict
            if isinstance(pearson, list):
                # Find numeric columns from variables
                numeric_cols = [name for name, var in variables.items() if var.get("is_numeric")]
                if len(pearson) > 0 and len(pearson) == len(numeric_cols):
                    correlations["pearson"] = {"columns": numeric_cols, "matrix": pearson}
            elif isinstance(pearson, dict):
                cols = list(pearson.keys())
                matrix = [[pearson.get(c1, {}).get(c2, 0) for c2 in cols] for c1 in cols]
                correlations["pearson"] = {"columns": cols, "matrix": matrix}
        
        # Build alerts
        alerts = []
        for alert in alerts_raw:
            if isinstance(alert, str):
                # ydata-profiling returns strings
                alert_type = "warning"
                if "missing" in alert.lower() or "constant" in alert.lower():
                    alert_type = "danger"
                # Extract column name from format "[column] message"
                column = None
                if alert.startswith("[") and "]" in alert:
                    column = alert[1:alert.index("]")]
                alerts.append({
                    "type": alert_type,
                    "column": column,
                    "message": alert,
                    "category": "correlation" if "correlated" in alert.lower() else "quality"
                })
            elif isinstance(alert, dict):
                alert_type = "warning"
                if "missing" in alert.get("alert_type", "").lower():
                    alert_type = "danger" if alert.get("values", {}).get("p_missing", 0) > 0.5 else "warning"
                alerts.append({
                    "type": alert_type,
                    "column": alert.get("column_name"),
                    "message": alert.get("alert_type", ""),
                    "category": alert.get("alert_type", "").split("_")[0].lower() if alert.get("alert_type") else "unknown"
                })
        
        return {
            "overview": overview,
            "variables": variables,
            "correlations": correlations,
            "alerts": alerts,
            "sample_data": df.head(5).fillna("").to_dict(orient="records")
        }
    except Exception as e:
        logger.error(f"Transform failed: {e}")
        raise

def generate_mock_profile(content: bytes, file_type: str) -> Dict[str, Any]:
    """Generate mock profiling data - will be replaced by ydata-profiling service"""
    try:
        if file_type == 'csv':
            df = pd.read_csv(io.BytesIO(content))
        elif file_type in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(content))
        elif file_type == 'json':
            df = pd.read_json(io.BytesIO(content))
        elif file_type == 'parquet':
            df = pd.read_parquet(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    
    # Overview
    overview = {
        "n_rows": int(df.shape[0]),
        "n_columns": int(df.shape[1]),
        "n_cells": int(df.size),
        "n_missing": int(df.isnull().sum().sum()),
        "missing_percent": float(round(df.isnull().sum().sum() / df.size * 100, 2)),
        "n_duplicates": int(df.duplicated().sum()),
        "duplicate_percent": float(round(df.duplicated().sum() / len(df) * 100, 2)),
        "memory_size_bytes": int(df.memory_usage(deep=True).sum()),
        "column_types": df.dtypes.astype(str).value_counts().to_dict()
    }
    
    # Variables
    variables = {}
    for col in df.columns:
        col_data = df[col]
        var_info = {
            "name": col,
            "type": str(col_data.dtype),
            "n_missing": int(col_data.isnull().sum()),
            "missing_percent": float(round(col_data.isnull().sum() / len(df) * 100, 2)),
            "n_unique": int(col_data.nunique()),
            "unique_percent": float(round(col_data.nunique() / len(df) * 100, 2))
        }
        
        if pd.api.types.is_numeric_dtype(col_data):
            var_info["is_numeric"] = True
            var_info["mean"] = float(col_data.mean()) if not col_data.isnull().all() else None
            var_info["std"] = float(col_data.std()) if not col_data.isnull().all() else None
            var_info["min"] = float(col_data.min()) if not col_data.isnull().all() else None
            var_info["max"] = float(col_data.max()) if not col_data.isnull().all() else None
            var_info["median"] = float(col_data.median()) if not col_data.isnull().all() else None
            var_info["q1"] = float(col_data.quantile(0.25)) if not col_data.isnull().all() else None
            var_info["q3"] = float(col_data.quantile(0.75)) if not col_data.isnull().all() else None
            
            # Histogram data
            if not col_data.isnull().all():
                hist, bin_edges = np.histogram(col_data.dropna(), bins=20)
                var_info["histogram"] = {
                    "counts": hist.tolist(),
                    "bin_edges": bin_edges.tolist()
                }
                var_info["skewness"] = float(col_data.skew()) if len(col_data.dropna()) > 2 else 0
                var_info["kurtosis"] = float(col_data.kurtosis()) if len(col_data.dropna()) > 3 else 0
        else:
            var_info["is_numeric"] = False
            top_values = col_data.value_counts().head(10)
            var_info["top_values"] = [{"value": str(k), "count": int(v)} for k, v in top_values.items()]
        
        variables[col] = var_info
    
    # Correlations (numeric columns only)
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    correlations = {}
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr()
        correlations["pearson"] = {
            "columns": numeric_cols.tolist(),
            "matrix": corr_matrix.fillna(0).values.tolist()
        }
    
    # Alerts
    alerts = []
    for col, var in variables.items():
        if var["missing_percent"] > 50:
            alerts.append({"type": "danger", "column": col, "message": f"High missing values ({var['missing_percent']}%)", "category": "missing"})
        elif var["missing_percent"] > 10:
            alerts.append({"type": "warning", "column": col, "message": f"Missing values ({var['missing_percent']}%)", "category": "missing"})
        
        if var["unique_percent"] == 100 and var["n_unique"] == overview["n_rows"]:
            alerts.append({"type": "info", "column": col, "message": "All values are unique (potential ID column)", "category": "cardinality"})
        elif var["n_unique"] == 1:
            alerts.append({"type": "danger", "column": col, "message": "Constant column (only 1 unique value)", "category": "constant"})
        
        if var.get("is_numeric") and var.get("skewness"):
            if abs(var["skewness"]) > 2:
                alerts.append({"type": "warning", "column": col, "message": f"Highly skewed distribution (skewness: {var['skewness']:.2f})", "category": "skewness"})
    
    if overview["duplicate_percent"] > 10:
        alerts.append({"type": "warning", "column": None, "message": f"High duplicate rows ({overview['duplicate_percent']}%)", "category": "duplicates"})
    
    # Check for high correlations
    if correlations.get("pearson"):
        matrix = np.array(correlations["pearson"]["matrix"])
        cols = correlations["pearson"]["columns"]
        for i in range(len(cols)):
            for j in range(i+1, len(cols)):
                if abs(matrix[i][j]) > 0.9:
                    alerts.append({
                        "type": "warning",
                        "column": f"{cols[i]} & {cols[j]}",
                        "message": f"High correlation ({matrix[i][j]:.2f})",
                        "category": "correlation"
                    })
    
    return {
        "overview": overview,
        "variables": variables,
        "correlations": correlations,
        "alerts": alerts,
        "sample_data": df.head(5).fillna("").to_dict(orient="records")
    }

@api_router.post("/reports/{report_id}/analyze")
async def analyze_report(report_id: str, user: User = Depends(get_current_user)):
    report = await db.reports.find_one({"report_id": report_id, "user_id": user.user_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report["status"] == "completed":
        return {"status": "completed", "profile_data": report["profile_data"]}
    
    # Update status to processing
    await db.reports.update_one({"report_id": report_id}, {"$set": {"status": "processing"}})
    
    try:
        # Get file from storage
        content, _ = get_object(report["storage_path"])
        
        # Use Railway ydata-profiling service if available, else fallback to local
        profile_data = None
        if PROFILING_SERVICE_URL:
            try:
                files = {"file": (report["filename"], content)}
                resp = requests.post(f"{PROFILING_SERVICE_URL}/profile", files=files, timeout=120)
                resp.raise_for_status()
                raw_profile = resp.json()
                # Transform ydata-profiling output to our format
                profile_data = transform_ydata_profile(raw_profile, content, report["file_type"])
                logger.info("Used Railway ydata-profiling service")
            except Exception as e:
                logger.warning(f"Railway service failed, using local: {e}")
        
        if not profile_data:
            profile_data = generate_mock_profile(content, report["file_type"])
        
        # Update report
        await db.reports.update_one(
            {"report_id": report_id},
            {"$set": {
                "status": "completed",
                "profile_data": profile_data,
                "alerts": profile_data.get("alerts", []),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"status": "completed", "profile_data": profile_data}
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        await db.reports.update_one({"report_id": report_id}, {"$set": {"status": "failed"}})
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str, user: User = Depends(get_current_user)):
    report = await db.reports.find_one({"report_id": report_id, "user_id": user.user_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@api_router.get("/reports")
async def list_reports(user: User = Depends(get_current_user)):
    reports = await db.reports.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reports

@api_router.delete("/reports/{report_id}")
async def delete_report(report_id: str, user: User = Depends(get_current_user)):
    result = await db.reports.delete_one({"report_id": report_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted"}

# ============ PUBLIC SHARING ============

@api_router.post("/reports/{report_id}/share")
async def share_report(report_id: str, user: User = Depends(get_current_user)):
    plan = PLANS.get(user.plan, PLANS["free"])
    if not plan.get("export_pdf"):  # Pro feature
        raise HTTPException(status_code=403, detail="Sharing is a Pro feature. Upgrade your plan.")
    
    report = await db.reports.find_one({"report_id": report_id, "user_id": user.user_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    public_token = uuid.uuid4().hex[:16]
    await db.reports.update_one(
        {"report_id": report_id},
        {"$set": {"is_public": True, "public_token": public_token}}
    )
    
    return {"public_token": public_token}

@api_router.get("/public/reports/{public_token}")
async def get_public_report(public_token: str):
    report = await db.reports.find_one({"public_token": public_token, "is_public": True}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not public")
    return report

# ============ COMPARISON ============

@api_router.post("/compare")
async def compare_datasets(report_a_id: str, report_b_id: str, user: User = Depends(get_current_user)):
    plan = PLANS.get(user.plan, PLANS["free"])
    if not plan.get("compare"):
        raise HTTPException(status_code=403, detail="Comparison is a Pro feature. Upgrade your plan.")
    
    report_a = await db.reports.find_one({"report_id": report_a_id, "user_id": user.user_id}, {"_id": 0})
    report_b = await db.reports.find_one({"report_id": report_b_id, "user_id": user.user_id}, {"_id": 0})
    
    if not report_a or not report_b:
        raise HTTPException(status_code=404, detail="One or both reports not found")
    
    if report_a["status"] != "completed" or report_b["status"] != "completed":
        raise HTTPException(status_code=400, detail="Both reports must be analyzed first")
    
    # Generate comparison
    profile_a = report_a["profile_data"]
    profile_b = report_b["profile_data"]
    
    comparison = {
        "overview": {
            "rows_diff": profile_b["overview"]["n_rows"] - profile_a["overview"]["n_rows"],
            "columns_diff": profile_b["overview"]["n_columns"] - profile_a["overview"]["n_columns"],
            "missing_diff": profile_b["overview"]["missing_percent"] - profile_a["overview"]["missing_percent"],
            "duplicates_diff": profile_b["overview"]["duplicate_percent"] - profile_a["overview"]["duplicate_percent"]
        },
        "columns": {
            "added": [c for c in profile_b["variables"] if c not in profile_a["variables"]],
            "removed": [c for c in profile_a["variables"] if c not in profile_b["variables"]],
            "common": [c for c in profile_a["variables"] if c in profile_b["variables"]]
        },
        "changes": []
    }
    
    # Check for significant changes in common columns
    for col in comparison["columns"]["common"]:
        var_a = profile_a["variables"][col]
        var_b = profile_b["variables"][col]
        
        changes = {"column": col, "alerts": []}
        
        missing_change = var_b["missing_percent"] - var_a["missing_percent"]
        if abs(missing_change) > 5:
            status = "danger" if missing_change > 10 else "warning" if missing_change > 0 else "success"
            changes["alerts"].append({
                "type": status,
                "metric": "missing_percent",
                "before": var_a["missing_percent"],
                "after": var_b["missing_percent"],
                "change": missing_change
            })
        
        if var_a.get("is_numeric") and var_b.get("is_numeric"):
            if var_a.get("mean") and var_b.get("mean"):
                mean_change_pct = ((var_b["mean"] - var_a["mean"]) / var_a["mean"] * 100) if var_a["mean"] != 0 else 0
                if abs(mean_change_pct) > 20:
                    changes["alerts"].append({
                        "type": "warning",
                        "metric": "mean",
                        "before": var_a["mean"],
                        "after": var_b["mean"],
                        "change_percent": mean_change_pct
                    })
        
        if changes["alerts"]:
            comparison["changes"].append(changes)
    
    # Create comparison record
    comp_report = ComparisonReport(
        user_id=user.user_id,
        report_a_id=report_a_id,
        report_b_id=report_b_id,
        comparison_data=comparison,
        status="completed"
    )
    await db.comparisons.insert_one(comp_report.model_dump())
    
    return {"comparison_id": comp_report.comparison_id, "comparison": comparison}

# ============ STRIPE PAYMENTS ============

from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

@api_router.post("/checkout")
async def create_checkout(request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    plan_id = body.get("plan")
    origin_url = body.get("origin_url")
    
    if plan_id not in ["pro", "team"]:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url required")
    
    plan = PLANS[plan_id]
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{origin_url}/dashboard?session_id={{CHECKOUT_SESSION_ID}}&upgrade=success"
    cancel_url = f"{origin_url}/pricing"
    
    checkout_request = CheckoutSessionRequest(
        amount=plan["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user.user_id,
            "plan": plan_id,
            "type": "subscription"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create transaction record
    transaction = PaymentTransaction(
        user_id=user.user_id,
        session_id=session.session_id,
        plan=plan_id,
        amount=plan["price"],
        status="initiated"
    )
    await db.payment_transactions.insert_one(transaction.model_dump())
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, user: User = Depends(get_current_user)):
    host_url = "https://data-inspector-18.preview.emergentagent.com"
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and user if paid
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if transaction and transaction.get("status") != "completed":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "completed", "payment_status": "paid"}}
            )
            # Upgrade user plan
            plan_id = status.metadata.get("plan", "pro")
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {"plan": plan_id}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, sig)
        
        if webhook_response.payment_status == "paid":
            user_id = webhook_response.metadata.get("user_id")
            plan = webhook_response.metadata.get("plan", "pro")
            
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"status": "completed", "payment_status": "paid"}}
            )
            
            if user_id:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"plan": plan}}
                )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": True}

# ============ PDF EXPORT ============

from weasyprint import HTML, CSS
from io import BytesIO

def generate_pdf_html(report: dict, profile_data: dict) -> str:
    """Generate HTML for PDF report"""
    overview = profile_data.get("overview", {})
    variables = profile_data.get("variables", {})
    alerts = profile_data.get("alerts", [])
    
    # Build variables table
    vars_rows = ""
    for name, var in list(variables.items())[:20]:
        vars_rows += f"""
        <tr>
            <td class="mono">{name}</td>
            <td>{var.get('type', 'N/A')}</td>
            <td>{var.get('n_unique', 'N/A')}</td>
            <td class="{'text-red' if var.get('missing_percent', 0) > 10 else ''}">{var.get('missing_percent', 0)}%</td>
            <td class="mono">{var.get('mean', '-') if var.get('is_numeric') else '-'}</td>
        </tr>"""
    
    # Build alerts list
    alerts_html = ""
    for alert in alerts[:10]:
        color = "red" if alert.get("type") == "danger" else "orange" if alert.get("type") == "warning" else "blue"
        alerts_html += f'<li class="text-{color}">[{alert.get("column", "Dataset")}] {alert.get("message", "")}</li>'
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Helvetica', sans-serif; margin: 40px; color: #1a1a1a; }}
            h1 {{ color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }}
            h2 {{ color: #333; margin-top: 30px; }}
            .mono {{ font-family: monospace; }}
            .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }}
            .metric {{ background: #f5f5f5; padding: 15px; border-radius: 8px; }}
            .metric-value {{ font-size: 24px; font-weight: bold; color: #4F46E5; }}
            .metric-label {{ font-size: 12px; color: #666; margin-top: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
            th {{ background: #f5f5f5; font-weight: 600; }}
            .text-red {{ color: #ef4444; }}
            .text-orange {{ color: #f59e0b; }}
            .text-blue {{ color: #3b82f6; }}
            ul {{ padding-left: 20px; }}
            li {{ margin: 8px 0; }}
            .footer {{ margin-top: 40px; text-align: center; color: #999; font-size: 12px; }}
        </style>
    </head>
    <body>
        <h1>DataLens Report: {report.get('filename', 'Dataset')}</h1>
        <p style="color: #666;">Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</p>
        
        <h2>Overview</h2>
        <div class="grid">
            <div class="metric">
                <div class="metric-value">{overview.get('n_rows', 0):,}</div>
                <div class="metric-label">Rows</div>
            </div>
            <div class="metric">
                <div class="metric-value">{overview.get('n_columns', 0)}</div>
                <div class="metric-label">Columns</div>
            </div>
            <div class="metric">
                <div class="metric-value">{overview.get('missing_percent', 0)}%</div>
                <div class="metric-label">Missing Values</div>
            </div>
            <div class="metric">
                <div class="metric-value">{overview.get('duplicate_percent', 0)}%</div>
                <div class="metric-label">Duplicates</div>
            </div>
        </div>
        
        <h2>Variables ({len(variables)})</h2>
        <table>
            <thead>
                <tr><th>Name</th><th>Type</th><th>Unique</th><th>Missing</th><th>Mean</th></tr>
            </thead>
            <tbody>{vars_rows}</tbody>
        </table>
        
        <h2>Quality Alerts ({len(alerts)})</h2>
        <ul>{alerts_html if alerts_html else '<li>No quality issues found</li>'}</ul>
        
        <div class="footer">
            <p>Generated by DataLens — Intelligent Data Profiling</p>
        </div>
    </body>
    </html>
    """

@api_router.get("/reports/{report_id}/pdf")
async def export_pdf(report_id: str, user: User = Depends(get_current_user)):
    plan = PLANS.get(user.plan, PLANS["free"])
    if not plan.get("export_pdf"):
        raise HTTPException(status_code=403, detail="PDF export is a Pro feature. Upgrade your plan.")
    
    report = await db.reports.find_one({"report_id": report_id, "user_id": user.user_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report["status"] != "completed" or not report.get("profile_data"):
        raise HTTPException(status_code=400, detail="Report must be analyzed first")
    
    html_content = generate_pdf_html(report, report["profile_data"])
    pdf_buffer = BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    
    filename = f"datalens_{report['filename'].rsplit('.', 1)[0]}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============ STRIPE CUSTOMER PORTAL ============

import stripe

@api_router.post("/billing/portal")
async def create_billing_portal(request: Request, user: User = Depends(get_current_user)):
    """Create Stripe Customer Portal session for subscription management"""
    body = await request.json()
    origin_url = body.get("origin_url")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url required")
    
    if not user.stripe_customer_id:
        # Find customer from payment transactions
        transaction = await db.payment_transactions.find_one(
            {"user_id": user.user_id, "payment_status": "paid"},
            {"_id": 0}
        )
        if not transaction:
            raise HTTPException(status_code=400, detail="No active subscription found")
        
        # Get customer ID from Stripe session
        stripe.api_key = STRIPE_API_KEY
        try:
            session = stripe.checkout.Session.retrieve(transaction["session_id"])
            customer_id = session.customer
            # Save for future use
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {"stripe_customer_id": customer_id}}
            )
        except Exception as e:
            logger.error(f"Failed to get customer: {e}")
            raise HTTPException(status_code=400, detail="Could not retrieve subscription info")
    else:
        customer_id = user.stripe_customer_id
    
    # Create portal session
    stripe.api_key = STRIPE_API_KEY
    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{origin_url}/dashboard"
        )
        return {"url": portal_session.url}
    except Exception as e:
        logger.error(f"Portal creation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to create billing portal")

# ============ MISC ============

@api_router.get("/plans")
async def get_plans():
    return PLANS

@api_router.get("/")
async def root():
    return {"message": "DataLens API v1.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init failed on startup: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
