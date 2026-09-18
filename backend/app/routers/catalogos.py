from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Engine
from sqlalchemy.orm import Session

from app.core_logic.calculadora import METODOS_PAGO_SIN_PROMOCION
from app.database import engine, get_db
from app.models import Producto
from app.repository import cargar_bancos_dict, cargar_consultas_df, cargar_planes_dict
from app.schemas.catalogos import ProductoOut

router = APIRouter(prefix="/api/catalogos", tags=["catalogos"])


def _get_engine() -> Engine:
    return engine


@router.get("/productos", response_model=list[ProductoOut])
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).filter(Producto.activo.is_(True)).order_by(Producto.producto_nombre).all()


@router.get("/productos/buscar-codigo-barras/{codigo}", response_model=ProductoOut)
def buscar_por_codigo_barras(codigo: str, db: Session = Depends(get_db)):
    producto = (
        db.query(Producto)
        .filter(Producto.codigo_barras == codigo.strip(), Producto.activo.is_(True))
        .first()
    )
    if producto is None:
        raise HTTPException(status_code=404, detail=f"No se encontró ningún producto con el código '{codigo}'.")
    return producto


@router.get("/obras-sociales", response_model=list[str])
def listar_obras_sociales(db_engine: Engine = Depends(_get_engine)):
    df = cargar_consultas_df(db_engine)
    tabla_planes = cargar_planes_dict(db_engine)

    todas = set(df["obra_social"].unique()) | set(tabla_planes.keys())
    prioritarias = [nombre for nombre in ["Pami", "Particular"] if nombre in todas]
    resto = sorted(todas - set(prioritarias))

    return prioritarias + resto


@router.get("/metodos-pago", response_model=list[str])
def listar_metodos_pago(db_engine: Engine = Depends(_get_engine)):
    tabla_bancos = cargar_bancos_dict(db_engine)
    return METODOS_PAGO_SIN_PROMOCION + sorted(tabla_bancos.keys())
