from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Usuario
from app.schemas.usuarios import UsuarioAdminOut, UsuarioCrear, UsuarioEditar
from app.security import hash_password

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[UsuarioAdminOut])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.username).all()


@router.post("", response_model=UsuarioAdminOut)
def crear_usuario(payload: UsuarioCrear, db: Session = Depends(get_db)):
    username = payload.username.strip().lower()
    if db.query(Usuario).filter(Usuario.username == username).first():
        raise HTTPException(status_code=400, detail=f"Ya existe el usuario '{username}'.")

    usuario = Usuario(
        username=username,
        password_hash=hash_password(payload.password),
        nombre_completo=payload.nombre_completo,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/{usuario_id}", response_model=UsuarioAdminOut)
def editar_usuario(
    usuario_id: int,
    payload: UsuarioEditar,
    db: Session = Depends(get_db),
    actual: Usuario = Depends(get_current_user),
):
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if payload.activo is False:
        if usuario.id == actual.id:
            raise HTTPException(status_code=400, detail="No podés desactivar tu propio usuario.")
        activos = db.query(Usuario).filter(Usuario.activo.is_(True)).count()
        if activos <= 1:
            raise HTTPException(status_code=400, detail="No podés desactivar el único usuario activo.")

    if payload.nombre_completo is not None:
        usuario.nombre_completo = payload.nombre_completo
    if payload.activo is not None:
        usuario.activo = payload.activo
    if payload.password:
        usuario.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", status_code=204)
def desactivar_usuario(usuario_id: int, db: Session = Depends(get_db), actual: Usuario = Depends(get_current_user)):
    if usuario_id == actual.id:
        raise HTTPException(status_code=400, detail="No podés desactivar tu propio usuario.")

    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    activos = db.query(Usuario).filter(Usuario.activo.is_(True)).count()
    if activos <= 1:
        raise HTTPException(status_code=400, detail="No podés desactivar el único usuario activo.")

    usuario.activo = False
    db.commit()
