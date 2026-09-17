from typing import TypeVar

import pandas as pd
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core_logic.limpieza import crear_variables_temporales
from app.models import Cliente

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


def lockear_filas_ordenadas(db: Session, modelo: type[ModeloConId], ids: list[int]) -> dict[int, ModeloConId | None]:
    """
    Lockea filas de `modelo` por id, siempre en orden ascendente, para que dos
    transacciones que tocan filas superpuestas (pedidos.py, sincronizacion.py)
    nunca tomen los locks en orden cruzado y deadlockeen.
    """
    filas: dict[int, ModeloConId | None] = {}
    for id_ in sorted(set(ids)):
        filas[id_] = db.query(modelo).filter(modelo.id == id_).with_for_update().first()
    return filas
