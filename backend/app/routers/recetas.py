from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Producto, Receta, Usuario
from app.repository import buscar_o_crear_cliente
from app.schemas.recetas import RecetaIn, RecetaOut, RecetaValidarIn

router = APIRouter(prefix="/api/recetas", tags=["recetas"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[RecetaOut])
def listar_recetas(estado: str | None = None, cliente_ref_id: int | None = None, producto_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Receta)
    if estado:
        query = query.filter(Receta.estado == estado)
    if cliente_ref_id is not None:
        query = query.filter(Receta.cliente_ref_id == cliente_ref_id)
    if producto_id is not None:
        query = query.filter(Receta.producto_id == producto_id)
    return query.order_by(Receta.creado_en.desc()).all()


@router.get("/disponibles", response_model=list[RecetaOut])
def recetas_disponibles(cliente_ref_id: int, producto_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Receta)
        .filter(
            Receta.cliente_ref_id == cliente_ref_id,
            Receta.producto_id == producto_id,
            Receta.estado == "validada",
            Receta.pedido_item_id.is_(None),
        )
        .order_by(Receta.fecha_emision.desc())
        .all()
    )


@router.post("", response_model=RecetaOut)
def recibir_receta(payload: RecetaIn, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    producto = db.get(Producto, payload.producto_id)
    if producto is None or not producto.activo:
        raise HTTPException(status_code=404, detail="Producto no encontrado o dado de baja.")

    cliente = buscar_o_crear_cliente(db, payload.cliente_nombre, payload.cliente_tel)

    receta = Receta(
        cliente_ref_id=cliente.id,
        cliente_nombre=cliente.nombre,
        cliente_tel=cliente.telefono,
        producto_id=producto.id,
        producto_nombre=producto.producto_nombre,
        medico_nombre=payload.medico_nombre,
        medico_matricula=payload.medico_matricula,
        fecha_emision=payload.fecha_emision,
        creado_por_id=actual.id,
    )
    db.add(receta)
    db.commit()
    db.refresh(receta)
    return receta


@router.get("/{receta_id}", response_model=RecetaOut)
def detalle_receta(receta_id: int, db: Session = Depends(get_db)):
    receta = db.get(Receta, receta_id)
    if receta is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada.")
    return receta


@router.post("/{receta_id}/validar", response_model=RecetaOut)
def validar_receta(receta_id: int, payload: RecetaValidarIn, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    receta = db.get(Receta, receta_id)
    if receta is None:
        raise HTTPException(status_code=404, detail="Receta no encontrada.")
    if receta.estado != "pendiente":
        raise HTTPException(status_code=400, detail="Esta receta ya fue procesada.")
    if payload.estado == "rechazada" and not (payload.observaciones or "").strip():
        raise HTTPException(status_code=400, detail="Especificá el motivo del rechazo.")

    receta.estado = payload.estado
    receta.observaciones = payload.observaciones
    receta.validada_por_id = actual.id
    receta.validada_en = datetime.utcnow()
    db.commit()
    db.refresh(receta)
    return receta
