from pydantic import BaseModel, Field


class ClienteOut(BaseModel):
    id: int
    nombre: str
    telefono: str | None = None
    activo: bool = True

    model_config = {"from_attributes": True}


class ClienteIn(BaseModel):
    nombre: str = Field(min_length=1)
    telefono: str | None = None
    activo: bool = True
