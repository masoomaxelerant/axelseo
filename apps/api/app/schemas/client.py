import uuid
from datetime import datetime

from pydantic import BaseModel


class ClientCreate(BaseModel):
    name: str
    domain: str
    notes: str | None = None


class ClientResponse(BaseModel):
    id: uuid.UUID
    name: str
    domain: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
