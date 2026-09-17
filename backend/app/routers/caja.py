from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin, get_current_user
from app.models import CajaMovimiento, CajaSesion, Usuario
from app.schemas.caja import CajaAbrirIn, CajaCerrarIn, CajaMovimientoIn, CajaMovimientoOut, CajaSesionOut

router = APIRouter(prefix="/api/caja", tags=["caja"], dependencies=[Depends(get_current_user)])


def _totales(movimientos: list[CajaMovimiento]) -> tuple[int, int]:
    ingresos = sum(m.monto for m in movimientos if m.tipo == "ingreso")
    egresos = sum(m.monto for m in movimientos if m.tipo == "egreso")
    return ingresos, egresos


def _movimiento_a_out(movimiento: CajaMovimiento, usuario_username: str) -> CajaMovimientoOut:
    return CajaMovimientoOut(
        id=movimiento.id,
        tipo=movimiento.tipo,
        origen=movimiento.origen,
        monto=movimiento.monto,
        concepto=movimiento.concepto,
        pedido_id=movimiento.pedido_id,
        usuario_id=movimiento.usuario_id,
        usuario_username=usuario_username,
        creado_en=movimiento.creado_en,
    )


def _sesion_a_out(db: Session, sesion: CajaSesion) -> CajaSesionOut:
    movimientos = db.query(CajaMovimiento).filter(CajaMovimiento.caja_sesion_id == sesion.id).order_by(CajaMovimiento.creado_en).all()
    usuarios_ids = {m.usuario_id for m in movimientos} | {sesion.abierta_por_id}
    if sesion.cerrada_por_id:
        usuarios_ids.add(sesion.cerrada_por_id)
    usuarios = {u.id: u.username for u in db.query(Usuario).filter(Usuario.id.in_(usuarios_ids)).all()}

    ingresos, egresos = _totales(movimientos)
    saldo_actual = sesion.monto_inicial + ingresos - egresos

    return CajaSesionOut(
        id=sesion.id,
        estado=sesion.estado,
        monto_inicial=sesion.monto_inicial,
        monto_declarado=sesion.monto_declarado,
        monto_calculado=sesion.monto_calculado,
        diferencia=sesion.diferencia,
        abierta_por=usuarios.get(sesion.abierta_por_id, "?"),
        cerrada_por=usuarios.get(sesion.cerrada_por_id) if sesion.cerrada_por_id else None,
        observaciones_apertura=sesion.observaciones_apertura,
        observaciones_cierre=sesion.observaciones_cierre,
        abierta_en=sesion.abierta_en,
        cerrada_en=sesion.cerrada_en,
        total_ingresos=ingresos,
        total_egresos=egresos,
        saldo_actual=saldo_actual,
        movimientos=[_movimiento_a_out(m, usuarios.get(m.usuario_id, "?")) for m in movimientos],
    )


@router.post("/abrir", response_model=CajaSesionOut)
def abrir_caja(payload: CajaAbrirIn, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    existente = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()
    if existente is not None:
        raise HTTPException(status_code=409, detail="Ya hay una caja abierta.")

    sesion = CajaSesion(
        monto_inicial=payload.monto_inicial,
        abierta_por_id=actual.id,
        observaciones_apertura=payload.observaciones,
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    return _sesion_a_out(db, sesion)


@router.get("/actual", response_model=CajaSesionOut)
def caja_actual(db: Session = Depends(get_db)):
    sesion = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").first()
    if sesion is None:
        raise HTTPException(status_code=404, detail="No hay ninguna caja abierta.")
    return _sesion_a_out(db, sesion)


@router.post("/movimientos", response_model=CajaSesionOut)
def registrar_movimiento(payload: CajaMovimientoIn, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    sesion = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").with_for_update().first()
    if sesion is None:
        raise HTTPException(status_code=404, detail="No hay ninguna caja abierta.")

    movimiento = CajaMovimiento(
        caja_sesion_id=sesion.id,
        tipo=payload.tipo,
        origen="manual",
        monto=payload.monto,
        concepto=payload.concepto.strip(),
        usuario_id=actual.id,
    )
    db.add(movimiento)
    db.commit()
    return _sesion_a_out(db, sesion)


@router.post("/cerrar", response_model=CajaSesionOut)
def cerrar_caja(payload: CajaCerrarIn, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    sesion = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").with_for_update().first()
    if sesion is None:
        raise HTTPException(status_code=404, detail="No hay ninguna caja abierta.")

    movimientos = db.query(CajaMovimiento).filter(CajaMovimiento.caja_sesion_id == sesion.id).all()
    ingresos, egresos = _totales(movimientos)
    monto_calculado = sesion.monto_inicial + ingresos - egresos

    sesion.monto_declarado = payload.monto_declarado
    sesion.monto_calculado = monto_calculado
    sesion.diferencia = payload.monto_declarado - monto_calculado
    sesion.observaciones_cierre = payload.observaciones
    sesion.estado = "cerrada"
    sesion.cerrada_por_id = actual.id
    sesion.cerrada_en = datetime.utcnow()
    db.commit()
    db.refresh(sesion)
    return _sesion_a_out(db, sesion)


@router.get("/historial", response_model=list[CajaSesionOut], dependencies=[Depends(get_current_admin)])
def historial_cajas(limit: int = 50, db: Session = Depends(get_db)):
    sesiones = db.query(CajaSesion).filter(CajaSesion.estado == "cerrada").order_by(CajaSesion.cerrada_en.desc()).limit(limit).all()
    return [_sesion_a_out(db, s) for s in sesiones]


@router.get("/{sesion_id}", response_model=CajaSesionOut, dependencies=[Depends(get_current_admin)])
def detalle_caja(sesion_id: int, db: Session = Depends(get_db)):
    sesion = db.get(CajaSesion, sesion_id)
    if sesion is None:
        raise HTTPException(status_code=404, detail="Caja no encontrada.")
    return _sesion_a_out(db, sesion)
