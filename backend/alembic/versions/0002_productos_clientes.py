"""tablas productos y clientes + vínculos desde consultas

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-04

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "productos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("producto_nombre", sa.String(200), nullable=False, unique=True),
        sa.Column("categoria", sa.String(100), nullable=False),
        sa.Column("precio_lista", sa.Integer(), nullable=False),
        sa.Column("stock_disponible", sa.Integer(), nullable=False),
        sa.Column("droga_generica", sa.String(200)),
        sa.Column("requiere_receta", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("precio_lista >= 0", name="ck_producto_precio_lista"),
        sa.CheckConstraint("stock_disponible >= 0", name="ck_producto_stock"),
    )

    op.create_table(
        "clientes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("telefono", sa.String(30)),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    conn = op.get_bind()

    # Catálogo inicial de "productos": el registro más reciente de 'consultas'
    # por producto_nombre (mismo criterio que usaba antes app/routers/catalogos.py
    # para derivar el catálogo del historial, ahora se materializa en una tabla real).
    conn.execute(
        sa.text(
            """
            INSERT INTO productos (producto_nombre, categoria, precio_lista, stock_disponible, droga_generica, requiere_receta, activo)
            SELECT producto_nombre, categoria, precio_lista, stock_disponible, droga_generica, requiere_receta, 1
            FROM (
                SELECT
                    producto_nombre, categoria, precio_lista, stock_disponible, droga_generica, requiere_receta,
                    ROW_NUMBER() OVER (PARTITION BY producto_nombre ORDER BY fecha DESC, creado_en DESC) AS rn
                FROM consultas
                WHERE producto_nombre <> 'Desconocido'
            ) recientes
            WHERE rn = 1
            """
        )
    )

    # Clientes iniciales, deduplicados por (nombre, teléfono). Antes cada consulta
    # generaba un cliente_id nuevo aunque fuera la misma persona repitiendo compra.
    conn.execute(
        sa.text(
            """
            INSERT INTO clientes (nombre, telefono, activo)
            SELECT DISTINCT cliente_nombre, NULLIF(cliente_tel, ''), 1
            FROM consultas
            """
        )
    )

    with op.batch_alter_table("consultas") as batch_op:
        batch_op.add_column(sa.Column("producto_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("cliente_ref_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_consultas_producto_id", "productos", ["producto_id"], ["id"])
        batch_op.create_foreign_key("fk_consultas_cliente_ref_id", "clientes", ["cliente_ref_id"], ["id"])

    conn.execute(
        sa.text(
            """
            UPDATE consultas
            SET producto_id = (SELECT p.id FROM productos p WHERE p.producto_nombre = consultas.producto_nombre)
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE consultas
            SET cliente_ref_id = (
                SELECT c.id FROM clientes c
                WHERE c.nombre = consultas.cliente_nombre
                AND (c.telefono = NULLIF(consultas.cliente_tel, '') OR (c.telefono IS NULL AND NULLIF(consultas.cliente_tel, '') IS NULL))
            )
            """
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("consultas") as batch_op:
        batch_op.drop_column("cliente_ref_id")
        batch_op.drop_column("producto_id")
    op.drop_table("clientes")
    op.drop_table("productos")
