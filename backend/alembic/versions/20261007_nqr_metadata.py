"""Preserve versioned source snapshots and alternative eligibility routes.

Revision ID: 20261007_nqr_metadata
Revises: 342db47bc5d6
"""
from alembic import op
import sqlalchemy as sa

revision = '20261007_nqr_metadata'
down_revision = '342db47bc5d6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('qualifications', sa.Column('source_metadata', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('qualifications', 'source_metadata')
