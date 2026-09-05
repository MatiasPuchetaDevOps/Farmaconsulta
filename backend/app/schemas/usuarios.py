from pydantic import BaseModel, Field


class UsuarioAdminOut(BaseModel):
    id: int
    username: str
    nombre_completo: str | None = None
    activo: bool

    model_config = {"from_attributes": True}


class UsuarioCrear(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    nombre_completo: str | None = None


class UsuarioEditar(BaseModel):
    nombre_completo: str | None = None
    activo: bool | None = None
    password: str | None = Field(default=None, min_length=6)
