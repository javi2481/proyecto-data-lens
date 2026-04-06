from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ydata_profiling import ProfileReport
import pandas as pd
import io
import json

app = FastAPI(title="DataLens Profiling Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health():
    return {"status": "ok", "service": "ydata-profiling"}

@app.post("/profile")
async def profile_data(file: UploadFile = File(...), minimal: bool = True):
    """
    Analyze uploaded file and return profiling data as JSON.
    
    - minimal=True: Faster analysis, good for files up to 100K rows
    - minimal=False: Full analysis with more statistics
    """
    try:
        content = await file.read()
        ext = file.filename.split('.')[-1].lower()
        
        # Parse file based on extension
        if ext == 'csv':
            df = pd.read_csv(io.BytesIO(content))
        elif ext in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(content))
        elif ext == 'json':
            df = pd.read_json(io.BytesIO(content))
        elif ext == 'parquet':
            df = pd.read_parquet(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        
        # Generate profile report
        report = ProfileReport(
            df, 
            minimal=minimal,
            progress_bar=False,
            explorative=False,
            correlations={
                "pearson": {"calculate": True},
                "spearman": {"calculate": False},
                "kendall": {"calculate": False},
                "phi_k": {"calculate": False},
            }
        )
        
        # Return as JSON dict
        return json.loads(report.to_json())
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compare")
async def compare_datasets(
    file_a: UploadFile = File(...),
    file_b: UploadFile = File(...)
):
    """Compare two datasets and return difference report."""
    try:
        # Read both files
        content_a = await file_a.read()
        content_b = await file_b.read()
        
        ext_a = file_a.filename.split('.')[-1].lower()
        ext_b = file_b.filename.split('.')[-1].lower()
        
        # Parse files
        df_a = pd.read_csv(io.BytesIO(content_a)) if ext_a == 'csv' else pd.read_excel(io.BytesIO(content_a))
        df_b = pd.read_csv(io.BytesIO(content_b)) if ext_b == 'csv' else pd.read_excel(io.BytesIO(content_b))
        
        # Generate comparison
        report_a = ProfileReport(df_a, minimal=True, progress_bar=False)
        report_b = ProfileReport(df_b, minimal=True, progress_bar=False)
        
        comparison = report_a.compare(report_b)
        
        return json.loads(comparison.to_json())
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
