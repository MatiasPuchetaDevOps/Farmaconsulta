import pandas as pd
from sqlalchemy import Engine

from app.core_logic.limpieza import crear_variables_temporales


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
