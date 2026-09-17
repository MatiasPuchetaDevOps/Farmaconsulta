from datetime import date, datetime

from pydantic import BaseModel, Field


class PedidoItemIn(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    receta_id: int | None = None


class PedidoIn(BaseModel):
    cliente_nombre: str = Field(min_length=1)
    cliente_tel: str = ""
    obra_social: str
    plan_afiliado: str = ""
    metodo_pago: str
    items: list[PedidoItemIn] = Field(min_length=1)


class PedidoItemOut(BaseModel):
    producto_id: int
    producto_nombre: str
    cantidad: int
    precio_lista: int
    descuento_os: float
    descuento_banco: float
    precio_final_unitario: int
    subtotal: int
    receta_id: int | None = None

    model_config = {"from_attributes": True}


class PedidoOut(BaseModel):
    id: int
    cliente_nombre: str
    cliente_tel: str | None = None
    obra_social: str
    plan_afiliado: str | None = None
    metodo_pago: str
    estado: str
    total: int
    caja_sesion_id: int | None = None
    comprobante_numero: str | None = None
    cae: str | None = None
    cae_vencimiento: date | None = None
    cae_estado: str
    cae_motivo_rechazo: str | None = None
    cae_intentos: int
    validacion_os_resultado: str | None = None
    validacion_os_motivo: str | None = None
    creado_en: datetime
    cancelado_en: datetime | None = None
    items: list[PedidoItemOut]

    model_config = {"from_attributes": True}
