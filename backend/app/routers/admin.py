from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core_logic import calculadora
from app.database import get_db
from app.deps import get_current_user
from app.models import Cliente, Consulta, PlanDescuento, Producto
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


@router.delete("/planes/{plan_id}", status_code=204)
def eliminar_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.get(PlanDescuento, plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan no encontrado.")
    db.delete(plan)
    db.commit()


def _buscar_o_crear_cliente(db: Session, nombre: str, telefono: str) -> Cliente:
    nombre_normalizado = nombre.strip().title()
    telefono_normalizado = telefono.strip() or None

    query = db.query(Cliente).filter(Cliente.nombre == nombre_normalizado)
    if telefono_normalizado:
        query = query.filter(Cliente.telefono == telefono_normalizado)
    else:
        query = query.filter(Cliente.telefono.is_(None))

    cliente = query.first()
    if cliente is not None:
        return cliente

    cliente = Cliente(nombre=nombre_normalizado, telefono=telefono_normalizado)
    db.add(cliente)
    db.flush()  # asigna cliente.id sin cerrar la transacción de la consulta
    return cliente


@router.post("/consultas", response_model=ConsultaOut)
def cargar_consulta(payload: ConsultaIn, db: Session = Depends(get_db)):
    producto = db.get(Producto, payload.producto_id)
    if producto is None or not producto.activo:
        raise HTTPException(status_code=404, detail="Producto no encontrado o dado de baja.")

    tabla_planes = cargar_planes_dict(db.get_bind())

    # El descuento y el precio final salen de calculadora.py, nunca se calculan a mano acá
    descuento_os = calculadora.obtener_descuento_os(payload.obra_social, tabla_planes)
    descuento_banco = calculadora.obtener_descuento_banco(payload.metodo_pago)
    precio_final = calculadora.calcular_precio_final(producto.precio_lista, descuento_os, descuento_banco)

    banco_promocion = BANCO_PROMOCION_POR_METODO.get(payload.metodo_pago, "Sin Promo")
    cliente = _buscar_o_crear_cliente(db, payload.cliente_nombre, payload.cliente_tel)

    siguiente_id_consulta = (db.query(func.coalesce(func.max(Consulta.id_consulta), 0)).scalar() or 0) + 1
    siguiente_cliente_id = (db.query(func.coalesce(func.max(Consulta.cliente_id), 0)).scalar() or 0) + 1

    consulta = Consulta(
        id_consulta=siguiente_id_consulta,
        fecha=payload.fecha,
        cliente_id=siguiente_cliente_id,
        cliente_ref_id=cliente.id,
        cliente_nombre=cliente.nombre,
        cliente_tel=cliente.telefono or "",
        obra_social=payload.obra_social,
        plan_afiliado=payload.plan_afiliado.strip(),
        producto_id=producto.id,
        producto_nombre=producto.producto_nombre,
        droga_generica=producto.droga_generica or "Droga Genérica",
        precio_lista=producto.precio_lista,
        descuento_os=descuento_os,
        metodo_pago=payload.metodo_pago,
        descuento_banco=descuento_banco,
        banco_promocion=banco_promocion,
        stock_disponible=producto.stock_disponible,
        categoria=producto.categoria,
        requiere_receta=producto.requiere_receta,
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
