"""tablas sync_precios_preview y sync_precios_historial

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sync_precios_preview",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("creado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("filtro_categoria", sa.String(100)),
        sa.Column("variacion_pct_min", sa.Numeric(5, 2), nullable=False),
        sa.Column("variacion_pct_max", sa.Numeric(5, 2), nullable=False),
        sa.Column("propuesta", sa.JSON(), nullable=False),
        sa.Column("aplicada", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sync_precios_historial",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ejecutada_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("cantidad_productos", sa.Integer(), nullable=False),
        sa.Column("variacion_pct_min", sa.Numeric(5, 2), nullable=False),
        sa.Column("variacion_pct_max", sa.Numeric(5, 2), nullable=False),
        sa.Column("aplicada_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("sync_precios_historial")
    op.drop_table("sync_precios_preview")
