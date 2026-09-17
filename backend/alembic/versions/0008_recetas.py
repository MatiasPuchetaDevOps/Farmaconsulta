"""tabla recetas

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recetas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cliente_ref_id", sa.Integer(), sa.ForeignKey("clientes.id"), nullable=False),
        sa.Column("cliente_nombre", sa.String(150), nullable=False),
        sa.Column("cliente_tel", sa.String(30)),
        sa.Column("producto_id", sa.Integer(), sa.ForeignKey("productos.id"), nullable=False),
        sa.Column("producto_nombre", sa.String(200), nullable=False),
        sa.Column("medico_nombre", sa.String(150)),
        sa.Column("medico_matricula", sa.String(60)),
        sa.Column("fecha_emision", sa.Date(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("observaciones", sa.String(300)),
        sa.Column("validada_por_id", sa.Integer(), sa.ForeignKey("usuarios.id")),
        sa.Column("validada_en", sa.DateTime(timezone=True)),
        sa.Column("creado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("pedido_item_id", sa.Integer(), sa.ForeignKey("pedido_items.id"), unique=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("estado IN ('pendiente', 'validada', 'rechazada')", name="ck_receta_estado"),
    )
    op.create_index("ix_recetas_estado", "recetas", ["estado"])
    op.create_index("ix_recetas_cliente_ref_id", "recetas", ["cliente_ref_id"])


def downgrade() -> None:
    op.drop_table("recetas")
