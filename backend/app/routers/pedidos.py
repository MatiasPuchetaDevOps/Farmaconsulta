from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core_logic import calculadora
from app.core_logic.facturacion_simulada import generar_cae
from app.core_logic.validacion_os_simulada import simular_validacion_os
from app.database import get_db
from app.deps import get_current_user
from app.models import CajaMovimiento, CajaSesion, ObraSocialRegla, Pedido, PedidoItem, Producto, Receta, Usuario
from app.repository import buscar_o_crear_cliente, cargar_planes_dict, lockear_filas_ordenadas
from app.schemas.pedidos import PedidoIn, PedidoItemOut, PedidoOut

router = APIRouter(prefix="/api/pedidos", tags=["pedidos"], dependencies=[Depends(get_current_user)])


def _pedido_a_out(pedido: Pedido, items: list[PedidoItem]) -> PedidoOut:
    return PedidoOut(
        id=pedido.id,
        cliente_nombre=pedido.cliente_nombre,
        cliente_tel=pedido.cliente_tel,
        obra_social=pedido.obra_social,
        plan_afiliado=pedido.plan_afiliado,
        metodo_pago=pedido.metodo_pago,
        estado=pedido.estado,
        total=pedido.total,
        caja_sesion_id=pedido.caja_sesion_id,
        comprobante_numero=pedido.comprobante_numero,
        cae=pedido.cae,
        cae_vencimiento=pedido.cae_vencimiento,
        cae_estado=pedido.cae_estado,
        cae_motivo_rechazo=pedido.cae_motivo_rechazo,
        cae_intentos=pedido.cae_intentos,
        validacion_os_resultado=pedido.validacion_os_resultado,
        validacion_os_motivo=pedido.validacion_os_motivo,
        creado_en=pedido.creado_en,
        cancelado_en=pedido.cancelado_en,
        items=[PedidoItemOut.model_validate(item) for item in items],
    )


@router.get("", response_model=list[PedidoOut])
def listar_pedidos(db: Session = Depends(get_db)):
    pedidos = db.query(Pedido).order_by(Pedido.creado_en.desc()).limit(100).all()
    items = db.query(PedidoItem).filter(PedidoItem.pedido_id.in_([p.id for p in pedidos])).all()

    items_por_pedido: dict[int, list[PedidoItem]] = defaultdict(list)
    for item in items:
        items_por_pedido[item.pedido_id].append(item)

    return [_pedido_a_out(pedido, items_por_pedido.get(pedido.id, [])) for pedido in pedidos]


@router.post("", response_model=PedidoOut)
def crear_pedido(payload: PedidoIn, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    cantidad_por_producto: dict[int, int] = defaultdict(int)
    for item in payload.items:
        cantidad_por_producto[item.producto_id] += item.cantidad

    productos = lockear_filas_ordenadas(db, Producto, list(cantidad_por_producto.keys()))

    for producto_id, cantidad in cantidad_por_producto.items():
        producto = productos[producto_id]
        if producto is None or not producto.activo:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Producto {producto_id} no encontrado o dado de baja.")
        if producto.stock_disponible < cantidad:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=f"Stock insuficiente de '{producto.producto_nombre}' (disponible: {producto.stock_disponible}, pedido: {cantidad}).",
            )

    # Gate de receta: un producto con requiere_receta necesita una receta ya validada y sin usar.
    # Si el mismo producto aparece más de una vez en el payload, se toma la primera receta indicada
    # para él (misma limitación que ya tiene cantidad_por_producto, que agrupa por producto_id).
    receta_id_por_producto: dict[int, int] = {}
    for item in payload.items:
        if item.receta_id is not None and item.producto_id not in receta_id_por_producto:
            receta_id_por_producto[item.producto_id] = item.receta_id

    recetas = lockear_filas_ordenadas(db, Receta, list(receta_id_por_producto.values()))

    for producto_id, cantidad in cantidad_por_producto.items():
        producto = productos[producto_id]
        if not producto.requiere_receta:
            continue

        receta_id = receta_id_por_producto.get(producto_id)
        if receta_id is None:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"El producto '{producto.producto_nombre}' requiere una receta validada.")

        receta = recetas.get(receta_id)
        if receta is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Receta no encontrada.")
        if receta.producto_id != producto_id:
            db.rollback()
            raise HTTPException(status_code=400, detail="La receta indicada no corresponde a este producto.")
        if receta.estado != "validada":
            db.rollback()
            raise HTTPException(status_code=400, detail="La receta todavía no fue validada.")
        if receta.pedido_item_id is not None:
            db.rollback()
            raise HTTPException(status_code=400, detail="Esta receta ya fue utilizada en otra venta.")

    tabla_planes = cargar_planes_dict(db.get_bind())
    descuento_os = calculadora.obtener_descuento_os(payload.obra_social, tabla_planes)
    descuento_banco = calculadora.obtener_descuento_banco(payload.metodo_pago)

    cliente = buscar_o_crear_cliente(db, payload.cliente_nombre, payload.cliente_tel)

    # Validación de obra social simulada: se guarda el resultado pero no bloquea la venta
    # (si "rechaza"/"vence", en la vida real se le cobraría particular al cliente igual).
    reglas_activas = db.query(ObraSocialRegla).filter(ObraSocialRegla.activo.is_(True)).all()
    tabla_reglas = {(r.obra_social, r.plan_afiliado): (r.resultado, r.motivo) for r in reglas_activas}
    validacion_resultado, validacion_motivo = simular_validacion_os(payload.obra_social, payload.plan_afiliado, tabla_reglas)

    # Caja abierta opcional: si hay una, la venta se refleja ahí; si no, se vende igual.
    caja_sesion = db.query(CajaSesion).filter(CajaSesion.estado == "abierta").with_for_update().first()

    plan_afiliado = payload.plan_afiliado.strip() or None

    pedido = Pedido(
        cliente_ref_id=cliente.id,
        cliente_nombre=cliente.nombre,
        cliente_tel=cliente.telefono,
        obra_social=payload.obra_social,
        plan_afiliado=plan_afiliado,
        metodo_pago=payload.metodo_pago,
        estado="confirmado",
        total=0,
        usuario_id=actual.id,
        caja_sesion_id=caja_sesion.id if caja_sesion is not None else None,
        validacion_os_resultado=validacion_resultado,
        validacion_os_motivo=validacion_motivo,
    )
    db.add(pedido)
    db.flush()  # asigna pedido.id sin cerrar la transacción

    items: list[PedidoItem] = []
    total = 0
    for producto_id, cantidad in cantidad_por_producto.items():
        producto = productos[producto_id]
        precio_final_unitario = calculadora.calcular_precio_final(producto.precio_lista, descuento_os, descuento_banco)
        subtotal = precio_final_unitario * cantidad
        total += subtotal

        producto.stock_disponible -= cantidad

        receta_id = receta_id_por_producto.get(producto_id)
        item = PedidoItem(
            pedido_id=pedido.id,
            producto_id=producto.id,
            producto_nombre=producto.producto_nombre,
            cantidad=cantidad,
            precio_lista=producto.precio_lista,
            descuento_os=descuento_os,
            descuento_banco=descuento_banco,
            precio_final_unitario=precio_final_unitario,
            subtotal=subtotal,
            receta_id=receta_id,
        )
        db.add(item)
        db.flush()  # asigna item.id para poder vincularlo a la receta
        items.append(item)

        if receta_id is not None:
            recetas[receta_id].pedido_item_id = item.id

    pedido.total = total
    pedido.comprobante_numero = f"{pedido.id:08d}"

    if caja_sesion is not None:
        db.add(
            CajaMovimiento(
                caja_sesion_id=caja_sesion.id,
                tipo="ingreso",
                origen="venta",
                monto=total,
                concepto=f"Venta #{pedido.id}",
                pedido_id=pedido.id,
                usuario_id=actual.id,
            )
        )

    resultado_cae = generar_cae(total)
    pedido.cae_intentos = 1
    pedido.cae_estado = resultado_cae["estado"]
    pedido.cae = resultado_cae["cae"]
    pedido.cae_vencimiento = resultado_cae["cae_vencimiento"]
    pedido.cae_motivo_rechazo = resultado_cae["motivo_rechazo"]

    db.commit()
    db.refresh(pedido)

    return _pedido_a_out(pedido, items)


