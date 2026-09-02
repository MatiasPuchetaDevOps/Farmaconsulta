"""
seed_usuario.py - FarmaConsulta

Crea (o actualiza la contraseña de) el primer usuario de personal de
farmacia, leyendo SEED_USERNAME y SEED_PASSWORD de las variables de entorno
(nunca hardcodeadas). Reemplaza el login en texto plano que tenía app.py.

Uso: python backend/scripts/seed_usuario.py
"""

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models import Usuario  # noqa: E402
from app.security import hash_password  # noqa: E402


def main():
    username = os.environ.get("SEED_USERNAME")
    password = os.environ.get("SEED_PASSWORD")

    if not username or not password:
        print("Definí SEED_USERNAME y SEED_PASSWORD como variables de entorno antes de correr este script.")
        sys.exit(1)

    db = SessionLocal()
    try:
        usuario = db.query(Usuario).filter(Usuario.username == username).first()
        if usuario is None:
            usuario = Usuario(username=username, password_hash=hash_password(password), nombre_completo="Personal de farmacia")
            db.add(usuario)
            print(f"Usuario '{username}' creado.")
        else:
            usuario.password_hash = hash_password(password)
            print(f"Usuario '{username}' ya existía: contraseña actualizada.")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
