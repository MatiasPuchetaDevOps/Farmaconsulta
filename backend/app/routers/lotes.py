from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Lote, Producto
from app.schemas.lotes import LoteIn, LoteOut, LotesAlertaOut

router = APIRouter(prefix="/api/lotes", tags=["lotes"], dependencies=[Depends(get_current_user)])


def _a_out(lote: Lote, producto_nombre: str) -> LoteOut:
    return LoteOut(
        id=lote.id,
        producto_id=lote.producto_id,
        producto_nombre=producto_nombre,
        numero_lote=lote.numero_lote,
        vencimiento=lote.vencimiento,
        cantidad=lote.cantidad,
        activo=lote.activo,
        dias_para_vencer=(lote.vencimiento - date.today()).days,
        creado_en=lote.creado_en,
    )


@router.get("", response_model=list[LoteOut])
def listar_lotes(producto_id: int | None = None, solo_activos: bool = True, db: Session = Depends(get_db)):
    query = db.query(Lote, Producto.producto_nombre).join(Producto, Lote.producto_id == Producto.id)
    if producto_id is not None:
        query = query.filter(Lote.producto_id == producto_id)
    if solo_activos:
        query = query.filter(Lote.activo.is_(True))
    filas = query.order_by(Lote.vencimiento).all()
    return [_a_out(lote, nombre) for lote, nombre in filas]


@router.get("/alertas", response_model=LotesAlertaOut)
def alertas_vencimiento(dias: int = 30, db: Session = Depends(get_db)):
    hoy = date.today()
    limite = hoy + timedelta(days=dias)

    filas = (
        db.query(Lote, Producto.producto_nombre)
        .join(Producto, Lote.producto_id == Producto.id)
        .filter(Lote.activo.is_(True))
        .order_by(Lote.vencimiento)
        .all()
    )

    vencidos = [_a_out(lote, nombre) for lote, nombre in filas if lote.vencimiento < hoy]
    por_vencer = [_a_out(lote, nombre) for lote, nombre in filas if hoy <= lote.vencimiento <= limite]

    return LotesAlertaOut(vencidos=vencidos, por_vencer=por_vencer)


@router.post("", response_model=LoteOut)
def crear_lote(payload: LoteIn, db: Session = Depends(get_db)):
    producto = db.get(Producto, payload.producto_id)
    if producto is None or not producto.activo:
        raise HTTPException(status_code=404, detail="Producto no encontrado o dado de baja.")

    lote = Lote(
        producto_id=payload.producto_id,
        numero_lote=payload.numero_lote.strip(),
        vencimiento=payload.vencimiento,
        cantidad=payload.cantidad,
        activo=payload.activo,
    )
    db.add(lote)
    db.commit()
    db.refresh(lote)
    return _a_out(lote, producto.producto_nombre)


@router.put("/{lote_id}", response_model=LoteOut)
def editar_lote(lote_id: int, payload: LoteIn, db: Session = Depends(get_db)):
    lote = db.get(Lote, lote_id)
    if lote is None:
        raise HTTPException(status_code=404, detail="Lote no encontrado.")

    producto = db.get(Producto, payload.producto_id)
    if producto is None or not producto.activo:
        raise HTTPException(status_code=404, detail="Producto no encontrado o dado de baja.")

    lote.producto_id = payload.producto_id
    lote.numero_lote = payload.numero_lote.strip()
    lote.vencimiento = payload.vencimiento
    lote.cantidad = payload.cantidad
    lote.activo = payload.activo
    db.commit()
    db.refresh(lote)
    return _a_out(lote, producto.producto_nombre)


@router.delete("/{lote_id}", status_code=204)
def eliminar_lote(lote_id: int, db: Session = Depends(get_db)):
    lote = db.get(Lote, lote_id)
    if lote is None:
        raise HTTPException(status_code=404, detail="Lote no encontrado.")
    lote.activo = False
    db.commit()
