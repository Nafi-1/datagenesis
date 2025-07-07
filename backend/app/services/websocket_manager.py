from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept and store WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"🔌 WebSocket connected: {client_id}")
        
        await self.send_personal_message(
            json.dumps({
                "type": "connection_established",
                "client_id": client_id,
                "message": "Connected to DataGenesis AI",
                "timestamp": asyncio.get_event_loop().time()
            }),
            client_id
        )
        
    def disconnect(self, client_id: str):
        """Remove WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"🔌 WebSocket disconnected: {client_id}")
            
    async def send_personal_message(self, message: str, client_id: str):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"❌ Failed to send message to {client_id}: {e}")
                # Connection might be closed, remove it
                self.disconnect(client_id)
                
    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
            
        disconnected = []
        
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"❌ Failed to broadcast to {client_id}: {e}")
                disconnected.append(client_id)
                
        # Clean up disconnected clients
        for client_id in disconnected:
            self.disconnect(client_id)
            
    async def send_generation_update(self, job_id: str, update: Dict):
        """Send generation progress update to all clients"""
        message = json.dumps({
            "type": "generation_progress",
            "job_id": job_id,
            "data": update
        })
        await self.broadcast(message)
        
    async def send_agent_status(self, agent_updates: Dict):
        """Send agent status updates"""
        message = json.dumps({
            "type": "agent_status",
            "data": agent_updates
        })
        await self.broadcast(message)
        
    async def send_system_alert(self, alert: Dict):
        """Send system-wide alerts"""
        message = json.dumps({
            "type": "system_alert",
            "data": alert
        })
        await self.broadcast(message)
        
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
        
    def get_connected_clients(self) -> List[str]:
        """Get list of connected client IDs"""
        return list(self.active_connections.keys())