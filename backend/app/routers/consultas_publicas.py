from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Producto
from app.repository import crear_consulta
from app.schemas.consultas import ConsultaOut, ConsultaPublicaIn

# Sin autenticación a propósito: es el mismo mostrador público sin login de
# RF-07 (ConsultaPrecio.tsx cuando no hay sesión iniciada). No pide nombre ni
# teléfono del cliente -- eso solo se captura cuando la carga el personal.
router = APIRouter(prefix="/api/consultas-publicas", tags=["consultas-publicas"])


@router.post("", response_model=ConsultaOut)
def registrar_consulta_publica(payload: ConsultaPublicaIn, db: Session = Depends(get_db)):
    producto = db.get(Producto, payload.producto_id)
    if producto is None or not producto.activo:
        raise HTTPException(status_code=404, detail="Producto no encontrado o dado de baja.")

    consulta = crear_consulta(
        db,
        producto=producto,
        obra_social=payload.obra_social,
        plan_afiliado=payload.plan_afiliado,
        metodo_pago=payload.metodo_pago,
        fecha=payload.fecha,
        origen="publico",
        cliente_ref_id=None,
        cliente_nombre="Consulta pública",
        cliente_tel=None,
    )
    db.add(consulta)
    db.commit()

    return ConsultaOut(
        id_consulta=consulta.id_consulta,
        producto_nombre=consulta.producto_nombre,
        obra_social=consulta.obra_social,
        metodo_pago=consulta.metodo_pago,
        precio_final=consulta.precio_final,
    )
