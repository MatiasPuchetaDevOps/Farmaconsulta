"""tabla banco_promociones

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None

banco_promociones = sa.table(
    "banco_promociones",
    sa.column("banco", sa.String),
    sa.column("descuento_banco", sa.Numeric),
)


def upgrade() -> None:
    op.create_table(
        "banco_promociones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("banco", sa.String(100), nullable=False, unique=True),
        sa.Column("descuento_banco", sa.Numeric(4, 3), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("descuento_banco >= 0 AND descuento_banco <= 1", name="ck_banco_promocion_rango"),
    )

    # Semilla con los mismos valores que antes estaban hardcodeados en
    # core_logic/calculadora.py, para no cambiar el comportamiento vigente
    # hasta que alguien los edite desde el panel de administración.
    op.bulk_insert(
        banco_promociones,
        [
            {"banco": "Macro", "descuento_banco": 0.10},
            {"banco": "Galicia", "descuento_banco": 0.15},
            {"banco": "Santander", "descuento_banco": 0.20},
            {"banco": "Nación", "descuento_banco": 0.25},
        ],
    )


def downgrade() -> None:
    op.drop_table("banco_promociones")
