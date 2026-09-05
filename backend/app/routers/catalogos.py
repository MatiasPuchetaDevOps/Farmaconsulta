from fastapi import APIRouter, Depends
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app.models import Producto
from app.repository import cargar_consultas_df, cargar_planes_dict
from app.schemas.catalogos import ProductoOut

router = APIRouter(prefix="/api/catalogos", tags=["catalogos"])

# Mismos 8 métodos de pago que compara calculadora.buscar_mejor_medio_pago
METODOS_PAGO = [
    "Efectivo",
    "Débito",
    "Banco Provincia",
    "Billetera Virtual (Modo/Mercado Pago)",
    "Macro",
    "Galicia",
    "Santander",
    "Nación",
]


def _get_engine() -> Engine:
    return engine


@router.get("/productos", response_model=list[ProductoOut])
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).filter(Producto.activo.is_(True)).order_by(Producto.producto_nombre).all()


@router.get("/obras-sociales", response_model=list[str])
def listar_obras_sociales(db_engine: Engine = Depends(_get_engine)):
    df = cargar_consultas_df(db_engine)
    tabla_planes = cargar_planes_dict(db_engine)

    todas = set(df["obra_social"].unique()) | set(tabla_planes.keys())
    prioritarias = [nombre for nombre in ["Pami", "Particular"] if nombre in todas]
    resto = sorted(todas - set(prioritarias))

    return prioritarias + resto


@router.get("/metodos-pago", response_model=list[str])
def listar_metodos_pago():
    return METODOS_PAGO
