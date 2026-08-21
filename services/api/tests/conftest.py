import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, UUID
from pgvector.sqlalchemy import Vector

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import get_db
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

# Teach SQLite how to compile Postgres-specific types during tests
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

@compiles(Vector, "sqlite")
def compile_vector_sqlite(type_, compiler, **kw):
    return "TEXT"

# Import all models to ensure all tables exist in Base.metadata
from app.models import (
    User, DoctorLicense, PharmacyProfile, Permission, AdminPermission,
    RefreshToken, AccountStatusHistory, SavedAddress,
    Document, Prescription, ExtractedField, Report, ReportValue,
    ReportAccessGrant, VerificationAction,
    MedicineCatalogItem, OwnedInventoryStock, PartnerPharmacy,
    PartnerStock, GenericEquivalentMap,
    Cart, CartItem, Order, OrderLineItem, FulfillmentRecord,
    RoutingDecision, OrderDispute,
    PaymentIntent, PaymentCapture, Refund, PayoutLedger,
    NotificationEvent, DeliveryLog, UserChannelPreference,
    ConsentRecord, ChatSession, ChatMessage, KnowledgeEmbedding,
    AuditLogEntry, ComplianceOverride, PlatformSetting
)

# SQLite in-memory database for fast, isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

import uuid as _uuid
from sqlalchemy import event

@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    dbapi_connection.create_function("gen_random_uuid", 0, lambda: str(_uuid.uuid4()))

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(autouse=True)
def clean_db():
    # Clean tables after each test run
    yield
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(autouse=True)
def override_deps():
    def _get_test_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()
