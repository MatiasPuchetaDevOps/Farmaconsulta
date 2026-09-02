"""tablas iniciales: usuarios, planes_descuento, consultas

Revision ID: 0001
Revises:
Create Date: 2026-09-02

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(50), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("nombre_completo", sa.String(150)),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "planes_descuento",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("obra_social", sa.String(150), nullable=False, unique=True),
        sa.Column("descuento_os", sa.Numeric(4, 3), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("descuento_os >= 0 AND descuento_os <= 1", name="ck_plan_descuento_rango"),
    )

    op.create_table(
        "consultas",
        sa.Column("id_consulta", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("cliente_id", sa.Integer(), nullable=False),
        sa.Column("cliente_nombre", sa.String(150), nullable=False),
        sa.Column("cliente_tel", sa.String(30)),
        sa.Column("obra_social", sa.String(150), nullable=False),
        sa.Column("plan_afiliado", sa.String(100)),
        sa.Column("producto_nombre", sa.String(200), nullable=False),
        sa.Column("droga_generica", sa.String(200)),
        sa.Column("precio_lista", sa.Integer(), nullable=False),
        sa.Column("descuento_os", sa.Numeric(4, 3), nullable=False),
        sa.Column("metodo_pago", sa.String(60), nullable=False),
        sa.Column("descuento_banco", sa.Numeric(4, 3), nullable=False),
        sa.Column("banco_promocion", sa.String(100)),
        sa.Column("stock_disponible", sa.Integer(), nullable=False),
        sa.Column("categoria", sa.String(100), nullable=False),
        sa.Column("requiere_receta", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("precio_final", sa.Integer(), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("precio_lista >= 0", name="ck_consulta_precio_lista"),
        sa.CheckConstraint("precio_final >= 0", name="ck_consulta_precio_final"),
        sa.CheckConstraint("stock_disponible >= 0", name="ck_consulta_stock"),
    )
    op.create_index("ix_consultas_fecha", "consultas", ["fecha"])
    op.create_index("ix_consultas_obra_social", "consultas", ["obra_social"])
    op.create_index("ix_consultas_producto_nombre", "consultas", ["producto_nombre"])
    op.create_index("ix_consultas_categoria", "consultas", ["categoria"])
    op.create_index("ix_consultas_producto_fecha", "consultas", ["producto_nombre", "fecha"])


def downgrade() -> None:
    op.drop_table("consultas")
    op.drop_table("planes_descuento")
    op.drop_table("usuarios")
