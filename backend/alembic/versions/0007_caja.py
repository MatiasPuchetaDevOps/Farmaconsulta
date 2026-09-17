"""tablas caja_sesiones y caja_movimientos

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "caja_sesiones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("estado", sa.String(10), nullable=False, server_default="abierta"),
        sa.Column("monto_inicial", sa.Integer(), nullable=False),
        sa.Column("monto_declarado", sa.Integer()),
        sa.Column("monto_calculado", sa.Integer()),
        sa.Column("diferencia", sa.Integer()),
        sa.Column("abierta_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("cerrada_por_id", sa.Integer(), sa.ForeignKey("usuarios.id")),
        sa.Column("observaciones_apertura", sa.String(300)),
        sa.Column("observaciones_cierre", sa.String(300)),
        sa.Column("abierta_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("cerrada_en", sa.DateTime(timezone=True)),
        sa.CheckConstraint("estado IN ('abierta', 'cerrada')", name="ck_caja_sesion_estado"),
        sa.CheckConstraint("monto_inicial >= 0", name="ck_caja_sesion_monto_inicial"),
    )
    op.create_index(
        "ix_caja_sesiones_una_abierta",
        "caja_sesiones",
        ["estado"],
        unique=True,
        postgresql_where=sa.text("estado = 'abierta'"),
    )

    op.create_table(
        "caja_movimientos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("caja_sesion_id", sa.Integer(), sa.ForeignKey("caja_sesiones.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(10), nullable=False),
        sa.Column("origen", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("monto", sa.Integer(), nullable=False),
        sa.Column("concepto", sa.String(200), nullable=False),
        sa.Column("pedido_id", sa.Integer(), sa.ForeignKey("pedidos.id")),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("tipo IN ('ingreso', 'egreso')", name="ck_caja_movimiento_tipo"),
        sa.CheckConstraint("origen IN ('manual', 'venta', 'venta_cancelada')", name="ck_caja_movimiento_origen"),
        sa.CheckConstraint("monto > 0", name="ck_caja_movimiento_monto"),
    )
    op.create_index("ix_caja_movimientos_caja_sesion_id", "caja_movimientos", ["caja_sesion_id"])


def downgrade() -> None:
    op.drop_table("caja_movimientos")
    op.drop_index("ix_caja_sesiones_una_abierta", table_name="caja_sesiones")
    op.drop_table("caja_sesiones")
