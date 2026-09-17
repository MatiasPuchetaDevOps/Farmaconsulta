"""tablas pedidos y pedido_items

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pedidos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cliente_ref_id", sa.Integer(), sa.ForeignKey("clientes.id"), nullable=False),
        sa.Column("cliente_nombre", sa.String(150), nullable=False),
        sa.Column("cliente_tel", sa.String(30)),
        sa.Column("obra_social", sa.String(150), nullable=False),
        sa.Column("metodo_pago", sa.String(60), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="confirmado"),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id")),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("cancelado_en", sa.DateTime(timezone=True)),
        sa.CheckConstraint("estado IN ('confirmado', 'cancelado')", name="ck_pedido_estado"),
        sa.CheckConstraint("total >= 0", name="ck_pedido_total"),
    )

    op.create_table(
        "pedido_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pedido_id", sa.Integer(), sa.ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("producto_id", sa.Integer(), sa.ForeignKey("productos.id"), nullable=False),
        sa.Column("producto_nombre", sa.String(200), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column("precio_lista", sa.Integer(), nullable=False),
        sa.Column("descuento_os", sa.Numeric(4, 3), nullable=False),
        sa.Column("descuento_banco", sa.Numeric(4, 3), nullable=False),
        sa.Column("precio_final_unitario", sa.Integer(), nullable=False),
        sa.Column("subtotal", sa.Integer(), nullable=False),
        sa.CheckConstraint("cantidad > 0", name="ck_pedido_item_cantidad"),
        sa.CheckConstraint("precio_lista >= 0", name="ck_pedido_item_precio_lista"),
        sa.CheckConstraint("precio_final_unitario >= 0", name="ck_pedido_item_precio_final"),
        sa.CheckConstraint("subtotal >= 0", name="ck_pedido_item_subtotal"),
    )
    op.create_index("ix_pedido_items_pedido_id", "pedido_items", ["pedido_id"])


def downgrade() -> None:
    op.drop_table("pedido_items")
    op.drop_table("pedidos")
