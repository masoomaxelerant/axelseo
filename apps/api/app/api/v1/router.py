from fastapi import APIRouter

from app.api.v1.endpoints import audits, clients, gsc, projects

api_router = APIRouter()
api_router.include_router(audits.router, prefix="/audits", tags=["audits"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(gsc.router, prefix="/integrations/gsc", tags=["google-search-console"])
