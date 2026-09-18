from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core_logic.ajuste_precios import generar_ajuste
from app.database import get_db
from app.deps import get_current_admin
from app.models import AjustePrecioHistorial, AjustePrecioPreview, Producto, Usuario
from app.repository import lockear_filas_ordenadas
from app.schemas.ajuste_precios import (
    AjustePrecioHistorialOut,
    AjustePrecioIn,
    AjustePrecioPreviewOut,
    AjustePrecioResultado,
    ItemAjustado,
)

router = APIRouter(prefix="/api/ajuste-precios", tags=["ajuste-precios"], dependencies=[Depends(get_current_admin)])


@router.post("/preview", response_model=AjustePrecioPreviewOut)
def generar_preview(payload: AjustePrecioIn, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_admin)):
    query = db.query(Producto).filter(Producto.activo.is_(True))
    if payload.categoria:
        query = query.filter(Producto.categoria == payload.categoria)
    productos = query.order_by(Producto.producto_nombre).all()

    propuesta = generar_ajuste(productos, payload.pct)

    preview = AjustePrecioPreview(
        creado_por_id=actual.id,
        filtro_categoria=payload.categoria,
        variacion_pct=payload.pct,
        propuesta=propuesta,
    )
    db.add(preview)
    db.commit()
    db.refresh(preview)
    return preview


@router.get("/preview/{preview_id}", response_model=AjustePrecioPreviewOut)
def obtener_preview(preview_id: int, db: Session = Depends(get_db)):
    preview = db.get(AjustePrecioPreview, preview_id)
    if preview is None:
        raise HTTPException(status_code=404, detail="Vista previa no encontrada.")
    return preview


@router.post("/{preview_id}/confirmar", response_model=AjustePrecioResultado)
def confirmar_ajuste(preview_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_admin)):
    preview = db.get(AjustePrecioPreview, preview_id)
    if preview is None:
        raise HTTPException(status_code=404, detail="Vista previa no encontrada.")
    if preview.aplicada:
        raise HTTPException(status_code=400, detail="Esta vista previa ya fue aplicada.")

    producto_ids = [item["producto_id"] for item in preview.propuesta]
    productos = lockear_filas_ordenadas(db, Producto, producto_ids)

    items: list[ItemAjustado] = []
    for propuesta_item in preview.propuesta:
        producto = productos.get(propuesta_item["producto_id"])
        if producto is None:
            items.append(
                ItemAjustado(
                    producto_id=propuesta_item["producto_id"],
                    producto_nombre=propuesta_item["producto_nombre"],
                    precio_anterior=propuesta_item["precio_anterior"],
                    precio_nuevo=propuesta_item["precio_nuevo"],
                    omitido=True,
                    motivo_omision="El producto ya no existe.",
                )
            )
            continue

        if producto.precio_lista != propuesta_item["precio_anterior"]:
            items.append(
                ItemAjustado(
                    producto_id=producto.id,
                    producto_nombre=producto.producto_nombre,
                    precio_anterior=producto.precio_lista,
                    precio_nuevo=propuesta_item["precio_nuevo"],
                    omitido=True,
                    motivo_omision="El precio de lista cambió desde que se generó la vista previa.",
                )
            )
            continue

        producto.precio_lista = propuesta_item["precio_nuevo"]
        items.append(
            ItemAjustado(
                producto_id=producto.id,
                producto_nombre=producto.producto_nombre,
                precio_anterior=propuesta_item["precio_anterior"],
                precio_nuevo=propuesta_item["precio_nuevo"],
                omitido=False,
            )
        )

    preview.aplicada = True
    historial = AjustePrecioHistorial(
        ejecutada_por_id=actual.id,
        cantidad_productos=len([i for i in items if not i.omitido]),
        variacion_pct=preview.variacion_pct,
    )
    db.add(historial)
    db.commit()

    return AjustePrecioResultado(preview_id=preview.id, items=items)


@router.get("/historial", response_model=list[AjustePrecioHistorialOut])
def historial_ajustes(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(AjustePrecioHistorial).order_by(AjustePrecioHistorial.aplicada_en.desc()).limit(limit).all()
