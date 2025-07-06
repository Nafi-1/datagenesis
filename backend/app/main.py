from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis
import json
from datetime import datetime
import asyncio
import uvicorn
import logging
import sys

from .config import settings
from .routes import auth, datasets, generation, analytics, agents
from .websocket_manager import ConnectionManager
from .services.redis_service import RedisService
from .services.supabase_service import SupabaseService
from .middleware.auth import verify_token

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
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

# Configure CORS with detailed settings
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
        "https://*.vercel.app",
        "https://*.netlify.app",
        "*"  # Allow all origins for development - remove in production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add preflight OPTIONS handler
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle preflight OPTIONS requests"""
    return {}

# Optional authentication - allow unauthenticated access for guest users
from fastapi.security import HTTPBearer
from fastapi import Request, HTTPException

class OptionalHTTPBearer(HTTPBearer):
    """Modified HTTPBearer that doesn't require authentication for guests"""
    async def __call__(self, request: Request):
        try:
            return await super().__call__(request)
        except HTTPException:
            # Return None for unauthenticated requests (guests)
            return None

# Initialize services
redis_service = RedisService()
supabase_service = SupabaseService()
manager = ConnectionManager()

# Optional security for guest access
security = OptionalHTTPBearer(auto_error=False)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(generation.router, prefix="/api/generation", tags=["generation"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("🚀 Starting DataGenesis AI API...")
    
    try:
        await redis_service.initialize()
        logger.info("✅ Redis service initialized")
    except Exception as e:
        logger.warning(f"⚠️ Redis initialization failed: {e}")
    
    try:
        await supabase_service.initialize()
        logger.info("✅ Supabase service initialized")
    except Exception as e:
        logger.warning(f"⚠️ Supabase initialization failed: {e}")
    
    logger.info("🎯 DataGenesis AI API started successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("📴 Shutting down DataGenesis AI API...")
    try:
        await redis_service.close()
        logger.info("✅ Redis service closed")
    except:
        pass
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
    start_time = datetime.utcnow()
    logger.info(f"🏥 Health check requested at {start_time}")
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": "development",
        "host": "localhost:8000",
        "services": {}
    }
    
    # Check Redis
    try:
        redis_healthy = await redis_service.ping()
        health_status["services"]["redis"] = "healthy" if redis_healthy else "unhealthy"
    except Exception as e:
        health_status["services"]["redis"] = f"error: {str(e)}"
    
    # Check Supabase
    try:
        supabase_healthy = await supabase_service.health_check()
        health_status["services"]["supabase"] = "healthy" if supabase_healthy else "unhealthy"
    except Exception as e:
        health_status["services"]["supabase"] = f"error: {str(e)}"
    
    logger.info(f"✅ Health check completed: {health_status}")
    return health_status

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time updates"""
    logger.info(f"🔌 WebSocket connection requested for client: {client_id}")
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            logger.info(f"📨 WebSocket message from {client_id}: {data}")
            await manager.send_personal_message(f"Echo: {data}", client_id)
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected for client: {client_id}")
        manager.disconnect(client_id)
        await manager.broadcast(f"Client {client_id} disconnected")

@app.get("/api/system/status")
async def system_status(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get real-time system status"""
    logger.info("📊 System status requested")
    
    # Allow both authenticated users and guests
    user = None
    if credentials:
        try:
            user = await verify_token(credentials.credentials)
        except:
            pass
    
    # Get real-time metrics from Redis
    try:
        metrics = await redis_service.get_system_metrics()
    except:
        metrics = {}
    
    status = {
        "timestamp": datetime.utcnow().isoformat(),
        "active_users": metrics.get("active_users", 0),
        "active_generations": metrics.get("active_generations", 0),
        "total_datasets": metrics.get("total_datasets", 0),
        "agent_status": await redis_service.get_agent_status() if redis_service else {},
        "performance_metrics": await redis_service.get_performance_metrics() if redis_service else {},
        "user_type": "guest" if (user and user.get("is_guest")) else "authenticated" if user else "anonymous"
    }
    
    logger.info(f"✅ System status returned: {status}")
    return status

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Unhandled exception in {request.method} {request.url.path}: {str(exc)}")
    return {"error": "Internal server error", "detail": str(exc)}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # Listen on all interfaces
        port=8000,
        reload=True,
        log_level="info"
    )