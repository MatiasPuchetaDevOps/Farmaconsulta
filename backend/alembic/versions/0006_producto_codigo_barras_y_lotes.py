"""codigo_barras en productos y tabla lotes

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("codigo_barras", sa.String(64), nullable=True))
    op.create_index("ix_productos_codigo_barras", "productos", ["codigo_barras"], unique=True)

    op.create_table(
        "lotes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("producto_id", sa.Integer(), sa.ForeignKey("productos.id"), nullable=False),
        sa.Column("numero_lote", sa.String(60), nullable=False),
        sa.Column("vencimiento", sa.Date(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("cantidad >= 0", name="ck_lote_cantidad"),
    )
    op.create_index("ix_lotes_producto_id", "lotes", ["producto_id"])
    op.create_index("ix_lotes_vencimiento", "lotes", ["vencimiento"])
    op.create_index("ix_lotes_producto_numero_lote", "lotes", ["producto_id", "numero_lote"], unique=True)


def downgrade() -> None:
    op.drop_table("lotes")
    op.drop_index("ix_productos_codigo_barras", table_name="productos")
    op.drop_column("productos", "codigo_barras")
