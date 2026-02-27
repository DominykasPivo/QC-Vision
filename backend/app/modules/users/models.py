from sqlalchemy import Column, Integer, Text

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(Text, unique=True, nullable=False, index=True)
    role = Column(Text, nullable=False, server_default="user")  # user|reviewer|admin
