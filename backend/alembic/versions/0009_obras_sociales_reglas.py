"""tabla obras_sociales_reglas

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "obras_sociales_reglas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("obra_social", sa.String(150), nullable=False),
        sa.Column("plan_afiliado", sa.String(100)),
        sa.Column("resultado", sa.String(20), nullable=False),
        sa.Column("motivo", sa.String(200)),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("resultado IN ('aprobado', 'rechazado', 'vencido')", name="ck_obra_social_regla_resultado"),
    )
    op.create_index("ix_obras_sociales_reglas_obra_social", "obras_sociales_reglas", ["obra_social"])
    op.create_index(
        "ix_obras_sociales_reglas_obra_social_plan",
        "obras_sociales_reglas",
        ["obra_social", "plan_afiliado"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("obras_sociales_reglas")
