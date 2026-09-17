"""integra caja, receta, CAE simulado y validacion OS en pedidos

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("pedidos") as batch_op:
        batch_op.add_column(sa.Column("plan_afiliado", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("caja_sesion_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("comprobante_numero", sa.String(20), nullable=True))
        batch_op.add_column(sa.Column("cae", sa.String(20), nullable=True))
        batch_op.add_column(sa.Column("cae_vencimiento", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("cae_estado", sa.String(20), nullable=False, server_default="pendiente"))
        batch_op.add_column(sa.Column("cae_motivo_rechazo", sa.String(200), nullable=True))
        batch_op.add_column(sa.Column("cae_intentos", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("validacion_os_resultado", sa.String(20), nullable=True))
        batch_op.add_column(sa.Column("validacion_os_motivo", sa.String(200), nullable=True))
        batch_op.create_foreign_key("fk_pedidos_caja_sesion_id", "caja_sesiones", ["caja_sesion_id"], ["id"])
        batch_op.create_unique_constraint("uq_pedidos_comprobante_numero", ["comprobante_numero"])
        batch_op.create_check_constraint(
            "ck_pedido_cae_estado", "cae_estado IN ('pendiente', 'aprobado', 'rechazado')"
        )

    with op.batch_alter_table("pedidos") as batch_op:
        batch_op.alter_column("cae_estado", server_default=None)
        batch_op.alter_column("cae_intentos", server_default=None)

    with op.batch_alter_table("pedido_items") as batch_op:
        batch_op.add_column(sa.Column("receta_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_pedido_items_receta_id", "recetas", ["receta_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("pedido_items") as batch_op:
        batch_op.drop_constraint("fk_pedido_items_receta_id", type_="foreignkey")
        batch_op.drop_column("receta_id")

    with op.batch_alter_table("pedidos") as batch_op:
        batch_op.drop_constraint("ck_pedido_cae_estado", type_="check")
        batch_op.drop_constraint("uq_pedidos_comprobante_numero", type_="unique")
        batch_op.drop_constraint("fk_pedidos_caja_sesion_id", type_="foreignkey")
        batch_op.drop_column("validacion_os_motivo")
        batch_op.drop_column("validacion_os_resultado")
        batch_op.drop_column("cae_intentos")
        batch_op.drop_column("cae_motivo_rechazo")
        batch_op.drop_column("cae_estado")
        batch_op.drop_column("cae_vencimiento")
        batch_op.drop_column("cae")
        batch_op.drop_column("comprobante_numero")
        batch_op.drop_column("caja_sesion_id")
        batch_op.drop_column("plan_afiliado")
