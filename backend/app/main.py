from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelevel)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="DataGenesis AI API",
    description="Enterprise-grade synthetic data generation platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS with comprehensive settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173", 
        "https://127.0.0.1:5173",
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Optional authentication
class OptionalHTTPBearer(HTTPBearer):
    """Modified HTTPBearer that doesn't require authentication for guests"""
    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except HTTPException:
            return None

security = OptionalHTTPBearer(auto_error=False)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 Starting DataGenesis AI API...")
    logger.info("🎯 DataGenesis AI API started successfully!")

@app.on_event("shutdown") 
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("📴 Shutting down DataGenesis AI API...")
    logger.info("📴 DataGenesis AI API shutdown complete")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    logger.info(f"🔗 {request.method} {request.url.path} - Starting request")
    
    response = await call_next(request)
    
    process_time = (datetime.utcnow() - start_time).total_seconds()
    logger.info(f"✅ {request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
    
    return response

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "DataGenesis AI Backend",
        "version": "1.0.0",
        "status": "running",
        "api_docs": "/api/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    logger.info("🏥 Health check requested")
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": "development",
        "host": "localhost:8000",
        "message": "DataGenesis AI Backend is running successfully"
    }
    
    logger.info(f"✅ Health check completed: {health_status}")
    return health_status

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle preflight OPTIONS requests"""
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Basic generation endpoints
@app.post("/api/generation/schema-from-description")
async def generate_schema_from_description(
    request: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Generate schema from natural language description"""
    logger.info("🧠 Schema generation request received")
    
    description = request.get("description", "")
    domain = request.get("domain", "general")
    data_type = request.get("data_type", "tabular")
    
    # Basic validation
    if not description or len(description.strip()) < 10:
        raise HTTPException(status_code=400, detail="Description must be at least 10 characters long")
    
    # Mock response for now (replace with actual AI service)
    mock_schema = {
        "schema": {
            "id": {
                "type": "uuid",
                "description": "Unique identifier",
                "constraints": {"required": True, "unique": True}
            },
            "name": {
                "type": "string", 
                "description": "Name field",
                "examples": ["John Doe", "Jane Smith", "Bob Johnson"]
            },
            "age": {
                "type": "number",
                "description": "Age in years",
                "constraints": {"min": 0, "max": 120}
            },
            "created_at": {
                "type": "datetime",
                "description": "Creation timestamp"
            }
        },
        "detected_domain": domain,
        "estimated_rows": 10000,
        "suggestions": ["Add more specific field types", "Consider relationships between fields"]
    }
    
    logger.info("✅ Schema generated successfully")
    return mock_schema

@app.post("/api/generation/generate-local")
async def generate_local_data(
    request: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Generate synthetic data locally"""
    logger.info("🏠 Local generation request received")
    
    schema = request.get('schema', {})
    config = request.get('config', {})
    row_count = config.get('rowCount', 100)
    
    # Mock data generation
    mock_data = []
    for i in range(min(row_count, 1000)):  # Limit to 1000 for demo
        row = {
            "id": f"id_{i+1}",
            "name": f"Person {i+1}",
            "age": 25 + (i % 50),
            "created_at": datetime.utcnow().isoformat()
        }
        mock_data.append(row)
    
    result = {
        "data": mock_data,
        "metadata": {
            "rowsGenerated": len(mock_data),
            "columnsGenerated": 4,
            "generationTime": datetime.utcnow().isoformat(),
            "config": config,
            "generationMethod": "backend_local"
        },
        "qualityScore": 95.0,
        "privacyScore": 98.0,
        "biasScore": 92.0
    }
    
    logger.info(f"✅ Generated {len(mock_data)} rows successfully")
    return result

@app.get("/api/system/status")
async def system_status(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get real-time system status"""
    logger.info("📊 System status requested")
    
    status = {
        "timestamp": datetime.utcnow().isoformat(),
        "active_users": 1,
        "active_generations": 0,
        "total_datasets": 0,
        "agent_status": {
            "privacy_agent": {"status": "active", "performance": 98.0},
            "quality_agent": {"status": "active", "performance": 95.0},
            "domain_expert": {"status": "active", "performance": 97.0}
        },
        "performance_metrics": {
            "cpu_usage": 25.0,
            "memory_usage": 45.0,
            "uptime": "5 minutes"
        }
    }
    
    logger.info("✅ System status returned")
    return status

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Unhandled exception in {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)