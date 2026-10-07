"""Store qualification-scoped, self-reported entry-route facts."""
from alembic import op
import sqlalchemy as sa

revision = "20261007_eligibility_facts"
down_revision = "20261007_nqr_metadata"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("livelihood_profiles", sa.Column("eligibility_facts", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("livelihood_profiles", "eligibility_facts")
