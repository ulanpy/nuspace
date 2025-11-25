"""remove product and review tables

Revision ID: a1b2c3d4e5f6
Revises: 5bcd77fc5bda
Create Date: 2025-01-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '5bcd77fc5bda'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Clean up media that still references removed entity types
    op.execute(
        """
        DELETE FROM media
        WHERE entity_type IN ('products', 'community_posts', 'community_comments', 'reviews')
        """
    )

    # Rebuild the entity_type enum to match the Python definition
    op.execute("ALTER TYPE entity_type RENAME TO entity_type_old")
    op.execute(
        "CREATE TYPE entity_type AS ENUM ('community_events', 'communities', 'grade_reports', 'courses', 'tickets', 'messages')"
    )
    op.execute(
        "ALTER TABLE media ALTER COLUMN entity_type TYPE entity_type USING entity_type::text::entity_type"
    )
    op.execute("DROP TYPE entity_type_old")

    # Drop tables in order (child tables first)
    op.drop_table('review_replies')
    op.drop_table('product_reports')
    op.drop_index(op.f('ix_reviews_entity_id'), table_name='reviews')
    op.drop_table('reviews')
    op.drop_index(op.f('ix_products_name'), table_name='products')
    op.drop_table('products')
    op.drop_index(op.f('ix_community_comments_user_sub'), table_name='community_comments')
    op.drop_index(op.f('ix_community_comments_post_id'), table_name='community_comments')
    op.drop_index(op.f('ix_community_comments_parent_id'), table_name='community_comments')
    op.drop_index(op.f('ix_community_comments_deleted_at'), table_name='community_comments')
    op.drop_index(op.f('ix_community_comments_created_at'), table_name='community_comments')
    op.drop_table('community_comments')
    op.drop_index(op.f('ix_community_posts_user_sub'), table_name='community_posts')
    op.drop_index(op.f('ix_community_posts_tag_id'), table_name='community_posts')
    op.drop_index(op.f('ix_community_posts_created_at'), table_name='community_posts')
    op.drop_index(op.f('ix_community_posts_community_id'), table_name='community_posts')
    op.drop_table('community_posts')
    op.drop_table('community_post_tags')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS product_category")
    op.execute("DROP TYPE IF EXISTS product_condition")
    op.execute("DROP TYPE IF EXISTS product_status")
    op.execute("DROP TYPE IF EXISTS reviewable_type")
    op.execute("DROP TYPE IF EXISTS owner_type")


def downgrade() -> None:
    """Downgrade schema."""
    # Rebuild entity_type enum with legacy values
    op.execute("ALTER TYPE entity_type RENAME TO entity_type_new")
    op.execute(
        "CREATE TYPE entity_type AS ENUM ('products', 'community_events', 'communities', 'community_posts', 'reviews', 'community_comments', 'grade_reports', 'courses', 'tickets', 'messages')"
    )
    op.execute(
        "ALTER TABLE media ALTER COLUMN entity_type TYPE entity_type USING entity_type::text::entity_type"
    )
    op.execute("DROP TYPE entity_type_new")

    # Recreate enums
    op.execute("CREATE TYPE product_category AS ENUM ('books', 'electronics', 'clothing', 'furniture', 'appliances', 'sports', 'stationery', 'art_supplies', 'beauty', 'services', 'food', 'tickets', 'transport', 'others')")
    op.execute("CREATE TYPE product_condition AS ENUM ('new', 'like_new', 'used')")
    op.execute("CREATE TYPE product_status AS ENUM ('inactive', 'active')")
    op.execute("CREATE TYPE reviewable_type AS ENUM ('products', 'club_events')")
    op.execute("CREATE TYPE owner_type AS ENUM ('users', 'clubs')")
    
    # Recreate products table
    op.create_table('products',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.String(), nullable=False),
    sa.Column('price', sa.BigInteger(), nullable=False),
    sa.Column('user_sub', sa.String(), nullable=False),
    sa.Column('category', sa.Enum('books', 'electronics', 'clothing', 'furniture', 'appliances', 'sports', 'stationery', 'art_supplies', 'beauty', 'services', 'food', 'tickets', 'transport', 'others', name='product_category'), nullable=False),
    sa.Column('condition', sa.Enum('new', 'like_new', 'used', name='product_condition'), nullable=False),
    sa.Column('status', sa.Enum('inactive', 'active', name='product_status'), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_sub'], ['users.sub'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_name'), 'products', ['name'], unique=False)
    
    # Recreate reviews table
    op.create_table('reviews',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('reviewable_type', sa.Enum('products', 'club_events', name='reviewable_type'), nullable=False),
    sa.Column('entity_id', sa.BigInteger(), nullable=False),
    sa.Column('user_sub', sa.String(), nullable=False),
    sa.Column('rating', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('owner_type', sa.Enum('users', 'clubs', name='owner_type'), nullable=False),
    sa.Column('owner_id', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_sub'], ['users.sub'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reviews_entity_id'), 'reviews', ['entity_id'], unique=False)
    
    # Recreate product_reports table
    op.create_table('product_reports',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_sub', sa.String(), nullable=False),
    sa.Column('product_id', sa.BigInteger(), nullable=False),
    sa.Column('text', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.ForeignKeyConstraint(['user_sub'], ['users.sub'], ),
    sa.PrimaryKeyConstraint('id')
    )
    
    # Recreate review_replies table
    op.create_table('review_replies',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('review_id', sa.BigInteger(), nullable=False),
    sa.Column('user_sub', sa.String(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ),
    sa.ForeignKeyConstraint(['user_sub'], ['users.sub'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('review_id')
    )
    
    # Recreate community_post_tags table
    op.create_table('community_post_tags',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('community_id', sa.BigInteger(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    
    # Recreate community_posts table
    op.create_table('community_posts',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('community_id', sa.BigInteger(), nullable=False),
    sa.Column('user_sub', sa.String(), nullable=True),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('description', sa.String(), nullable=False),
    sa.Column('tag_id', sa.BigInteger(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('from_community', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['tag_id'], ['community_post_tags.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_sub'], ['users.sub'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_community_posts_community_id'), 'community_posts', ['community_id'], unique=False)
    op.create_index(op.f('ix_community_posts_created_at'), 'community_posts', ['created_at'], unique=False)
    op.create_index(op.f('ix_community_posts_tag_id'), 'community_posts', ['tag_id'], unique=False)
    op.create_index(op.f('ix_community_posts_user_sub'), 'community_posts', ['user_sub'], unique=False)
    
    # Recreate community_comments table
    op.create_table('community_comments',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('post_id', sa.BigInteger(), nullable=False),
    sa.Column('parent_id', sa.BigInteger(), nullable=True),
    sa.Column('user_sub', sa.String(), nullable=True),
    sa.Column('content', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['parent_id'], ['community_comments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['post_id'], ['community_posts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_sub'], ['users.sub'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_community_comments_created_at'), 'community_comments', ['created_at'], unique=False)
    op.create_index(op.f('ix_community_comments_deleted_at'), 'community_comments', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_community_comments_parent_id'), 'community_comments', ['parent_id'], unique=False)
    op.create_index(op.f('ix_community_comments_post_id'), 'community_comments', ['post_id'], unique=False)
    op.create_index(op.f('ix_community_comments_user_sub'), 'community_comments', ['user_sub'], unique=False)

