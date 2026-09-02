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