@router.post("/{pedido_id}/reintentar-cae", response_model=PedidoOut)
def reintentar_cae(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.get(Pedido, pedido_id)
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
    if pedido.estado == "cancelado":
        raise HTTPException(status_code=400, detail="No se puede facturar un pedido cancelado.")
    if pedido.cae_estado == "aprobado":
        raise HTTPException(status_code=400, detail="Este pedido ya tiene un CAE aprobado.")

    resultado_cae = generar_cae(pedido.total)
    pedido.cae_intentos += 1
    pedido.cae_estado = resultado_cae["estado"]
    pedido.cae = resultado_cae["cae"]
    pedido.cae_vencimiento = resultado_cae["cae_vencimiento"]
    pedido.cae_motivo_rechazo = resultado_cae["motivo_rechazo"]
    db.commit()
    db.refresh(pedido)

    items = db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido_id).all()
    return _pedido_a_out(pedido, items)


@router.post("/{pedido_id}/cancelar", response_model=PedidoOut)
def cancelar_pedido(pedido_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    pedido = db.get(Pedido, pedido_id)
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
    if pedido.estado == "cancelado":
        raise HTTPException(status_code=400, detail="Este pedido ya fue cancelado.")

    items = db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido_id).all()
    productos = lockear_filas_ordenadas(db, Producto, [item.producto_id for item in items])

    for item in items:
        producto = productos[item.producto_id]
        if producto is not None:
            producto.stock_disponible += item.cantidad
        if item.receta_id is not None:
            receta = db.get(Receta, item.receta_id)
            if receta is not None:
                receta.pedido_item_id = None

    # Solo se revierte el movimiento de caja si esa caja sigue abierta; una caja ya
    # cerrada/arqueada no se vuelve a tocar.
    if pedido.caja_sesion_id is not None:
        caja_sesion = (
            db.query(CajaSesion)
            .filter(CajaSesion.id == pedido.caja_sesion_id, CajaSesion.estado == "abierta")
            .with_for_update()
            .first()
        )
        if caja_sesion is not None:
            db.add(
                CajaMovimiento(
                    caja_sesion_id=caja_sesion.id,
                    tipo="egreso",
                    origen="venta_cancelada",
                    monto=pedido.total,
                    concepto=f"Cancelación venta #{pedido.id}",
                    pedido_id=pedido.id,
                    usuario_id=actual.id,
                )
            )

    pedido.estado = "cancelado"
    pedido.cancelado_en = datetime.utcnow()
    db.commit()
    db.refresh(pedido)

    return _pedido_a_out(pedido, items)
