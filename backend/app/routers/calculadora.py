from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Engine

from app.core_logic import calculadora
from app.database import engine
from app.repository import cargar_consultas_df, cargar_planes_dict
from app.schemas.calculadora import CalcularRequest, CompararRequest, DesgloseResponse, MedioPagoOut

router = APIRouter(prefix="/api/calculadora", tags=["calculadora"])


def _get_engine() -> Engine:
    return engine


def _precio_lista_vigente(df, producto_nombre: str):
    fila_producto = df[df["producto_nombre"] == producto_nombre].sort_values("fecha", ascending=False)
    if fila_producto.empty:
        raise HTTPException(status_code=404, detail=f"Producto '{producto_nombre}' no encontrado.")
    return fila_producto["precio_lista"].iloc[0]


@router.post("/calcular", response_model=DesgloseResponse)
def calcular(payload: CalcularRequest, db_engine: Engine = Depends(_get_engine)):
    df = cargar_consultas_df(db_engine)
    tabla_planes = cargar_planes_dict(db_engine)

    precio_lista = _precio_lista_vigente(df, payload.producto_nombre)

    descuento_os = calculadora.obtener_descuento_os(payload.obra_social, tabla_planes)
    descuento_banco = calculadora.obtener_descuento_banco(payload.metodo_pago)

    precio_tras_os = calculadora.calcular_precio_final(precio_lista, descuento_os, 0.0)
    precio_final = calculadora.calcular_precio_final(precio_lista, descuento_os, descuento_banco)

    ahorro_total = precio_lista - precio_final
    descuento_total_pct = (ahorro_total / precio_lista * 100) if precio_lista else 0

    return DesgloseResponse(
        producto_nombre=payload.producto_nombre,
        precio_lista=int(precio_lista),
        obra_social=payload.obra_social,
        descuento_os=descuento_os,
        metodo_pago=payload.metodo_pago,
        descuento_banco=descuento_banco,
        precio_tras_os=precio_tras_os,
        precio_final=precio_final,
        ahorro_total=ahorro_total,
        descuento_total_pct=round(descuento_total_pct, 1),
    )


@router.post("/comparar-medios-pago", response_model=list[MedioPagoOut])
def comparar_medios_pago(payload: CompararRequest, db_engine: Engine = Depends(_get_engine)):
    df = cargar_consultas_df(db_engine)
    tabla_planes = cargar_planes_dict(db_engine)

    precio_lista = _precio_lista_vigente(df, payload.producto_nombre)

    tabla = calculadora.buscar_mejor_medio_pago(precio_lista, payload.obra_social, tabla_planes)

    return [
        MedioPagoOut(
            metodo_pago=fila["metodo_pago"],
            descuento_banco=fila["descuento_banco"],
            precio_final=int(fila["precio_final"]),
            ahorro=int(fila["ahorro"]),
        )
        for _, fila in tabla.iterrows()
    ]
