from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Cliente
from app.schemas.clientes import ClienteIn, ClienteOut

router = APIRouter(prefix="/api/clientes", tags=["clientes"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ClienteOut])
def listar_clientes(q: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Cliente)
    if q:
        patron = f"%{q.strip()}%"
        query = query.filter(or_(Cliente.nombre.ilike(patron), Cliente.telefono.ilike(patron)))
    return query.order_by(Cliente.nombre).all()


@router.post("", response_model=ClienteOut)
def crear_cliente(payload: ClienteIn, db: Session = Depends(get_db)):
    cliente = Cliente(
        nombre=payload.nombre.strip().title(),
        telefono=(payload.telefono or "").strip() or None,
        activo=payload.activo,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteOut)
def editar_cliente(cliente_id: int, payload: ClienteIn, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    cliente.nombre = payload.nombre.strip().title()
    cliente.telefono = (payload.telefono or "").strip() or None
    cliente.activo = payload.activo
    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}", status_code=204)
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    cliente.activo = False
    db.commit()
