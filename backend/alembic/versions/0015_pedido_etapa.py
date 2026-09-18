"""columna etapa (a_preparar/preparado/entregado/pagado) en pedidos

Revision ID: 0015
Revises: 0014
Create Date: 2026-09-18

"""
from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pedidos", sa.Column("etapa", sa.String(20), nullable=False, server_default="a_preparar"))
    op.create_check_constraint(
        "ck_pedido_etapa", "pedidos", "etapa IN ('a_preparar', 'preparado', 'entregado', 'pagado')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_pedido_etapa", "pedidos", type_="check")
    op.drop_column("pedidos", "etapa")
