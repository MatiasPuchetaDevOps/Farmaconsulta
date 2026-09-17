from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin, get_current_user
from app.models import Usuario
from app.schemas.usuarios import UsuarioAdminOut, UsuarioCrear, UsuarioEditar
from app.security import hash_password

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"], dependencies=[Depends(get_current_user)])


def _sin_admins_restantes(db: Session, excluir_id: int) -> bool:
    return db.query(Usuario).filter(Usuario.es_admin.is_(True), Usuario.id != excluir_id).count() == 0


@router.get("", response_model=list[UsuarioAdminOut])
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(Usuario).order_by(Usuario.username).all()


@router.post("", response_model=UsuarioAdminOut, dependencies=[Depends(get_current_admin)])
def crear_usuario(payload: UsuarioCrear, db: Session = Depends(get_db)):
    username = payload.username.strip().lower()
    if db.query(Usuario).filter(Usuario.username == username).first():
        raise HTTPException(status_code=400, detail=f"Ya existe el usuario '{username}'.")

    usuario = Usuario(
        username=username,
        password_hash=hash_password(payload.password),
        nombre_completo=payload.nombre_completo,
        es_admin=payload.es_admin,
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

    es_uno_mismo = usuario.id == actual.id
    cambia_campos_de_admin = payload.activo is not None or payload.es_admin is not None

    # Editar a otra persona, o tocar "activo"/"es_admin" (incluso en uno mismo), requiere admin.
    # Cualquier usuario puede seguir actualizando su propio nombre y contraseña sin ser admin.
    if (not es_uno_mismo or cambia_campos_de_admin) and not actual.es_admin:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador.")

    if payload.activo is False:
        if es_uno_mismo:
            raise HTTPException(status_code=400, detail="No podés desactivar tu propio usuario.")
        activos = db.query(Usuario).filter(Usuario.activo.is_(True)).count()
        if activos <= 1:
            raise HTTPException(status_code=400, detail="No podés desactivar el único usuario activo.")

    if payload.es_admin is False and usuario.es_admin and _sin_admins_restantes(db, usuario.id):
        raise HTTPException(status_code=400, detail="No podés quitarle el rol de administrador al único admin.")

    if payload.nombre_completo is not None:
        usuario.nombre_completo = payload.nombre_completo
    if payload.activo is not None:
        usuario.activo = payload.activo
    if payload.es_admin is not None:
        usuario.es_admin = payload.es_admin
    if payload.password:
        usuario.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", status_code=204, dependencies=[Depends(get_current_admin)])
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
