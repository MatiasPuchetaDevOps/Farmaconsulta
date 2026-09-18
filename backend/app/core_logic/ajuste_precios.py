"""
Módulo ajuste_precios - FarmaConsulta

Calcula la propuesta de nuevo precio para un ajuste manual: el usuario elige
un único porcentaje (positivo para aumento, negativo para baja) y se aplica
por igual a todos los productos filtrados, sin ningún componente aleatorio.
"""

from app.models import Producto


def generar_ajuste(productos: list[Producto], pct: float) -> list[dict]:
    """
    Genera una propuesta de nuevo precio por producto, sin tocar la base de datos.

    Parámetros:
        productos (list[Producto]): productos activos a los que se les va a
            proponer un nuevo precio.
        pct (float): porcentaje de ajuste a aplicar por igual a todos los
            productos (puede ser negativo para una baja de precio).

    Devuelve:
        list[dict] con producto_id, producto_nombre, precio_anterior,
        variacion_pct (igual a `pct` para todos los ítems) y precio_nuevo.
    """
    propuesta = []
    for producto in productos:
        precio_nuevo = max(0, round(producto.precio_lista * (1 + pct / 100)))
        propuesta.append(
            {
                "producto_id": producto.id,
                "producto_nombre": producto.producto_nombre,
                "precio_anterior": producto.precio_lista,
                "variacion_pct": pct,
                "precio_nuevo": precio_nuevo,
            }
        )
    return propuesta
