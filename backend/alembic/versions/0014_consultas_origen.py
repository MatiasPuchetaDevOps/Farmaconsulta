"""columna origen (mostrador/publico) en consultas

Revision ID: 0014
Revises: 0013
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Todas las consultas históricas se cargaron desde el mostrador (RF-07 público
    # todavía no se registraba), así que el default cubre correctamente los datos existentes.
    op.add_column("consultas", sa.Column("origen", sa.String(20), nullable=False, server_default="mostrador"))
    op.create_check_constraint("ck_consulta_origen", "consultas", "origen IN ('mostrador', 'publico')")
    op.create_index("ix_consultas_origen", "consultas", ["origen"])


def downgrade() -> None:
    op.drop_index("ix_consultas_origen", table_name="consultas")
    op.drop_constraint("ck_consulta_origen", "consultas", type_="check")
    op.drop_column("consultas", "origen")
