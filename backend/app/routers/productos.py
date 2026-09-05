from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Producto
from app.schemas.catalogos import ProductoIn, ProductoOut

router = APIRouter(prefix="/api/productos", tags=["productos"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ProductoOut])
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).order_by(Producto.producto_nombre).all()


@router.post("", response_model=ProductoOut)
def crear_producto(payload: ProductoIn, db: Session = Depends(get_db)):
    nombre = payload.producto_nombre.strip()
    if db.query(Producto).filter(Producto.producto_nombre == nombre).first():
        raise HTTPException(status_code=400, detail=f"Ya existe un producto llamado '{nombre}'.")

    producto = Producto(
        producto_nombre=nombre,
        categoria=payload.categoria.strip(),
        precio_lista=payload.precio_lista,
        stock_disponible=payload.stock_disponible,
        droga_generica=payload.droga_generica,
        requiere_receta=payload.requiere_receta,
        activo=payload.activo,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


@router.put("/{producto_id}", response_model=ProductoOut)
def editar_producto(producto_id: int, payload: ProductoIn, db: Session = Depends(get_db)):
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")

    nombre = payload.producto_nombre.strip()
    duplicado = db.query(Producto).filter(Producto.producto_nombre == nombre, Producto.id != producto_id).first()
    if duplicado:
        raise HTTPException(status_code=400, detail=f"Ya existe un producto llamado '{nombre}'.")

    producto.producto_nombre = nombre
    producto.categoria = payload.categoria.strip()
    producto.precio_lista = payload.precio_lista
    producto.stock_disponible = payload.stock_disponible
    producto.droga_generica = payload.droga_generica
    producto.requiere_receta = payload.requiere_receta
    producto.activo = payload.activo
    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/{producto_id}", status_code=204)
def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    producto.activo = False
    db.commit()
