from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core_logic import calculadora
from app.database import get_db
from app.deps import get_current_user
from app.models import Consulta, PlanDescuento, Usuario
from app.repository import cargar_planes_dict
from app.schemas.consultas import ConsultaIn, ConsultaOut
from app.schemas.planes import PlanIn, PlanOut

router = APIRouter(prefix="/api", tags=["admin"], dependencies=[Depends(get_current_user)])

# Mismo mapeo que arma banco_promocion en app.py::formulario_nuevo_registro
BANCO_PROMOCION_POR_METODO = {
    "Macro": "Macro - Beneficio Select",
    "Galicia": "Galicia - Promo MODO",
    "Santander": "Santander - Especial Farmacias",
    "Nación": "BNA+ Semana Nación",
}


@router.get("/planes", response_model=list[PlanOut])
def listar_planes(db: Session = Depends(get_db)):
    return db.query(PlanDescuento).order_by(PlanDescuento.obra_social).all()


@router.post("/planes", response_model=PlanOut)
def cargar_plan(payload: PlanIn, db: Session = Depends(get_db)):
    obra_social = payload.obra_social.strip().title()
    if not obra_social:
        raise HTTPException(status_code=400, detail="El nombre de la obra social no puede estar vacío.")

    descuento_os = payload.descuento_pct / 100

    plan = db.query(PlanDescuento).filter(PlanDescuento.obra_social == obra_social).first()
    if plan is None:
        plan = PlanDescuento(obra_social=obra_social, descuento_os=descuento_os)
        db.add(plan)
    else:
        plan.descuento_os = descuento_os

    db.commit()
    db.refresh(plan)
    return plan


@router.post("/consultas", response_model=ConsultaOut)
def cargar_consulta(payload: ConsultaIn, db: Session = Depends(get_db)):
    tabla_planes = cargar_planes_dict(db.get_bind())

    # El descuento y el precio final salen de calculadora.py, nunca se calculan a mano acá
    descuento_os = calculadora.obtener_descuento_os(payload.obra_social, tabla_planes)
    descuento_banco = calculadora.obtener_descuento_banco(payload.metodo_pago)
    precio_final = calculadora.calcular_precio_final(payload.precio_lista, descuento_os, descuento_banco)

    banco_promocion = BANCO_PROMOCION_POR_METODO.get(payload.metodo_pago, "Sin Promo")

    siguiente_id_consulta = (db.query(func.coalesce(func.max(Consulta.id_consulta), 0)).scalar() or 0) + 1
    siguiente_cliente_id = (db.query(func.coalesce(func.max(Consulta.cliente_id), 0)).scalar() or 0) + 1

    consulta = Consulta(
        id_consulta=siguiente_id_consulta,
        fecha=payload.fecha,
        cliente_id=siguiente_cliente_id,
        cliente_nombre=payload.cliente_nombre.strip(),
        cliente_tel=payload.cliente_tel.strip(),
        obra_social=payload.obra_social,
        plan_afiliado=payload.plan_afiliado.strip(),
        producto_nombre=payload.producto_nombre.strip(),
        droga_generica="Droga Genérica",
        precio_lista=payload.precio_lista,
        descuento_os=descuento_os,
        metodo_pago=payload.metodo_pago,
        descuento_banco=descuento_banco,
        banco_promocion=banco_promocion,
        stock_disponible=payload.stock_disponible,
        categoria=payload.categoria,
        requiere_receta=payload.requiere_receta,
        precio_final=precio_final,
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
