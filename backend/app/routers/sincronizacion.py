from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core_logic.sync_precios_simulado import generar_variaciones
from app.database import get_db
from app.deps import get_current_admin
from app.models import Producto, SyncPreciosHistorial, SyncPreciosPreview, Usuario
from app.repository import lockear_filas_ordenadas
from app.schemas.sincronizacion import (
    ItemAplicado,
    SincronizacionHistorialOut,
    SincronizacionPreviewIn,
    SincronizacionPreviewOut,
    SincronizacionResultado,
)

router = APIRouter(prefix="/api/sincronizacion-precios", tags=["sincronizacion-precios"], dependencies=[Depends(get_current_admin)])


@router.post("/preview", response_model=SincronizacionPreviewOut)
def generar_preview(payload: SincronizacionPreviewIn, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_admin)):
    query = db.query(Producto).filter(Producto.activo.is_(True))
    if payload.categoria:
        query = query.filter(Producto.categoria == payload.categoria)
    productos = query.order_by(Producto.producto_nombre).all()

    propuesta = generar_variaciones(productos, payload.pct_min, payload.pct_max)

    preview = SyncPreciosPreview(
        creado_por_id=actual.id,
        filtro_categoria=payload.categoria,
        variacion_pct_min=payload.pct_min,
        variacion_pct_max=payload.pct_max,
        propuesta=propuesta,
    )
    db.add(preview)
    db.commit()
    db.refresh(preview)
    return preview


@router.get("/preview/{preview_id}", response_model=SincronizacionPreviewOut)
def obtener_preview(preview_id: int, db: Session = Depends(get_db)):
    preview = db.get(SyncPreciosPreview, preview_id)
    if preview is None:
        raise HTTPException(status_code=404, detail="Vista previa no encontrada.")
    return preview


@router.post("/{preview_id}/confirmar", response_model=SincronizacionResultado)
def confirmar_sincronizacion(preview_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_admin)):
    preview = db.get(SyncPreciosPreview, preview_id)
    if preview is None:
        raise HTTPException(status_code=404, detail="Vista previa no encontrada.")
    if preview.aplicada:
        raise HTTPException(status_code=400, detail="Esta vista previa ya fue aplicada.")

    producto_ids = [item["producto_id"] for item in preview.propuesta]
    productos = lockear_filas_ordenadas(db, Producto, producto_ids)

    items: list[ItemAplicado] = []
    for propuesta_item in preview.propuesta:
        producto = productos.get(propuesta_item["producto_id"])
        if producto is None:
            items.append(
                ItemAplicado(
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
                ItemAplicado(
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
            ItemAplicado(
                producto_id=producto.id,
                producto_nombre=producto.producto_nombre,
                precio_anterior=propuesta_item["precio_anterior"],
                precio_nuevo=propuesta_item["precio_nuevo"],
                omitido=False,
            )
        )

    preview.aplicada = True
    historial = SyncPreciosHistorial(
        ejecutada_por_id=actual.id,
        cantidad_productos=len([i for i in items if not i.omitido]),
        variacion_pct_min=preview.variacion_pct_min,
        variacion_pct_max=preview.variacion_pct_max,
    )
    db.add(historial)
    db.commit()

    return SincronizacionResultado(preview_id=preview.id, items=items)


@router.get("/historial", response_model=list[SincronizacionHistorialOut])
def historial_sincronizaciones(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(SyncPreciosHistorial).order_by(SyncPreciosHistorial.aplicada_en.desc()).limit(limit).all()
