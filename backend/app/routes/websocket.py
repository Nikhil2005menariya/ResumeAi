"""
WebSocket endpoints for real-time agent status updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import json

from app.agent import run_agent


router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept and store WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        """Remove WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    async def send_message(self, client_id: str, message: dict):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                print(f"Error sending to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        disconnected = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(client_id)
        
        for client_id in disconnected:
            self.disconnect(client_id)


manager = ConnectionManager()


@router.websocket("/ws/agent/{user_id}")
async def websocket_agent_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time agent status updates.
    
    Clients connect to this endpoint and receive status updates as the agent
    processes their requests.
    """
    client_id = f"{user_id}:{session_id or 'default'}"
    
    await manager.connect(websocket, client_id)
    
    try:
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to agent status stream",
            "client_id": client_id
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                
                elif message.get("type") == "generate_resume":
                    # Run agent with WebSocket for status updates
                    result = await run_agent(
                        user_id=user_id,
                        task_type="resume_generation",
                        job_description=message.get("job_description"),
                        user_instructions=message.get("instructions"),
                        session_id=session_id,
                        websocket=websocket
                    )
                    
                    # Send final result
                    await websocket.send_json({
                        "type": "task_complete",
                        "result": {
                            "resume_id": result.get("resume_id"),
                            "status": result.get("status"),
                            "message": result.get("status_message"),
                            "has_pdf": result.get("pdf_data") is not None
                        }
                    })
                
                elif message.get("type") == "refine_resume":
                    result = await run_agent(
                        user_id=user_id,
                        task_type="resume_refinement",
                        user_message=message.get("message"),
                        current_resume_id=message.get("resume_id"),
                        session_id=session_id,
                        websocket=websocket
                    )
                    
                    await websocket.send_json({
                        "type": "task_complete",
                        "result": {
                            "status": result.get("status"),
                            "message": result.get("status_message"),
                            "has_pdf": result.get("pdf_data") is not None
                        }
                    })
                
                elif message.get("type") == "search_jobs":
                    result = await run_agent(
                        user_id=user_id,
                        task_type="job_search",
                        search_query=message.get("query"),
                        session_id=session_id,
                        websocket=websocket
                    )
                    
                    await websocket.send_json({
                        "type": "task_complete",
                        "result": {
                            "jobs": result.get("jobs", []),
                            "status": result.get("status"),
                            "message": result.get("status_message")
                        }
                    })
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
    
    finally:
        manager.disconnect(client_id)


@router.websocket("/ws/status")
async def websocket_status_endpoint(websocket: WebSocket):
    """
    General status WebSocket for system-wide notifications.
    """
    client_id = f"status_{id(websocket)}"
    await manager.connect(websocket, client_id)
    
    try:
        await websocket.send_json({
            "type": "connection_established",
            "message": "Connected to status stream"
        })
        
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    finally:
        manager.disconnect(client_id)
