import pytest
from sqlalchemy import create_engine
from app.config import Settings


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_render_url_uses_installed_driver(scheme):
    settings = Settings(_env_file=None, database_url=f"{scheme}://user:password@localhost/leap")
    engine = create_engine(settings.database_url)
    assert engine.dialect.driver == "psycopg"
    assert engine.url.database == "leap"
    engine.dispose()


def test_sqlite_url_is_preserved():
    assert Settings(_env_file=None, database_url="sqlite://").database_url == "sqlite://"
