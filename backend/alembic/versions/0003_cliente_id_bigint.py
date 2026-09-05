"""ampliar consultas.cliente_id a bigint

El dataset original trae cliente_id como un identificador numérico grande
(hasta ~15.600 millones), fuera de rango para un Integer de 32 bits. En
SQLite pasaba desapercibido porque no valida el rango, pero Postgres lo
rechaza.

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("consultas") as batch_op:
        batch_op.alter_column("cliente_id", type_=sa.BigInteger(), existing_type=sa.Integer(), existing_nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("consultas") as batch_op:
        batch_op.alter_column("cliente_id", type_=sa.Integer(), existing_type=sa.BigInteger(), existing_nullable=False)
