"""reemplaza sincronizacion simulada por ajuste de precios (porcentaje fijo)

Revision ID: 0013
Revises: 0012
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.rename_table("sync_precios_preview", "ajuste_precios_preview")
    op.rename_table("sync_precios_historial", "ajuste_precios_historial")

    op.add_column("ajuste_precios_preview", sa.Column("variacion_pct", sa.Numeric(5, 2), nullable=False, server_default="0"))
    op.drop_column("ajuste_precios_preview", "variacion_pct_min")
    op.drop_column("ajuste_precios_preview", "variacion_pct_max")
    op.alter_column("ajuste_precios_preview", "variacion_pct", server_default=None)

    op.add_column("ajuste_precios_historial", sa.Column("variacion_pct", sa.Numeric(5, 2), nullable=False, server_default="0"))
    op.drop_column("ajuste_precios_historial", "variacion_pct_min")
    op.drop_column("ajuste_precios_historial", "variacion_pct_max")
    op.alter_column("ajuste_precios_historial", "variacion_pct", server_default=None)


def downgrade() -> None:
    op.add_column("ajuste_precios_historial", sa.Column("variacion_pct_min", sa.Numeric(5, 2), nullable=False, server_default="0"))
    op.add_column("ajuste_precios_historial", sa.Column("variacion_pct_max", sa.Numeric(5, 2), nullable=False, server_default="0"))
    op.drop_column("ajuste_precios_historial", "variacion_pct")

    op.add_column("ajuste_precios_preview", sa.Column("variacion_pct_min", sa.Numeric(5, 2), nullable=False, server_default="0"))
    op.add_column("ajuste_precios_preview", sa.Column("variacion_pct_max", sa.Numeric(5, 2), nullable=False, server_default="0"))
    op.drop_column("ajuste_precios_preview", "variacion_pct")

    op.rename_table("ajuste_precios_historial", "sync_precios_historial")
    op.rename_table("ajuste_precios_preview", "sync_precios_preview")
