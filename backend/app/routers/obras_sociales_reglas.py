from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core_logic.validacion_os_simulada import simular_validacion_os
from app.database import get_db
from app.deps import get_current_admin, get_current_user
from app.models import ObraSocialRegla
from app.schemas.obras_sociales_reglas import (
    ObraSocialReglaIn,
    ObraSocialReglaOut,
    ValidacionOSOut,
    ValidarObraSocialIn,
)

router = APIRouter(prefix="/api/obras-sociales-reglas", tags=["obras-sociales-reglas"])


def _normalizar(obra_social: str) -> str:
    return obra_social.strip().title()


def _normalizar_plan(plan_afiliado: str | None) -> str | None:
    if plan_afiliado and plan_afiliado.strip():
        return plan_afiliado.strip().title()
    return None


@router.get("", response_model=list[ObraSocialReglaOut], dependencies=[Depends(get_current_admin)])
def listar_reglas(db: Session = Depends(get_db)):
    return db.query(ObraSocialRegla).order_by(ObraSocialRegla.obra_social).all()


@router.post("", response_model=ObraSocialReglaOut, dependencies=[Depends(get_current_admin)])
def crear_regla(payload: ObraSocialReglaIn, db: Session = Depends(get_db)):
    obra_social = _normalizar(payload.obra_social)
    plan_afiliado = _normalizar_plan(payload.plan_afiliado)

    if payload.resultado != "aprobado" and not (payload.motivo or "").strip():
        raise HTTPException(status_code=400, detail="Especificá el motivo para un resultado distinto de 'aprobado'.")

    duplicado = (
        db.query(ObraSocialRegla)
        .filter(ObraSocialRegla.obra_social == obra_social, ObraSocialRegla.plan_afiliado == plan_afiliado)
        .first()
    )
    if duplicado:
        raise HTTPException(status_code=400, detail="Ya existe una regla para esa obra social y plan.")

    regla = ObraSocialRegla(
        obra_social=obra_social,
        plan_afiliado=plan_afiliado,
        resultado=payload.resultado,
        motivo=payload.motivo,
        activo=payload.activo,
    )
    db.add(regla)
    db.commit()
    db.refresh(regla)
    return regla


@router.put("/{regla_id}", response_model=ObraSocialReglaOut, dependencies=[Depends(get_current_admin)])
def editar_regla(regla_id: int, payload: ObraSocialReglaIn, db: Session = Depends(get_db)):
    regla = db.get(ObraSocialRegla, regla_id)
    if regla is None:
        raise HTTPException(status_code=404, detail="Regla no encontrada.")

    if payload.resultado != "aprobado" and not (payload.motivo or "").strip():
        raise HTTPException(status_code=400, detail="Especificá el motivo para un resultado distinto de 'aprobado'.")

    obra_social = _normalizar(payload.obra_social)
    plan_afiliado = _normalizar_plan(payload.plan_afiliado)
    duplicado = (
        db.query(ObraSocialRegla)
        .filter(
            ObraSocialRegla.obra_social == obra_social,
            ObraSocialRegla.plan_afiliado == plan_afiliado,
            ObraSocialRegla.id != regla_id,
        )
        .first()
    )
    if duplicado:
        raise HTTPException(status_code=400, detail="Ya existe una regla para esa obra social y plan.")

    regla.obra_social = obra_social
    regla.plan_afiliado = plan_afiliado
    regla.resultado = payload.resultado
    regla.motivo = payload.motivo
    regla.activo = payload.activo
    db.commit()
    db.refresh(regla)
    return regla


@router.delete("/{regla_id}", status_code=204, dependencies=[Depends(get_current_admin)])
def eliminar_regla(regla_id: int, db: Session = Depends(get_db)):
    regla = db.get(ObraSocialRegla, regla_id)
    if regla is None:
        raise HTTPException(status_code=404, detail="Regla no encontrada.")
    regla.activo = False
    db.commit()


@router.post("/validar", response_model=ValidacionOSOut, dependencies=[Depends(get_current_user)])
def validar_obra_social(payload: ValidarObraSocialIn, db: Session = Depends(get_db)):
    reglas = db.query(ObraSocialRegla).filter(ObraSocialRegla.activo.is_(True)).all()
    tabla_reglas = {(r.obra_social, r.plan_afiliado): (r.resultado, r.motivo) for r in reglas}

    resultado, motivo = simular_validacion_os(payload.obra_social, payload.plan_afiliado, tabla_reglas)
    return ValidacionOSOut(resultado=resultado, motivo=motivo)
