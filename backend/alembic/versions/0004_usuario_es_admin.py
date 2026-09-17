"""agregar es_admin a usuarios

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-17

"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("es_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE usuarios SET es_admin = TRUE")
    with op.batch_alter_table("usuarios") as batch_op:
        batch_op.alter_column("es_admin", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("usuarios") as batch_op:
        batch_op.drop_column("es_admin")
