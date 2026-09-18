from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core_logic import calculadora
from app.database import get_db
from app.deps import get_current_user
from app.models import BancoPromocion, Consulta, PlanDescuento, Producto
from app.repository import buscar_o_crear_cliente, cargar_bancos_dict, cargar_planes_dict
from app.schemas.banco_promociones import BancoPromocionIn, BancoPromocionOut
from app.schemas.consultas import ConsultaIn, ConsultaOut
from app.schemas.planes import PlanIn, PlanOut

router = APIRouter(prefix="/api", tags=["admin"], dependencies=[Depends(get_current_user)])


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


@router.get("/bancos-promociones", response_model=list[BancoPromocionOut])
def listar_bancos_promociones(db: Session = Depends(get_db)):
    return db.query(BancoPromocion).order_by(BancoPromocion.banco).all()


@router.post("/bancos-promociones", response_model=BancoPromocionOut)
def cargar_banco_promocion(payload: BancoPromocionIn, db: Session = Depends(get_db)):
    banco = payload.banco.strip().title()
    if not banco:
        raise HTTPException(status_code=400, detail="El nombre del banco no puede estar vacío.")

    descuento_banco = payload.descuento_pct / 100

    promocion = db.query(BancoPromocion).filter(BancoPromocion.banco == banco).first()
    if promocion is None:
        promocion = BancoPromocion(banco=banco, descuento_banco=descuento_banco)
        db.add(promocion)
    else:
        promocion.descuento_banco = descuento_banco

    db.commit()
    db.refresh(promocion)
    return promocion


@router.delete("/bancos-promociones/{promocion_id}", status_code=204)
def eliminar_banco_promocion(promocion_id: int, db: Session = Depends(get_db)):
    promocion = db.get(BancoPromocion, promocion_id)
    if promocion is None:
        raise HTTPException(status_code=404, detail="Promoción bancaria no encontrada.")
    db.delete(promocion)
    db.commit()


@router.post("/consultas", response_model=ConsultaOut)
def cargar_consulta(payload: ConsultaIn, db: Session = Depends(get_db)):
    producto = db.get(Producto, payload.producto_id)
    if producto is None or not producto.activo:
        raise HTTPException(status_code=404, detail="Producto no encontrado o dado de baja.")

    db_engine = db.get_bind()
    tabla_planes = cargar_planes_dict(db_engine)
    tabla_bancos = cargar_bancos_dict(db_engine)

    # El descuento y el precio final salen de calculadora.py, nunca se calculan a mano acá
    descuento_os = calculadora.obtener_descuento_os(payload.obra_social, tabla_planes)
    descuento_banco = calculadora.obtener_descuento_banco(payload.metodo_pago, tabla_bancos)
    precio_final = calculadora.calcular_precio_final(producto.precio_lista, descuento_os, descuento_banco)

    # La etiqueta de campaña ya no depende de una lista fija de bancos: cualquier
    # banco cargado en banco_promociones (con descuento > 0) se muestra como promo.
    banco_promocion = f"{payload.metodo_pago.strip().title()} - Promoción bancaria" if descuento_banco > 0 else "Sin Promo"
    cliente = buscar_o_crear_cliente(db, payload.cliente_nombre, payload.cliente_tel)

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
