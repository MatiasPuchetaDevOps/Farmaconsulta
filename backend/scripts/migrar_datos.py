"""
migrar_datos.py - FarmaConsulta

Migración one-shot: carga los CSV ya limpios de data/processed/ (generados
por el main.py original) a las tablas 'consultas' y 'planes_descuento' de
Postgres. Se corre una sola vez, después de aplicar las migraciones de
Alembic (`alembic upgrade head`).

Corre FUERA del contenedor Docker del backend, con el repo completo
disponible, porque reutiliza src/limpieza.py (que no forma parte de la
imagen del backend) para el control de calidad de validar_formula_precio.

Uso:
    python backend/scripts/migrar_datos.py           # aborta si 'consultas' ya tiene filas
    python backend/scripts/migrar_datos.py --force    # migra igual, agrega filas de nuevo
"""

import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

from src import limpieza  # noqa: E402 (import tras ajustar sys.path)

from app.database import engine  # noqa: E402

RUTA_CONSULTAS = REPO_ROOT / "data" / "processed" / "farmacia_limpia.csv"
RUTA_PLANES = REPO_ROOT / "data" / "processed" / "planes_descuento.csv"


def migrar_planes():
    df = pd.read_csv(RUTA_PLANES)
    df.to_sql("planes_descuento", engine, if_exists="append", index=False)
    print(f"'planes_descuento': {len(df)} filas migradas.")


def migrar_consultas():
    df = pd.read_csv(RUTA_CONSULTAS)
    df["fecha"] = pd.to_datetime(df["fecha"])

    # Control de calidad: recalcula precio_final y lo compara contra el dato cargado
    limpieza.validar_formula_precio(df)

    # dia_semana / dia_semana_nombre son derivadas de 'fecha': se recalculan en
    # runtime (ver app/repository.py), no se guardan en la tabla
    df = df.drop(columns=["dia_semana", "dia_semana_nombre"])
    df = df.rename(columns={"descuento_OS": "descuento_os"})

    df.to_sql("consultas", engine, if_exists="append", index=False)

    with engine.connect() as conn:
        total_db = conn.exec_driver_sql("SELECT COUNT(*) FROM consultas").scalar_one()

    print(f"'consultas': {len(df)} filas migradas. Total en la tabla: {total_db}.")
    if total_db != len(df):
        print("ADVERTENCIA: el conteo en la tabla no coincide con las filas migradas en esta corrida.")


def main():
    forzar = "--force" in sys.argv

    with engine.connect() as conn:
        filas_existentes = conn.exec_driver_sql("SELECT COUNT(*) FROM consultas").scalar_one()

    if filas_existentes > 0 and not forzar:
        print(f"La tabla 'consultas' ya tiene {filas_existentes} filas. Usá --force para migrar igual.")
        return

    migrar_planes()
    migrar_consultas()


if __name__ == "__main__":
    main()
