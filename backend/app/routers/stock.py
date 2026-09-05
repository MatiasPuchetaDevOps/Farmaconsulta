from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Engine

from app.core_logic import calculadora
from app.database import engine
from app.repository import cargar_productos_df
from app.schemas.stock import AlternativaOut, StockOut

router = APIRouter(prefix="/api/stock", tags=["stock"])


def _get_engine() -> Engine:
    return engine


@router.get("/{producto_nombre}", response_model=StockOut)
def consultar_stock(producto_nombre: str, umbral: int = 10, db_engine: Engine = Depends(_get_engine)):
    df = cargar_productos_df(db_engine)

    registros = df[df["producto_nombre"] == producto_nombre]
    if registros.empty:
        raise HTTPException(status_code=404, detail=f"Producto '{producto_nombre}' no encontrado.")

    # Igual que en app.py: el registro más reciente define el stock/categoría "actual"
    registro_reciente = registros.sort_values("fecha", ascending=False).iloc[0]
    stock_actual = int(registro_reciente["stock_disponible"])
    categoria = registro_reciente["categoria"]

    # verificar_stock ya trae la lógica de umbral y de búsqueda de alternativas, sin modificar
    alternativas_df = calculadora.verificar_stock(df, producto_nombre, umbral=umbral)

    alternativas = []
    if alternativas_df is not None:
        alternativas = [
            AlternativaOut(producto_nombre=fila["producto_nombre"], stock_disponible=int(fila["stock_disponible"]))
            for _, fila in alternativas_df.iterrows()
        ]

    return StockOut(
        producto_nombre=producto_nombre,
        stock_actual=stock_actual,
        categoria=categoria,
        umbral=umbral,
        alerta=stock_actual <= umbral,
        alternativas=alternativas,
    )
