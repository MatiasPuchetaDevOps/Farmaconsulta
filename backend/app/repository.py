from datetime import date
from typing import TypeVar

import pandas as pd
from sqlalchemy import Engine, func
from sqlalchemy.orm import Session

from app.core_logic import calculadora
from app.core_logic.limpieza import crear_variables_temporales
from app.models import Cliente, Consulta, Producto

ModeloConId = TypeVar("ModeloConId")


def cargar_consultas_df(engine: Engine) -> pd.DataFrame:
    """
    Lee la tabla 'consultas' completa como DataFrame y recrea 'dia_semana' /
    'dia_semana_nombre' (no se guardan en la DB por ser derivadas de 'fecha'),
    para que el DataFrame quede con las mismas columnas que ya esperan
    calculadora.py y descriptivo.py.
    """
    df = pd.read_sql("SELECT * FROM consultas", engine)
    df["fecha"] = pd.to_datetime(df["fecha"])
    df = df.rename(columns={"descuento_os": "descuento_OS"})
    df = crear_variables_temporales(df)
    return df


def cargar_planes_dict(engine: Engine) -> dict[str, float]:
    df = pd.read_sql("SELECT obra_social, descuento_os FROM planes_descuento", engine)
    return dict(zip(df["obra_social"], df["descuento_os"].astype(float)))


def cargar_bancos_dict(engine: Engine) -> dict[str, float]:
    df = pd.read_sql("SELECT banco, descuento_banco FROM banco_promociones", engine)
    return dict(zip(df["banco"], df["descuento_banco"].astype(float)))


def cargar_productos_df(engine: Engine) -> pd.DataFrame:
    """
    Lee el catálogo vigente ('productos', solo activos) como DataFrame, con una
    columna 'fecha' sintética (= actualizado_en) para poder seguir reusando
    calculadora.py sin modificarlo: sus funciones (verificar_stock, etc.) esperan
    una columna 'fecha' para quedarse con el registro "más reciente" de un
    producto, aunque acá ya haya un solo registro vigente por producto.
    """
    df = pd.read_sql("SELECT * FROM productos", engine)
    df = df[df["activo"] == True]  # noqa: E712 -- comparación explícita, no truthiness
    df["fecha"] = pd.to_datetime(df["actualizado_en"])
    return df


def buscar_o_crear_cliente(db: Session, nombre: str, telefono: str) -> Cliente:
    """
    Helper con Session ORM (el resto del módulo trabaja con Engine + pandas para
    lecturas); se comparte acá porque tanto la carga de consultas como la de
    pedidos necesitan el mismo find-or-create de cliente.
    """
    nombre_normalizado = nombre.strip().title()
    telefono_normalizado = telefono.strip() or None

    query = db.query(Cliente).filter(Cliente.nombre == nombre_normalizado)
    if telefono_normalizado:
        query = query.filter(Cliente.telefono == telefono_normalizado)
    else:
        query = query.filter(Cliente.telefono.is_(None))

    cliente = query.first()
    if cliente is not None:
        return cliente

    cliente = Cliente(nombre=nombre_normalizado, telefono=telefono_normalizado)
    db.add(cliente)
    db.flush()  # asigna cliente.id sin cerrar la transacción del llamador
    return cliente


def crear_consulta(
    db: Session,
    *,
    producto: Producto,
    obra_social: str,
    plan_afiliado: str | None,
    metodo_pago: str,
    fecha: date,
    origen: str,
    cliente_ref_id: int | None,
    cliente_nombre: str,
    cliente_tel: str | None,
) -> Consulta:
    """
    Arma (sin agregar a la sesión ni commitear) una fila de Consulta con el
    precio final ya calculado. Se comparte entre el registro de mostrador
    (admin.py, origen="mostrador") y la consulta pública sin login
    (consultas_publicas.py, origen="publico") para no duplicar el cálculo de
    descuentos ni la lógica de numeración de ids.
    """
    db_engine = db.get_bind()
    tabla_planes = cargar_planes_dict(db_engine)
    tabla_bancos = cargar_bancos_dict(db_engine)

    descuento_os = calculadora.obtener_descuento_os(obra_social, tabla_planes)
    descuento_banco = calculadora.obtener_descuento_banco(metodo_pago, tabla_bancos)
    precio_final = calculadora.calcular_precio_final(producto.precio_lista, descuento_os, descuento_banco)
    banco_promocion = f"{metodo_pago.strip().title()} - Promoción bancaria" if descuento_banco > 0 else "Sin Promo"

    siguiente_id_consulta = (db.query(func.coalesce(func.max(Consulta.id_consulta), 0)).scalar() or 0) + 1
    siguiente_cliente_id = (db.query(func.coalesce(func.max(Consulta.cliente_id), 0)).scalar() or 0) + 1

    return Consulta(
        id_consulta=siguiente_id_consulta,
        fecha=fecha,
        cliente_id=siguiente_cliente_id,
        cliente_ref_id=cliente_ref_id,
        cliente_nombre=cliente_nombre,
        cliente_tel=cliente_tel or "",
        obra_social=obra_social,
        plan_afiliado=(plan_afiliado or "").strip(),
        producto_id=producto.id,
        producto_nombre=producto.producto_nombre,
        droga_generica=producto.droga_generica or "Droga Genérica",
        precio_lista=producto.precio_lista,
        descuento_os=descuento_os,
        metodo_pago=metodo_pago,
        descuento_banco=descuento_banco,
        banco_promocion=banco_promocion,
        stock_disponible=producto.stock_disponible,
        categoria=producto.categoria,
        requiere_receta=producto.requiere_receta,
        precio_final=precio_final,
        origen=origen,
    )


def lockear_filas_ordenadas(db: Session, modelo: type[ModeloConId], ids: list[int]) -> dict[int, ModeloConId | None]:
    """
    Lockea filas de `modelo` por id, siempre en orden ascendente, para que dos
    transacciones que tocan filas superpuestas (pedidos.py, ajuste_precios.py)
    nunca tomen los locks en orden cruzado y deadlockeen.
    """
    filas: dict[int, ModeloConId | None] = {}
    for id_ in sorted(set(ids)):
        filas[id_] = db.query(modelo).filter(modelo.id == id_).with_for_update().first()
    return filas
