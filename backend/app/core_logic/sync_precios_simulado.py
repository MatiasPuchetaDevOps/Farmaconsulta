"""
Módulo sync_precios_simulado - FarmaConsulta

Simula una actualización de precios contra una base de datos de droguería
(tipo Alfa Beta) sin conectar contra ningún servicio real: aplica una
variación aleatoria dentro de un rango a cada producto, para poder demostrar
el flujo de sincronización (preview -> confirmar) sin integración externa.
"""

import random

from app.models import Producto


def generar_variaciones(productos: list[Producto], pct_min: float = -5.0, pct_max: float = 10.0) -> list[dict]:
    """
    Genera una propuesta de nuevo precio por producto, sin tocar la base de datos.

    Parámetros:
        productos (list[Producto]): productos activos a los que se les va a
            proponer un nuevo precio.
        pct_min / pct_max (float): rango de variación porcentual (puede ser
            negativo para bajas de precio).

    Devuelve:
        list[dict] con producto_id, producto_nombre, precio_anterior,
        variacion_pct (redondeado a 2 decimales) y precio_nuevo.
    """
    propuesta = []
    for producto in productos:
        variacion_pct = round(random.uniform(pct_min, pct_max), 2)
        precio_nuevo = max(0, round(producto.precio_lista * (1 + variacion_pct / 100)))
        propuesta.append(
            {
                "producto_id": producto.id,
                "producto_nombre": producto.producto_nombre,
                "precio_anterior": producto.precio_lista,
                "variacion_pct": variacion_pct,
                "precio_nuevo": precio_nuevo,
            }
        )
    return propuesta
