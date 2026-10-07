"""Export synthetic, read-only UI fixtures; never read an existing database.
Run from backend: python -m seed.export_public_demo
"""
import json
import os
from pathlib import Path
import tempfile


def main():
    with tempfile.TemporaryDirectory(prefix='leap-public-demo-') as directory:
        os.environ['DATABASE_URL'] = f'sqlite:///{directory}/demo.db'
        os.environ['ENVIRONMENT'] = 'development'
        os.environ['DEMO_MODE'] = 'true'
        os.environ['AI_INTERVIEW_ENABLED'] = 'false'
        from fastapi.testclient import TestClient
        from sqlalchemy import select
        from app.database import Base, engine, SessionLocal
        from app.dependencies import get_current_user
        from app.main import app
        from app.models import User, UserRole, Beneficiary, LivelihoodPathway
        from seed.seed_data import seed_demo_data
        Base.metadata.create_all(engine)
        seed_demo_data()
        data = {}
        with SessionLocal() as db, TestClient(app) as client:
            admin = db.scalar(select(User).where(User.role == UserRole.ADMIN))
            app.dependency_overrides[get_current_user] = lambda: admin
            paths = ['/api/field-worker/tasks', '/api/field-worker/beneficiaries?page=1',
                     '/api/reviews?page=1', '/api/dashboard/summary', '/api/dashboard/funnel', '/api/admin/diagnostics']
            for person in db.scalars(select(Beneficiary)):
                paths += [f'/api/beneficiaries/{person.id}']
                paths += [f'/api/beneficiaries/{person.id}/{suffix}' for suffix in ['profile', 'skills', 'pathways', 'outcomes']]
            paths += [f'/api/pathways/{p.id}' for p in db.scalars(select(LivelihoodPathway))]
            for path in paths:
                result = client.get(path)
                if result.status_code == 404: continue
                assert result.status_code == 200, (path, result.status_code)
                data[path] = result.json()
            user = db.scalar(select(User).where(User.role == UserRole.BENEFICIARY))
            person = db.scalar(select(Beneficiary).where(Beneficiary.user_id == user.id))
            data['/api/beneficiaries/me'] = data[f'/api/beneficiaries/{person.id}']
        app.dependency_overrides.clear()
        target = Path(__file__).resolve().parents[2] / 'lib' / 'demo-snapshot.json'
        target.write_text(json.dumps({'notice': 'Synthetic read-only scenario. Not live records or verified availability.', 'responses': data}, ensure_ascii=False, indent=2) + '\n')
        engine.dispose()
        print(f'Exported {len(data)} synthetic responses to {target.name}')


if __name__ == '__main__':
    main()
