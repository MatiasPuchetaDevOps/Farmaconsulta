from pydantic import BaseModel, Field


class UsuarioAdminOut(BaseModel):
    id: int
    username: str
    nombre_completo: str | None = None
    activo: bool
    es_admin: bool

    model_config = {"from_attributes": True}


class UsuarioCrear(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    nombre_completo: str | None = None
    es_admin: bool = False


class UsuarioEditar(BaseModel):
    nombre_completo: str | None = None
    activo: bool | None = None
    es_admin: bool | None = None
    password: str | None = Field(default=None, min_length=6)
