from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, date
import jwt
from passlib.context import CryptContext
import httpx
from enum import Enum
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'revision_med_db')]

# JWT Configuration - JWT_SECRET must be set in production
SECRET_KEY = os.environ.get('JWT_SECRET')
if not SECRET_KEY:
    print("WARNING: JWT_SECRET not set, using development default - NOT SAFE FOR PRODUCTION")
    SECRET_KEY = 'dev-only-secret-key-change-in-production'
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI(title="RevisionMed API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =====================================
# ENUMS
# =====================================
class RevisionMethod(str, Enum):
    J_METHOD = "j_method"
    SRS = "srs"
    TOURS = "tours"
    NONE = "none"

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class SessionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    LATE = "late"

# =====================================
# PYDANTIC MODELS
# =====================================

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    id_token: str
    email: EmailStr
    name: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime
    settings: Dict[str, Any] = {}
    profile_photo: Optional[str] = None
    photo_type: Optional[str] = None
    avatar_id: Optional[str] = None

# Catalog Models
class CatalogItemCreate(BaseModel):
    title: str
    parent_id: Optional[str] = None
    order: int = 0
    description: Optional[str] = None
    color: str = "#3B82F6"

class CatalogItemUpdate(BaseModel):
    title: Optional[str] = None
    parent_id: Optional[str] = None
    order: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None

class CatalogItemResponse(BaseModel):
    id: str
    title: str
    parent_id: Optional[str] = None
    order: int
    description: Optional[str] = None
    level: int = 0
    children_count: int = 0
    created_at: datetime
    is_personal: bool = False  # True if created by user
    owner_id: Optional[str] = None  # User ID if personal
    is_hidden: bool = False  # If user hid this admin course
    color: str = "#3B82F6"
    section_id: Optional[str] = None  # Custom section ID

# Personal course create model
class PersonalCourseCreate(BaseModel):
    title: str
    parent_id: Optional[str] = None  # Can be under an existing chapter
    description: Optional[str] = None
    color: str = "#3B82F6"
    section_id: Optional[str] = None

# Hidden items model
class HiddenItemCreate(BaseModel):
    item_id: str

# Custom Section model
class CustomSectionCreate(BaseModel):
    name: str
    color: str = "#8B5CF6"

class CustomSectionResponse(BaseModel):
    id: str
    user_id: str
    name: str
    color: str
    order: int
    created_at: datetime

# User color preferences
class UserColorPreference(BaseModel):
    item_id: str
    color: str

# User Item Settings (revision method per course)
class JMethodSettings(BaseModel):
    start_date: str  # ISO date string
    intervals: List[int] = [0, 1, 3, 7, 14, 30, 60, 120]
    recurring_interval: int = 150

class SRSSettings(BaseModel):
    easiness_factor: float = 2.5
    interval: int = 1
    repetitions: int = 0
    next_review: Optional[str] = None

class ToursSettings(BaseModel):
    total_tours: int = 3
    tour_durations: List[int] = [30, 30, 30]  # days per tour
    current_tour: int = 1

class UserItemSettingsCreate(BaseModel):
    item_id: str
    method: RevisionMethod
    j_settings: Optional[JMethodSettings] = None
    srs_settings: Optional[SRSSettings] = None
    tours_settings: Optional[ToursSettings] = None

class UserItemSettingsResponse(BaseModel):
    id: str
    user_id: str
    item_id: str
    method: RevisionMethod
    j_settings: Optional[Dict] = None
    srs_settings: Optional[Dict] = None
    tours_settings: Optional[Dict] = None
    created_at: datetime
    updated_at: datetime

# Study Session Models
class StudySessionResponse(BaseModel):
    id: str
    user_id: str
    item_id: str
    item_title: str
    scheduled_date: str
    method: RevisionMethod
    status: SessionStatus
    j_day: Optional[int] = None
    tour_number: Optional[int] = None
    srs_rating: Optional[int] = None
    scheduled_time: Optional[str] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

class CompleteSessionRequest(BaseModel):
    srs_rating: Optional[int] = None  # 0-5 for SRS
    notes: Optional[str] = None

# Personal Event Models
class RecurrenceRule(BaseModel):
    frequency: str  # daily, weekly, monthly, yearly
    interval: int = 1
    end_date: Optional[str] = None
    count: Optional[int] = None
    days_of_week: Optional[List[int]] = None  # 0=Monday, 6=Sunday

class PersonalEventCreate(BaseModel):
    title: str
    start_time: str  # ISO datetime
    end_time: str  # ISO datetime
    description: Optional[str] = None
    recurrence: Optional[RecurrenceRule] = None
    color: str = "#3B82F6"

class PersonalEventResponse(BaseModel):
    id: str
    user_id: str
    title: str
    start_time: str
    end_time: str
    description: Optional[str] = None
    recurrence: Optional[Dict] = None
    color: str
    created_at: datetime

# ICS Subscription Models
class ICSSubscriptionCreate(BaseModel):
    name: str
    url: str
    color: str = "#10B981"

class ICSSubscriptionResponse(BaseModel):
    id: str
    user_id: str
    name: str
    url: str
    color: str
    last_synced: Optional[datetime] = None
    created_at: datetime

class ICSEventResponse(BaseModel):
    id: str
    subscription_id: str
    uid: str
    title: str
    start_time: str
    end_time: str
    description: Optional[str] = None
    location: Optional[str] = None

# Item Notes
class ItemNoteCreate(BaseModel):
    item_id: str
    content: str

class ItemNoteResponse(BaseModel):
    id: str
    user_id: str
    item_id: str
    content: str
    created_at: datetime
    updated_at: datetime

# =====================================
# AUTHENTICATION HELPERS
# =====================================
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return user

# =====================================
# ALGORITHM HELPERS
# =====================================

# J-Method intervals
J_METHOD_INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120]
J_METHOD_RECURRING = 150

def calculate_j_method_dates(start_date: date, intervals: List[int] = None) -> List[date]:
    """Calculate all review dates for J-Method"""
    if intervals is None:
        intervals = J_METHOD_INTERVALS
    return [start_date + timedelta(days=i) for i in intervals]

def calculate_sm2(quality: int, easiness_factor: float, interval: int, repetitions: int) -> tuple:
    """
    SM-2 Algorithm for SRS
    quality: 0-5 (0-2 = fail, 3-5 = pass)
    Returns: (new_easiness_factor, new_interval, new_repetitions)
    """
    if quality < 3:
        # Failed - reset
        return (easiness_factor, 1, 0)
    
    # Calculate new easiness factor
    new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ef = max(1.3, new_ef)  # Minimum EF is 1.3
    
    # Calculate new interval
    if repetitions == 0:
        new_interval = 1
    elif repetitions == 1:
        new_interval = 6
    else:
        new_interval = int(interval * new_ef)
    
    return (new_ef, new_interval, repetitions + 1)

def distribute_tours_items(item_ids: List[str], tour_durations: List[int], start_date: date) -> Dict[str, List[Dict]]:
    """
    Distribute items across tours evenly
    Returns: {item_id: [{tour: 1, date: date}, ...]}
    """
    distribution = {}
    current_date = start_date
    
    for tour_num, duration in enumerate(tour_durations, 1):
        items_per_day = max(1, len(item_ids) // duration)
        day_offset = 0
        
        for i, item_id in enumerate(item_ids):
            if item_id not in distribution:
                distribution[item_id] = []
            
            session_date = current_date + timedelta(days=(i // items_per_day))
            if session_date > current_date + timedelta(days=duration - 1):
                session_date = current_date + timedelta(days=duration - 1)
            
            distribution[item_id].append({
                "tour": tour_num,
                "date": session_date.isoformat()
            })
        
        current_date += timedelta(days=duration)
    
    return distribution

# =====================================
# AUTH ROUTES
# =====================================
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": UserRole.USER,
        "created_at": datetime.utcnow(),
        "settings": {}
    }
    await db.users.insert_one(user)
    
    # Create token
    token = create_access_token({"sub": user_id})
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "created_at": user["created_at"].isoformat(),
        "settings": user.get("settings", {})
    }
    
    return {"access_token": token, "token_type": "bearer", "user": user_response}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    # Check both 'hashed_password' (new) and 'password' (legacy) fields
    stored_password = user.get("hashed_password") or user.get("password", "") if user else ""
    if not user or not verify_password(credentials.password, stored_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Check if user is blocked
    if user.get("is_blocked"):
        raise HTTPException(status_code=403, detail="Votre compte a été bloqué. Contactez l'administrateur.")
    
    # Update last login
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": datetime.utcnow()}})
    
    token = create_access_token({"sub": user["id"]})
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", user["email"].split("@")[0]),
        "role": user.get("role", UserRole.USER),
        "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else user["created_at"],
        "settings": user.get("settings", {}),
        "profile_photo": user.get("profile_photo"),
        "photo_type": user.get("photo_type"),
        "avatar_id": user.get("avatar_id")
    }
    
    return {"access_token": token, "token_type": "bearer", "user": user_response}

@api_router.post("/auth/google")
async def google_auth(auth_data: GoogleAuthRequest):
    """Handle Google OAuth authentication"""
    # Find or create user
    user = await db.users.find_one({"email": auth_data.email})
    
    if not user:
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "email": auth_data.email,
            "password": None,  # No password for Google auth
            "name": auth_data.name,
            "role": UserRole.USER,
            "google_id": auth_data.id_token[:50],  # Store partial for reference
            "created_at": datetime.utcnow(),
            "settings": {}
        }
        await db.users.insert_one(user)
    
    token = create_access_token({"sub": user["id"]})
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else user["created_at"],
        "settings": user.get("settings", {})
    }
    
    return {"access_token": token, "token_type": "bearer", "user": user_response}

# =====================================
# PASSWORD RESET ENDPOINTS
# =====================================
import secrets
import string

def generate_temp_password(length=12):
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request a password reset - directs user to contact admin"""
    # Always return the same message to prevent email enumeration
    return {
        "message": "Pour réinitialiser votre mot de passe, veuillez contacter l'administrateur.",
        "contact_admin": True
    }

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token - kept for compatibility but now admin-only"""
    # Find valid reset token
    reset_record = await db.password_resets.find_one({
        "token": request.token,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    # Update password
    hashed_password = pwd_context.hash(request.new_password)
    await db.users.update_one(
        {"id": reset_record["user_id"]},
        {"$set": {"password": hashed_password}}
    )
    
    # Delete used token
    await db.password_resets.delete_one({"token": request.token})
    
    return {"message": "Mot de passe réinitialisé avec succès"}

@api_router.get("/auth/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    reset_record = await db.password_resets.find_one({
        "token": token,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    
    return {"valid": True}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user.get("name", user["email"].split("@")[0]),
        role=user["role"],
        created_at=user["created_at"],
        settings=user.get("settings", {}),
        profile_photo=user.get("profile_photo"),
        photo_type=user.get("photo_type"),
        avatar_id=user.get("avatar_id")
    )

# =====================================
# ADMIN: CATALOG MANAGEMENT
# =====================================
@api_router.post("/admin/catalog", response_model=CatalogItemResponse)
async def create_catalog_item(item: CatalogItemCreate, admin: dict = Depends(get_admin_user)):
    # Calculate level
    level = 0
    if item.parent_id:
        parent = await db.catalog_items.find_one({"id": item.parent_id})
        if parent:
            level = parent.get("level", 0) + 1
    
    item_id = str(uuid.uuid4())
    catalog_item = {
        "id": item_id,
        "title": item.title,
        "parent_id": item.parent_id,
        "order": item.order,
        "description": item.description,
        "level": level,
        "created_at": datetime.utcnow()
    }
    await db.catalog_items.insert_one(catalog_item)
    
    # Count children
    children_count = await db.catalog_items.count_documents({"parent_id": item_id})
    
    return CatalogItemResponse(
        id=item_id,
        title=item.title,
        parent_id=item.parent_id,
        order=item.order,
        description=item.description,
        level=level,
        children_count=children_count,
        created_at=catalog_item["created_at"]
    )

@api_router.put("/admin/catalog/{item_id}", response_model=CatalogItemResponse)
async def update_catalog_item(item_id: str, item: CatalogItemUpdate, admin: dict = Depends(get_admin_user)):
    existing = await db.catalog_items.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    update_data = {k: v for k, v in item.dict().items() if v is not None}
    if update_data:
        await db.catalog_items.update_one({"id": item_id}, {"$set": update_data})
    
    updated = await db.catalog_items.find_one({"id": item_id})
    children_count = await db.catalog_items.count_documents({"parent_id": item_id})
    
    return CatalogItemResponse(
        id=updated["id"],
        title=updated["title"],
        parent_id=updated.get("parent_id"),
        order=updated.get("order", 0),
        description=updated.get("description"),
        level=updated.get("level", 0),
        children_count=children_count,
        created_at=updated["created_at"]
    )

@api_router.delete("/admin/catalog/{item_id}")
async def delete_catalog_item(item_id: str, admin: dict = Depends(get_admin_user)):
    # Delete item and all children recursively
    async def delete_recursive(parent_id: str):
        children = await db.catalog_items.find({"parent_id": parent_id}).to_list(1000)
        for child in children:
            await delete_recursive(child["id"])
        await db.catalog_items.delete_one({"id": parent_id})
    
    await delete_recursive(item_id)
    return {"message": "Item supprimé"}

@api_router.post("/admin/make-admin/{user_id}")
async def make_admin(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": UserRole.ADMIN}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": "Utilisateur promu admin"}

# =====================================
# CATALOG (PUBLIC)
# =====================================
@api_router.get("/catalog", response_model=List[CatalogItemResponse])
async def get_catalog(parent_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get catalog items - includes admin items (not hidden) and user's personal items"""
    user_id = user["id"]
    
    # Get user's hidden items
    hidden_items = await db.hidden_items.find({"user_id": user_id}).to_list(1000)
    hidden_ids = {h["item_id"] for h in hidden_items}
    
    # Query admin items (no owner_id) that are not hidden
    query = {"parent_id": parent_id, "$or": [{"owner_id": None}, {"owner_id": {"$exists": False}}, {"owner_id": user_id}]}
    items = await db.catalog_items.find(query).sort("order", 1).to_list(1000)
    
    # Pre-aggregate children counts to avoid N+1 query problem
    item_ids = [item["id"] for item in items]
    children_counts = await db.catalog_items.aggregate([
        {"$match": {"parent_id": {"$in": item_ids}}},
        {"$group": {"_id": "$parent_id", "count": {"$sum": 1}}}
    ]).to_list(1000)
    children_map = {c["_id"]: c["count"] for c in children_counts}
    
    result = []
    for item in items:
        # Skip if hidden by user (only for admin items)
        if item["id"] in hidden_ids and not item.get("owner_id"):
            continue
            
        children_count = children_map.get(item["id"], 0)
        result.append(CatalogItemResponse(
            id=item["id"],
            title=item["title"],
            parent_id=item.get("parent_id"),
            order=item.get("order", 0),
            description=item.get("description"),
            level=item.get("level", 0),
            children_count=children_count,
            created_at=item["created_at"],
            is_personal=item.get("owner_id") == user_id,
            owner_id=item.get("owner_id"),
            is_hidden=item["id"] in hidden_ids
        ))
    
    return result

@api_router.get("/catalog/all")
async def get_all_catalog(user: dict = Depends(get_current_user)):
    """Get all catalog items in a flat list - includes user's personal items"""
    user_id = user["id"]
    
    # Get user's hidden items
    hidden_items = await db.hidden_items.find({"user_id": user_id}).to_list(1000)
    hidden_ids = {h["item_id"] for h in hidden_items}
    
    # Get admin items + user's personal items
    items = await db.catalog_items.find({
        "$or": [{"owner_id": None}, {"owner_id": {"$exists": False}}, {"owner_id": user_id}]
    }).sort([("level", 1), ("order", 1)]).to_list(1000)
    
    # Pre-aggregate children counts to avoid N+1 query problem
    item_ids = [item["id"] for item in items]
    children_counts = await db.catalog_items.aggregate([
        {"$match": {"parent_id": {"$in": item_ids}}},
        {"$group": {"_id": "$parent_id", "count": {"$sum": 1}}}
    ]).to_list(1000)
    children_map = {c["_id"]: c["count"] for c in children_counts}
    
    result = []
    for item in items:
        # Skip if hidden by user (only for admin items)
        if item["id"] in hidden_ids and not item.get("owner_id"):
            continue
            
        children_count = children_map.get(item["id"], 0)
        result.append({
            "id": item["id"],
            "title": item["title"],
            "parent_id": item.get("parent_id"),
            "order": item.get("order", 0),
            "description": item.get("description"),
            "level": item.get("level", 0),
            "children_count": children_count,
            "created_at": item["created_at"].isoformat() if isinstance(item["created_at"], datetime) else item["created_at"],
            "is_personal": item.get("owner_id") == user_id,
            "owner_id": item.get("owner_id"),
            "is_hidden": item["id"] in hidden_ids
        })
    
    return result

@api_router.get("/catalog/{item_id}")
async def get_catalog_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.catalog_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    # Check access
    if item.get("owner_id") and item.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    children_count = await db.catalog_items.count_documents({"parent_id": item_id})
    
    return {
        "id": item["id"],
        "title": item["title"],
        "parent_id": item.get("parent_id"),
        "order": item.get("order", 0),
        "description": item.get("description"),
        "level": item.get("level", 0),
        "children_count": children_count,
        "created_at": item["created_at"].isoformat() if isinstance(item["created_at"], datetime) else item["created_at"],
        "is_personal": item.get("owner_id") == user["id"],
        "owner_id": item.get("owner_id")
    }

# =====================================
# USER PERSONAL COURSES
# =====================================
@api_router.post("/user/courses")
async def create_personal_course(course: PersonalCourseCreate, user: dict = Depends(get_current_user)):
    """Create a personal course for the user"""
    user_id = user["id"]
    
    # Calculate level
    level = 0
    if course.parent_id:
        parent = await db.catalog_items.find_one({"id": course.parent_id})
        if parent:
            level = parent.get("level", 0) + 1
    
    # Count existing items at this level for ordering
    order = await db.catalog_items.count_documents({
        "parent_id": course.parent_id,
        "$or": [{"owner_id": None}, {"owner_id": {"$exists": False}}, {"owner_id": user_id}]
    })
    
    item_id = str(uuid.uuid4())
    catalog_item = {
        "id": item_id,
        "title": course.title,
        "parent_id": course.parent_id,
        "order": order,
        "description": course.description,
        "level": level,
        "owner_id": user_id,  # Mark as personal
        "created_at": datetime.utcnow()
    }
    await db.catalog_items.insert_one(catalog_item)
    
    return {
        "id": item_id,
        "title": course.title,
        "parent_id": course.parent_id,
        "order": order,
        "description": course.description,
        "level": level,
        "children_count": 0,
        "created_at": catalog_item["created_at"].isoformat(),
        "is_personal": True,
        "owner_id": user_id
    }

@api_router.delete("/user/courses/{item_id}")
async def delete_personal_course(item_id: str, user: dict = Depends(get_current_user)):
    """Delete a personal course"""
    item = await db.catalog_items.find_one({"id": item_id, "owner_id": user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Cours personnel non trouvé")
    
    # Delete item and children
    async def delete_recursive(parent_id: str):
        children = await db.catalog_items.find({"parent_id": parent_id, "owner_id": user["id"]}).to_list(1000)
        for child in children:
            await delete_recursive(child["id"])
        await db.catalog_items.delete_one({"id": parent_id, "owner_id": user["id"]})
        # Also delete related sessions and settings
        await db.study_sessions.delete_many({"user_id": user["id"], "item_id": parent_id})
        await db.user_item_settings.delete_many({"user_id": user["id"], "item_id": parent_id})
    
    await delete_recursive(item_id)
    return {"message": "Cours personnel supprimé"}

# Course/Chapter Rename Model
class ItemRename(BaseModel):
    title: str

@api_router.put("/user/courses/{item_id}")
async def update_personal_course(item_id: str, data: ItemRename, user: dict = Depends(get_current_user)):
    """Update a personal course title"""
    item = await db.catalog_items.find_one({"id": item_id, "owner_id": user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Cours personnel non trouvé")
    
    await db.catalog_items.update_one(
        {"id": item_id, "owner_id": user["id"]},
        {"$set": {"title": data.title}}
    )
    
    # Also update title in study sessions
    await db.study_sessions.update_many(
        {"user_id": user["id"], "item_id": item_id},
        {"$set": {"item_title": data.title}}
    )
    
    return {"message": "Cours mis à jour", "title": data.title}

# =====================================
# HIDDEN ITEMS (User can hide admin courses)
# =====================================
@api_router.post("/user/hidden")
async def hide_item(hidden: HiddenItemCreate, user: dict = Depends(get_current_user)):
    """Hide an admin course for this user - works for any course including admin courses"""
    user_id = user["id"]
    
    # Check item exists
    item = await db.catalog_items.find_one({"id": hidden.item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item non trouvé")
    
    # If it's a personal course, just delete it
    if item.get("owner_id") == user_id:
        # Delete personal course
        async def delete_recursive(parent_id: str):
            children = await db.catalog_items.find({"parent_id": parent_id, "owner_id": user_id}).to_list(1000)
            for child in children:
                await delete_recursive(child["id"])
            await db.catalog_items.delete_one({"id": parent_id, "owner_id": user_id})
            await db.study_sessions.delete_many({"user_id": user_id, "item_id": parent_id})
            await db.user_item_settings.delete_many({"user_id": user_id, "item_id": parent_id})
        await delete_recursive(hidden.item_id)
        return {"message": "Cours personnel supprimé"}
    
    # For admin courses, hide them
    existing = await db.hidden_items.find_one({"user_id": user_id, "item_id": hidden.item_id})
    if existing:
        return {"message": "Déjà masqué"}
    
    await db.hidden_items.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "item_id": hidden.item_id,
        "created_at": datetime.utcnow()
    })
    
    # Also delete related sessions and settings for this user
    await db.study_sessions.delete_many({"user_id": user_id, "item_id": hidden.item_id})
    await db.user_item_settings.delete_many({"user_id": user_id, "item_id": hidden.item_id})
    
    # Hide all children too
    children = await db.catalog_items.find({"parent_id": hidden.item_id}).to_list(1000)
    for child in children:
        existing_child = await db.hidden_items.find_one({"user_id": user_id, "item_id": child["id"]})
        if not existing_child:
            await db.hidden_items.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "item_id": child["id"],
                "created_at": datetime.utcnow()
            })
            await db.study_sessions.delete_many({"user_id": user_id, "item_id": child["id"]})
            await db.user_item_settings.delete_many({"user_id": user_id, "item_id": child["id"]})
    
    return {"message": "Cours masqué"}

@api_router.delete("/user/hidden/{item_id}")
async def unhide_item(item_id: str, user: dict = Depends(get_current_user)):
    """Unhide (restore) an admin course for this user"""
    result = await db.hidden_items.delete_one({"user_id": user["id"], "item_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item non masqué")
    
    # Also unhide children
    item = await db.catalog_items.find_one({"id": item_id})
    if item:
        children = await db.catalog_items.find({"parent_id": item_id}).to_list(1000)
        for child in children:
            await db.hidden_items.delete_many({"user_id": user["id"], "item_id": child["id"]})
    
    return {"message": "Cours restauré"}

@api_router.get("/user/hidden")
async def get_hidden_items(user: dict = Depends(get_current_user)):
    """Get list of hidden items with details"""
    user_id = user["id"]
    hidden = await db.hidden_items.find({"user_id": user_id}).to_list(1000)
    hidden_ids = [h["item_id"] for h in hidden]
    
    # Get item details for hidden items
    result = []
    for item_id in hidden_ids:
        item = await db.catalog_items.find_one({"id": item_id})
        if item:
            result.append({
                "id": item["id"],
                "title": item["title"],
                "level": item.get("level", 0),
                "parent_id": item.get("parent_id"),
                "is_personal": bool(item.get("owner_id"))
            })
    
    return result

# =====================================
# CUSTOM SECTIONS
# =====================================
@api_router.post("/user/sections")
async def create_section(section: CustomSectionCreate, user: dict = Depends(get_current_user)):
    """Create a custom section for organizing courses"""
    user_id = user["id"]
    
    # Get order
    order = await db.custom_sections.count_documents({"user_id": user_id})
    
    section_id = str(uuid.uuid4())
    section_data = {
        "id": section_id,
        "user_id": user_id,
        "name": section.name,
        "color": section.color,
        "order": order,
        "created_at": datetime.utcnow()
    }
    await db.custom_sections.insert_one(section_data)
    
    return {
        "id": section_id,
        "user_id": user_id,
        "name": section.name,
        "color": section.color,
        "order": order,
        "created_at": section_data["created_at"].isoformat()
    }

@api_router.get("/user/sections")
async def get_sections(user: dict = Depends(get_current_user)):
    """Get user's custom sections"""
    sections = await db.custom_sections.find({"user_id": user["id"]}).sort("order", 1).to_list(100)
    return [{
        "id": s["id"],
        "user_id": s["user_id"],
        "name": s["name"],
        "color": s["color"],
        "order": s["order"],
        "created_at": s["created_at"].isoformat() if isinstance(s["created_at"], datetime) else s["created_at"]
    } for s in sections]

@api_router.put("/user/sections/{section_id}")
async def update_section(section_id: str, section: CustomSectionCreate, user: dict = Depends(get_current_user)):
    """Update a custom section"""
    result = await db.custom_sections.update_one(
        {"id": section_id, "user_id": user["id"]},
        {"$set": {"name": section.name, "color": section.color}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    return {"message": "Section mise à jour"}

@api_router.delete("/user/sections/{section_id}")
async def delete_section(section_id: str, user: dict = Depends(get_current_user)):
    """Delete a custom section"""
    result = await db.custom_sections.delete_one({"id": section_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    
    # Remove section_id from items
    await db.catalog_items.update_many(
        {"section_id": section_id},
        {"$unset": {"section_id": ""}}
    )
    await db.user_item_colors.update_many(
        {"section_id": section_id},
        {"$unset": {"section_id": ""}}
    )
    return {"message": "Section supprimée"}

# =====================================
# USER COLOR PREFERENCES
# =====================================
@api_router.post("/user/colors")
async def set_item_color(pref: UserColorPreference, user: dict = Depends(get_current_user)):
    """Set custom color for an item"""
    user_id = user["id"]
    
    existing = await db.user_item_colors.find_one({"user_id": user_id, "item_id": pref.item_id})
    if existing:
        await db.user_item_colors.update_one(
            {"id": existing["id"]},
            {"$set": {"color": pref.color}}
        )
    else:
        await db.user_item_colors.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "item_id": pref.item_id,
            "color": pref.color,
            "created_at": datetime.utcnow()
        })
    
    return {"message": "Couleur mise à jour"}

@api_router.get("/user/colors")
async def get_item_colors(user: dict = Depends(get_current_user)):
    """Get user's color preferences"""
    colors = await db.user_item_colors.find({"user_id": user["id"]}).to_list(1000)
    return {c["item_id"]: c["color"] for c in colors}

@api_router.post("/user/items/{item_id}/section")
async def assign_item_to_section(item_id: str, section_id: str, user: dict = Depends(get_current_user)):
    """Assign an item to a custom section"""
    # Verify section exists
    section = await db.custom_sections.find_one({"id": section_id, "user_id": user["id"]})
    if not section:
        raise HTTPException(status_code=404, detail="Section non trouvée")
    
    # Store section assignment
    existing = await db.user_item_sections.find_one({"user_id": user["id"], "item_id": item_id})
    if existing:
        await db.user_item_sections.update_one(
            {"id": existing["id"]},
            {"$set": {"section_id": section_id}}
        )
    else:
        await db.user_item_sections.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "item_id": item_id,
            "section_id": section_id,
            "created_at": datetime.utcnow()
        })
    
    return {"message": "Item assigné à la section"}

@api_router.get("/user/items/sections")
async def get_item_sections(user: dict = Depends(get_current_user)):
    """Get item section assignments"""
    assignments = await db.user_item_sections.find({"user_id": user["id"]}).to_list(1000)
    return {a["item_id"]: a["section_id"] for a in assignments}

# =====================================
# USER ITEM SETTINGS (Revision Methods)
# =====================================
@api_router.post("/user/items/settings", response_model=UserItemSettingsResponse)
async def set_item_revision_method(
    settings: UserItemSettingsCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Set revision method for a specific item"""
    user_id = user["id"]
    
    # Check if settings already exist
    existing = await db.user_item_settings.find_one({
        "user_id": user_id,
        "item_id": settings.item_id
    })
    
    now = datetime.utcnow()
    settings_data = {
        "user_id": user_id,
        "item_id": settings.item_id,
        "method": settings.method,
        "j_settings": settings.j_settings.dict() if settings.j_settings else None,
        "srs_settings": settings.srs_settings.dict() if settings.srs_settings else None,
        "tours_settings": settings.tours_settings.dict() if settings.tours_settings else None,
        "updated_at": now
    }
    
    if existing:
        # Delete future sessions for this item
        await db.study_sessions.delete_many({
            "user_id": user_id,
            "item_id": settings.item_id,
            "status": SessionStatus.PENDING,
            "scheduled_date": {"$gt": datetime.utcnow().date().isoformat()}
        })
        
        await db.user_item_settings.update_one(
            {"id": existing["id"]},
            {"$set": settings_data}
        )
        settings_id = existing["id"]
    else:
        settings_id = str(uuid.uuid4())
        settings_data["id"] = settings_id
        settings_data["created_at"] = now
        await db.user_item_settings.insert_one(settings_data)
    
    # Generate sessions in background
    background_tasks.add_task(generate_sessions_for_item, user_id, settings.item_id, settings_data)
    
    return UserItemSettingsResponse(
        id=settings_id,
        user_id=user_id,
        item_id=settings.item_id,
        method=settings.method,
        j_settings=settings_data.get("j_settings"),
        srs_settings=settings_data.get("srs_settings"),
        tours_settings=settings_data.get("tours_settings"),
        created_at=settings_data.get("created_at", now),
        updated_at=now
    )

@api_router.get("/user/items/settings", response_model=List[UserItemSettingsResponse])
async def get_user_item_settings(user: dict = Depends(get_current_user)):
    settings = await db.user_item_settings.find({"user_id": user["id"]}).to_list(1000)
    return [UserItemSettingsResponse(
        id=s["id"],
        user_id=s["user_id"],
        item_id=s["item_id"],
        method=s["method"],
        j_settings=s.get("j_settings"),
        srs_settings=s.get("srs_settings"),
        tours_settings=s.get("tours_settings"),
        created_at=s["created_at"],
        updated_at=s["updated_at"]
    ) for s in settings]

@api_router.get("/user/items/settings/{item_id}", response_model=UserItemSettingsResponse)
async def get_item_settings(item_id: str, user: dict = Depends(get_current_user)):
    settings = await db.user_item_settings.find_one({
        "user_id": user["id"],
        "item_id": item_id
    })
    if not settings:
        raise HTTPException(status_code=404, detail="Paramètres non trouvés")
    
    return UserItemSettingsResponse(
        id=settings["id"],
        user_id=settings["user_id"],
        item_id=settings["item_id"],
        method=settings["method"],
        j_settings=settings.get("j_settings"),
        srs_settings=settings.get("srs_settings"),
        tours_settings=settings.get("tours_settings"),
        created_at=settings["created_at"],
        updated_at=settings["updated_at"]
    )

# =====================================
# SESSION GENERATION
# =====================================
async def generate_sessions_for_item(user_id: str, item_id: str, settings: dict):
    """Generate study sessions based on method"""
    method = settings["method"]
    item = await db.catalog_items.find_one({"id": item_id})
    if not item:
        return
    
    item_title = item["title"]
    
    # First, delete any pending future sessions for this item
    today = datetime.utcnow().date().isoformat()
    await db.study_sessions.delete_many({
        "user_id": user_id,
        "item_id": item_id,
        "status": SessionStatus.PENDING,
        "scheduled_date": {"$gte": today}
    })
    
    if method == RevisionMethod.J_METHOD:
        j_settings = settings.get("j_settings", {})
        start_date_str = j_settings.get("start_date", datetime.utcnow().date().isoformat())
        start_date = datetime.fromisoformat(start_date_str).date()
        intervals = j_settings.get("intervals", J_METHOD_INTERVALS)
        
        for i, interval in enumerate(intervals):
            session_date = start_date + timedelta(days=interval)
            session = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "item_id": item_id,
                "item_title": item_title,
                "scheduled_date": session_date.isoformat(),
                "method": method,
                "status": SessionStatus.PENDING,
                "j_day": interval,
                "created_at": datetime.utcnow()
            }
            # Check if session already exists
            existing = await db.study_sessions.find_one({
                "user_id": user_id,
                "item_id": item_id,
                "scheduled_date": session_date.isoformat(),
                "method": method
            })
            if not existing:
                await db.study_sessions.insert_one(session)
    
    elif method == RevisionMethod.SRS:
        srs_settings = settings.get("srs_settings", {})
        next_review = srs_settings.get("next_review", datetime.utcnow().date().isoformat())
        
        session = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "item_id": item_id,
            "item_title": item_title,
            "scheduled_date": next_review,
            "method": method,
            "status": SessionStatus.PENDING,
            "created_at": datetime.utcnow()
        }
        existing = await db.study_sessions.find_one({
            "user_id": user_id,
            "item_id": item_id,
            "scheduled_date": next_review,
            "method": method,
            "status": SessionStatus.PENDING
        })
        if not existing:
            await db.study_sessions.insert_one(session)
    
    elif method == RevisionMethod.TOURS:
        tours_settings = settings.get("tours_settings", {})
        total_tours = tours_settings.get("total_tours", 3)
        tour_durations = tours_settings.get("tour_durations", [30] * total_tours)
        
        start_date = datetime.utcnow().date()
        current_date = start_date
        
        for tour_num, duration in enumerate(tour_durations, 1):
            # One session per tour for this item
            session_date = current_date + timedelta(days=duration // 2)  # Middle of tour
            
            session = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "item_id": item_id,
                "item_title": item_title,
                "scheduled_date": session_date.isoformat(),
                "method": method,
                "status": SessionStatus.PENDING,
                "tour_number": tour_num,
                "created_at": datetime.utcnow()
            }
            existing = await db.study_sessions.find_one({
                "user_id": user_id,
                "item_id": item_id,
                "tour_number": tour_num,
                "method": method
            })
            if not existing:
                await db.study_sessions.insert_one(session)
            
            current_date += timedelta(days=duration)

# =====================================
# STUDY SESSIONS
# =====================================
@api_router.get("/sessions", response_model=List[StudySessionResponse])
async def get_sessions(
    date: Optional[str] = None,
    status: Optional[SessionStatus] = None,
    include_late: bool = True,
    user: dict = Depends(get_current_user)
):
    """Get study sessions, optionally filtered by date and status"""
    query = {"user_id": user["id"]}
    
    if date:
        query["scheduled_date"] = date
    if status:
        query["status"] = status
    
    sessions = await db.study_sessions.find(query).sort("scheduled_date", 1).to_list(1000)
    
    today = datetime.utcnow().date().isoformat()
    result = []
    
    for s in sessions:
        session_status = s["status"]
        # Mark as late if pending and date has STRICTLY passed (not today)
        # Sessions scheduled for today should remain "pending" not "late"
        if session_status == SessionStatus.PENDING and s["scheduled_date"] < today:
            session_status = SessionStatus.LATE
        
        if not include_late and session_status == SessionStatus.LATE:
            continue
        
        result.append(StudySessionResponse(
            id=s["id"],
            user_id=s["user_id"],
            item_id=s["item_id"],
            item_title=s["item_title"],
            scheduled_date=s["scheduled_date"],
            method=s["method"],
            status=session_status,
            j_day=s.get("j_day"),
            tour_number=s.get("tour_number"),
            srs_rating=s.get("srs_rating"),
            scheduled_time=s.get("scheduled_time"),
            completed_at=s.get("completed_at"),
            notes=s.get("notes")
        ))
    
    return result

@api_router.get("/sessions/today", response_model=List[StudySessionResponse])
async def get_today_sessions(user: dict = Depends(get_current_user)):
    """Get today's sessions"""
    today = datetime.utcnow().date().isoformat()
    return await get_sessions(date=today, user=user)

@api_router.get("/sessions/late", response_model=List[StudySessionResponse])
async def get_late_sessions(user: dict = Depends(get_current_user)):
    """Get all late (overdue) sessions"""
    today = datetime.utcnow().date().isoformat()
    sessions = await db.study_sessions.find({
        "user_id": user["id"],
        "status": SessionStatus.PENDING,
        "scheduled_date": {"$lt": today}
    }).sort("scheduled_date", 1).to_list(1000)
    
    return [StudySessionResponse(
        id=s["id"],
        user_id=s["user_id"],
        item_id=s["item_id"],
        item_title=s["item_title"],
        scheduled_date=s["scheduled_date"],
        method=s["method"],
        status=SessionStatus.LATE,
        j_day=s.get("j_day"),
        tour_number=s.get("tour_number"),
        srs_rating=s.get("srs_rating"),
        scheduled_time=s.get("scheduled_time"),
        completed_at=s.get("completed_at"),
        notes=s.get("notes")
    ) for s in sessions]

@api_router.post("/sessions/{session_id}/complete", response_model=StudySessionResponse)
async def complete_session(
    session_id: str,
    completion: CompleteSessionRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Mark a session as completed"""
    session = await db.study_sessions.find_one({
        "id": session_id,
        "user_id": user["id"]
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    update_data = {
        "status": SessionStatus.COMPLETED,
        "completed_at": datetime.utcnow(),
        "notes": completion.notes
    }
    
    # Handle SRS rating
    if session["method"] == RevisionMethod.SRS and completion.srs_rating is not None:
        update_data["srs_rating"] = completion.srs_rating
        
        # Update SRS settings and schedule next review
        settings = await db.user_item_settings.find_one({
            "user_id": user["id"],
            "item_id": session["item_id"]
        })
        
        if settings and settings.get("srs_settings"):
            srs = settings["srs_settings"]
            new_ef, new_interval, new_reps = calculate_sm2(
                completion.srs_rating,
                srs.get("easiness_factor", 2.5),
                srs.get("interval", 1),
                srs.get("repetitions", 0)
            )
            
            next_review = (datetime.utcnow().date() + timedelta(days=new_interval)).isoformat()
            
            await db.user_item_settings.update_one(
                {"id": settings["id"]},
                {"$set": {
                    "srs_settings.easiness_factor": new_ef,
                    "srs_settings.interval": new_interval,
                    "srs_settings.repetitions": new_reps,
                    "srs_settings.next_review": next_review,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Schedule next SRS session
            background_tasks.add_task(
                generate_sessions_for_item,
                user["id"],
                session["item_id"],
                {**settings, "srs_settings": {
                    "easiness_factor": new_ef,
                    "interval": new_interval,
                    "repetitions": new_reps,
                    "next_review": next_review
                }}
            )
    
    await db.study_sessions.update_one({"id": session_id}, {"$set": update_data})
    
    # Log analytics
    await db.analytics_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "event": "session_completed",
        "item_id": session["item_id"],
        "method": session["method"],
        "srs_rating": completion.srs_rating,
        "was_late": session["scheduled_date"] < datetime.utcnow().date().isoformat(),
        "timestamp": datetime.utcnow()
    })
    
    updated = await db.study_sessions.find_one({"id": session_id})
    return StudySessionResponse(
        id=updated["id"],
        user_id=updated["user_id"],
        item_id=updated["item_id"],
        item_title=updated["item_title"],
        scheduled_date=updated["scheduled_date"],
        method=updated["method"],
        status=updated["status"],
        j_day=updated.get("j_day"),
        tour_number=updated.get("tour_number"),
        srs_rating=updated.get("srs_rating"),
        scheduled_time=updated.get("scheduled_time"),
        completed_at=updated.get("completed_at"),
        notes=updated.get("notes")
    )

@api_router.post("/sessions/{session_id}/skip")
async def skip_session(session_id: str, user: dict = Depends(get_current_user)):
    """Skip a session"""
    result = await db.study_sessions.update_one(
        {"id": session_id, "user_id": user["id"]},
        {"$set": {"status": SessionStatus.SKIPPED}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    return {"message": "Session ignorée"}

@api_router.put("/sessions/{session_id}/time")
async def set_session_time(session_id: str, time: str, user: dict = Depends(get_current_user)):
    """Set a specific time for a session"""
    result = await db.study_sessions.update_one(
        {"id": session_id, "user_id": user["id"]},
        {"$set": {"scheduled_time": time}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    return {"message": "Horaire défini"}

@api_router.get("/sessions/item/{item_id}")
async def get_sessions_for_item(item_id: str, user: dict = Depends(get_current_user)):
    """Get all sessions for a specific item (course)"""
    sessions = await db.study_sessions.find({
        "user_id": user["id"],
        "item_id": item_id
    }).sort("scheduled_date", 1).to_list(100)
    
    return [
        StudySessionResponse(
            id=s["id"],
            user_id=s["user_id"],
            item_id=s["item_id"],
            item_title=s["item_title"],
            scheduled_date=s["scheduled_date"],
            method=s["method"],
            status=s["status"],
            j_day=s.get("j_day"),
            tour_number=s.get("tour_number"),
            srs_rating=s.get("srs_rating"),
            scheduled_time=s.get("scheduled_time"),
            completed_at=s.get("completed_at"),
        )
        for s in sessions
    ]

@api_router.post("/sessions/{session_id}/uncomplete")
async def uncomplete_session(session_id: str, user: dict = Depends(get_current_user)):
    """Cancel completion of a session - mark it as pending again"""
    session = await db.study_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    if session.get("status") != SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="La session n'est pas marquée comme terminée")
    
    await db.study_sessions.update_one(
        {"id": session_id},
        {"$set": {"status": SessionStatus.PENDING, "completed_at": None, "rating": None}}
    )
    return {"message": "Session réinitialisée"}

class SessionReschedule(BaseModel):
    new_date: str  # YYYY-MM-DD format

@api_router.put("/sessions/{session_id}/reschedule")
async def reschedule_session(session_id: str, data: SessionReschedule, user: dict = Depends(get_current_user)):
    """Move a session to a different date"""
    session = await db.study_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    # Validate date format
    try:
        datetime.strptime(data.new_date, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (YYYY-MM-DD)")
    
    await db.study_sessions.update_one(
        {"id": session_id},
        {"$set": {"scheduled_date": data.new_date, "status": SessionStatus.PENDING}}
    )
    return {"message": f"Session déplacée au {data.new_date}"}

# =====================================
# COURSE NOTES
# =====================================
class CourseNoteCreate(BaseModel):
    content: str

class CourseNoteResponse(BaseModel):
    id: str
    user_id: str
    item_id: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

@api_router.get("/courses/{item_id}/notes")
async def get_course_notes(item_id: str, user: dict = Depends(get_current_user)):
    """Get all notes for a course"""
    notes = await db.course_notes.find({"user_id": user["id"], "item_id": item_id}).sort("created_at", -1).to_list(100)
    return [
        CourseNoteResponse(
            id=n["id"],
            user_id=n["user_id"],
            item_id=n["item_id"],
            content=n["content"],
            created_at=n["created_at"],
            updated_at=n.get("updated_at")
        )
        for n in notes
    ]

@api_router.post("/courses/{item_id}/notes")
async def add_course_note(item_id: str, note: CourseNoteCreate, user: dict = Depends(get_current_user)):
    """Add a note to a course"""
    note_id = str(uuid.uuid4())
    note_data = {
        "id": note_id,
        "user_id": user["id"],
        "item_id": item_id,
        "content": note.content,
        "created_at": datetime.utcnow(),
        "updated_at": None
    }
    await db.course_notes.insert_one(note_data)
    return CourseNoteResponse(
        id=note_id,
        user_id=user["id"],
        item_id=item_id,
        content=note.content,
        created_at=note_data["created_at"],
        updated_at=None
    )

@api_router.put("/courses/{item_id}/notes/{note_id}")
async def update_course_note(item_id: str, note_id: str, note: CourseNoteCreate, user: dict = Depends(get_current_user)):
    """Update a note"""
    result = await db.course_notes.update_one(
        {"id": note_id, "user_id": user["id"], "item_id": item_id},
        {"$set": {"content": note.content, "updated_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Note non trouvée")
    
    updated = await db.course_notes.find_one({"id": note_id})
    return CourseNoteResponse(
        id=updated["id"],
        user_id=updated["user_id"],
        item_id=updated["item_id"],
        content=updated["content"],
        created_at=updated["created_at"],
        updated_at=updated.get("updated_at")
    )

@api_router.delete("/courses/{item_id}/notes/{note_id}")
async def delete_course_note(item_id: str, note_id: str, user: dict = Depends(get_current_user)):
    """Delete a note"""
    result = await db.course_notes.delete_one({"id": note_id, "user_id": user["id"], "item_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note non trouvée")
    return {"message": "Note supprimée"}

# =====================================
# PERSONAL EVENTS
# =====================================
@api_router.post("/events", response_model=PersonalEventResponse)
async def create_event(event: PersonalEventCreate, user: dict = Depends(get_current_user)):
    event_id = str(uuid.uuid4())
    event_data = {
        "id": event_id,
        "user_id": user["id"],
        "title": event.title,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "description": event.description,
        "recurrence": event.recurrence.dict() if event.recurrence else None,
        "color": event.color,
        "created_at": datetime.utcnow()
    }
    await db.personal_events.insert_one(event_data)
    
    return PersonalEventResponse(
        id=event_id,
        user_id=user["id"],
        title=event.title,
        start_time=event.start_time,
        end_time=event.end_time,
        description=event.description,
        recurrence=event_data["recurrence"],
        color=event.color,
        created_at=event_data["created_at"]
    )

@api_router.get("/events", response_model=List[PersonalEventResponse])
async def get_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get personal events, optionally filtered by date range"""
    query = {"user_id": user["id"]}
    
    events = await db.personal_events.find(query).to_list(1000)
    result = []
    
    for e in events:
        # Handle recurrence expansion if date range is specified
        if start_date and end_date and e.get("recurrence"):
            # Expand recurring events (simplified)
            occurrences = expand_recurrence(e, start_date, end_date)
            result.extend(occurrences)
        else:
            result.append(PersonalEventResponse(
                id=e["id"],
                user_id=e["user_id"],
                title=e["title"],
                start_time=e["start_time"],
                end_time=e["end_time"],
                description=e.get("description"),
                recurrence=e.get("recurrence"),
                color=e["color"],
                created_at=e["created_at"]
            ))
    
    return result

def expand_recurrence(event: dict, start_date: str, end_date: str) -> List[PersonalEventResponse]:
    """Expand a recurring event into individual occurrences"""
    occurrences = []
    recurrence = event.get("recurrence")
    if not recurrence:
        return [PersonalEventResponse(
            id=event["id"],
            user_id=event["user_id"],
            title=event["title"],
            start_time=event["start_time"],
            end_time=event["end_time"],
            description=event.get("description"),
            recurrence=recurrence,
            color=event["color"],
            created_at=event["created_at"]
        )]
    
    freq = recurrence.get("frequency", "daily")
    interval = recurrence.get("interval", 1)
    
    event_start = datetime.fromisoformat(event["start_time"].replace('Z', '+00:00'))
    event_end = datetime.fromisoformat(event["end_time"].replace('Z', '+00:00'))
    duration = event_end - event_start
    
    range_start = datetime.fromisoformat(start_date)
    range_end = datetime.fromisoformat(end_date)
    
    current = event_start
    count = 0
    max_count = recurrence.get("count", 365)
    rec_end = datetime.fromisoformat(recurrence["end_date"]) if recurrence.get("end_date") else range_end
    
    while current <= min(range_end, rec_end) and count < max_count:
        if current >= range_start:
            occurrences.append(PersonalEventResponse(
                id=f"{event['id']}_{count}",
                user_id=event["user_id"],
                title=event["title"],
                start_time=current.isoformat(),
                end_time=(current + duration).isoformat(),
                description=event.get("description"),
                recurrence=recurrence,
                color=event["color"],
                created_at=event["created_at"]
            ))
        
        if freq == "daily":
            current += timedelta(days=interval)
        elif freq == "weekly":
            current += timedelta(weeks=interval)
        elif freq == "monthly":
            current = current.replace(month=current.month + interval) if current.month + interval <= 12 else current.replace(year=current.year + 1, month=(current.month + interval) % 12 or 12)
        elif freq == "yearly":
            current = current.replace(year=current.year + interval)
        
        count += 1
    
    return occurrences

@api_router.put("/events/{event_id}", response_model=PersonalEventResponse)
async def update_event(event_id: str, event: PersonalEventCreate, user: dict = Depends(get_current_user)):
    existing = await db.personal_events.find_one({"id": event_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    update_data = {
        "title": event.title,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "description": event.description,
        "recurrence": event.recurrence.dict() if event.recurrence else None,
        "color": event.color
    }
    await db.personal_events.update_one({"id": event_id}, {"$set": update_data})
    
    updated = await db.personal_events.find_one({"id": event_id})
    return PersonalEventResponse(
        id=updated["id"],
        user_id=updated["user_id"],
        title=updated["title"],
        start_time=updated["start_time"],
        end_time=updated["end_time"],
        description=updated.get("description"),
        recurrence=updated.get("recurrence"),
        color=updated["color"],
        created_at=updated["created_at"]
    )

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(get_current_user)):
    result = await db.personal_events.delete_one({"id": event_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    return {"message": "Événement supprimé"}

# =====================================
# ICS SUBSCRIPTIONS
# =====================================
@api_router.post("/ics/subscribe", response_model=ICSSubscriptionResponse)
async def subscribe_ics(
    subscription: ICSSubscriptionCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    sub_id = str(uuid.uuid4())
    sub_data = {
        "id": sub_id,
        "user_id": user["id"],
        "name": subscription.name,
        "url": subscription.url,
        "color": subscription.color,
        "last_synced": None,
        "created_at": datetime.utcnow()
    }
    await db.ics_subscriptions.insert_one(sub_data)
    
    # Sync in background
    background_tasks.add_task(sync_ics_subscription, sub_id)
    
    return ICSSubscriptionResponse(
        id=sub_id,
        user_id=user["id"],
        name=subscription.name,
        url=subscription.url,
        color=subscription.color,
        last_synced=None,
        created_at=sub_data["created_at"]
    )

async def sync_ics_subscription(subscription_id: str):
    """Fetch and parse ICS file"""
    from icalendar import Calendar
    
    subscription = await db.ics_subscriptions.find_one({"id": subscription_id})
    if not subscription:
        return
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(subscription["url"], timeout=30)
            response.raise_for_status()
        
        cal = Calendar.from_ical(response.text)
        
        # Delete old cached events
        await db.ics_events_cache.delete_many({"subscription_id": subscription_id})
        
        # Insert new events
        for component in cal.walk():
            if component.name == "VEVENT":
                event_data = {
                    "id": str(uuid.uuid4()),
                    "subscription_id": subscription_id,
                    "uid": str(component.get("UID", "")),
                    "title": str(component.get("SUMMARY", "Sans titre")),
                    "start_time": component.get("DTSTART").dt.isoformat() if component.get("DTSTART") else None,
                    "end_time": component.get("DTEND").dt.isoformat() if component.get("DTEND") else None,
                    "description": str(component.get("DESCRIPTION", "")) if component.get("DESCRIPTION") else None,
                    "location": str(component.get("LOCATION", "")) if component.get("LOCATION") else None
                }
                if event_data["start_time"]:
                    await db.ics_events_cache.insert_one(event_data)
        
        # Update last synced
        await db.ics_subscriptions.update_one(
            {"id": subscription_id},
            {"$set": {"last_synced": datetime.utcnow()}}
        )
        
        logger.info(f"Successfully synced ICS subscription {subscription_id}")
    
    except Exception as e:
        logger.error(f"Error syncing ICS subscription {subscription_id}: {e}")

@api_router.get("/ics/subscriptions", response_model=List[ICSSubscriptionResponse])
async def get_ics_subscriptions(user: dict = Depends(get_current_user)):
    subs = await db.ics_subscriptions.find({"user_id": user["id"]}).to_list(100)
    return [ICSSubscriptionResponse(
        id=s["id"],
        user_id=s["user_id"],
        name=s["name"],
        url=s["url"],
        color=s["color"],
        last_synced=s.get("last_synced"),
        created_at=s["created_at"]
    ) for s in subs]

@api_router.post("/ics/{subscription_id}/sync")
async def trigger_ics_sync(
    subscription_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    sub = await db.ics_subscriptions.find_one({"id": subscription_id, "user_id": user["id"]})
    if not sub:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    background_tasks.add_task(sync_ics_subscription, subscription_id)
    return {"message": "Synchronisation lancée"}

@api_router.get("/ics/{subscription_id}/events", response_model=List[ICSEventResponse])
async def get_ics_events(
    subscription_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    sub = await db.ics_subscriptions.find_one({"id": subscription_id, "user_id": user["id"]})
    if not sub:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    query = {"subscription_id": subscription_id}
    events = await db.ics_events_cache.find(query).to_list(1000)
    
    return [ICSEventResponse(
        id=e["id"],
        subscription_id=e["subscription_id"],
        uid=e["uid"],
        title=e["title"],
        start_time=e["start_time"],
        end_time=e["end_time"],
        description=e.get("description"),
        location=e.get("location")
    ) for e in events]

@api_router.delete("/ics/{subscription_id}")
async def delete_ics_subscription(subscription_id: str, user: dict = Depends(get_current_user)):
    result = await db.ics_subscriptions.delete_one({"id": subscription_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    # Delete cached events
    await db.ics_events_cache.delete_many({"subscription_id": subscription_id})
    return {"message": "Abonnement supprimé"}

class ICSSubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

@api_router.put("/ics/{subscription_id}")
async def update_ics_subscription(
    subscription_id: str, 
    data: ICSSubscriptionUpdate,
    user: dict = Depends(get_current_user)
):
    """Update ICS subscription name and/or color"""
    sub = await db.ics_subscriptions.find_one({"id": subscription_id, "user_id": user["id"]})
    if not sub:
        raise HTTPException(status_code=404, detail="Abonnement non trouvé")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.color is not None:
        update_data["color"] = data.color
    
    if update_data:
        await db.ics_subscriptions.update_one(
            {"id": subscription_id},
            {"$set": update_data}
        )
    
    return {"message": "Abonnement mis à jour"}

@api_router.get("/calendar/all-events")
async def get_all_calendar_events(
    start_date: str,
    end_date: str,
    user: dict = Depends(get_current_user)
):
    """
    Get all calendar events for a date range:
    - Personal events
    - ICS events from all subscriptions
    """
    user_id = user["id"]
    events = []
    
    # 1. Get personal events
    personal_events = await db.personal_events.find({"user_id": user_id}).to_list(1000)
    for e in personal_events:
        # Check if event falls within date range
        event_date = e["start_time"].split('T')[0]
        if start_date <= event_date <= end_date:
            events.append({
                "id": e["id"],
                "type": "personal",
                "title": e["title"],
                "start_time": e["start_time"],
                "end_time": e["end_time"],
                "description": e.get("description"),
                "color": e["color"],
                "source": "personal"
            })
        
        # Handle recurring events
        if e.get("recurrence"):
            recurrence = e["recurrence"]
            freq = recurrence.get("frequency", "daily")
            interval = recurrence.get("interval", 1)
            
            try:
                event_start = datetime.fromisoformat(e["start_time"].replace('Z', '+00:00'))
                event_end = datetime.fromisoformat(e["end_time"].replace('Z', '+00:00'))
                duration = event_end - event_start
                
                range_start = datetime.fromisoformat(start_date)
                range_end = datetime.fromisoformat(end_date)
                
                current = event_start
                count = 0
                max_count = recurrence.get("count", 365)
                rec_end = datetime.fromisoformat(recurrence["end_date"]) if recurrence.get("end_date") else range_end
                
                while current <= min(range_end, rec_end) and count < max_count:
                    current_date = current.date().isoformat()
                    if start_date <= current_date <= end_date and current != event_start:
                        events.append({
                            "id": f"{e['id']}_{count}",
                            "type": "personal",
                            "title": e["title"],
                            "start_time": current.isoformat(),
                            "end_time": (current + duration).isoformat(),
                            "description": e.get("description"),
                            "color": e["color"],
                            "source": "personal",
                            "is_recurring": True
                        })
                    
                    if freq == "daily":
                        current += timedelta(days=interval)
                    elif freq == "weekly":
                        current += timedelta(weeks=interval)
                    elif freq == "monthly":
                        try:
                            current = current.replace(month=current.month + interval) if current.month + interval <= 12 else current.replace(year=current.year + 1, month=(current.month + interval) % 12 or 12)
                        except:
                            break
                    elif freq == "yearly":
                        current = current.replace(year=current.year + interval)
                    
                    count += 1
            except:
                pass
    
    # 2. Get ICS events from all user subscriptions
    subscriptions = await db.ics_subscriptions.find({"user_id": user_id}).to_list(100)
    
    for sub in subscriptions:
        ics_events = await db.ics_events_cache.find({"subscription_id": sub["id"]}).to_list(5000)
        
        for ics in ics_events:
            if not ics.get("start_time"):
                continue
                
            # Parse the date from start_time (handle both datetime and date formats)
            start_str = ics["start_time"]
            if 'T' in start_str:
                ics_date = start_str.split('T')[0]
            else:
                ics_date = start_str[:10]  # YYYY-MM-DD format
            
            if start_date <= ics_date <= end_date:
                events.append({
                    "id": ics["id"],
                    "type": "ics",
                    "title": ics["title"],
                    "start_time": ics["start_time"],
                    "end_time": ics.get("end_time", ics["start_time"]),
                    "description": ics.get("description"),
                    "location": ics.get("location"),
                    "color": sub["color"],
                    "source": sub["name"],
                    "subscription_id": sub["id"]
                })
    
    # Sort by start_time
    events.sort(key=lambda x: x["start_time"])
    
    return events

# =====================================
# ITEM NOTES
# =====================================
@api_router.post("/notes", response_model=ItemNoteResponse)
async def create_note(note: ItemNoteCreate, user: dict = Depends(get_current_user)):
    # Check if note exists for this item
    existing = await db.item_notes.find_one({
        "user_id": user["id"],
        "item_id": note.item_id
    })
    
    now = datetime.utcnow()
    
    if existing:
        await db.item_notes.update_one(
            {"id": existing["id"]},
            {"$set": {"content": note.content, "updated_at": now}}
        )
        note_id = existing["id"]
        created_at = existing["created_at"]
    else:
        note_id = str(uuid.uuid4())
        note_data = {
            "id": note_id,
            "user_id": user["id"],
            "item_id": note.item_id,
            "content": note.content,
            "created_at": now,
            "updated_at": now
        }
        await db.item_notes.insert_one(note_data)
        created_at = now
    
    return ItemNoteResponse(
        id=note_id,
        user_id=user["id"],
        item_id=note.item_id,
        content=note.content,
        created_at=created_at,
        updated_at=now
    )

@api_router.get("/notes/{item_id}", response_model=ItemNoteResponse)
async def get_note(item_id: str, user: dict = Depends(get_current_user)):
    note = await db.item_notes.find_one({
        "user_id": user["id"],
        "item_id": item_id
    })
    if not note:
        raise HTTPException(status_code=404, detail="Note non trouvée")
    
    return ItemNoteResponse(
        id=note["id"],
        user_id=note["user_id"],
        item_id=note["item_id"],
        content=note["content"],
        created_at=note["created_at"],
        updated_at=note["updated_at"]
    )

@api_router.get("/notes", response_model=List[ItemNoteResponse])
async def get_all_notes(user: dict = Depends(get_current_user)):
    notes = await db.item_notes.find({"user_id": user["id"]}).to_list(1000)
    return [ItemNoteResponse(
        id=n["id"],
        user_id=n["user_id"],
        item_id=n["item_id"],
        content=n["content"],
        created_at=n["created_at"],
        updated_at=n["updated_at"]
    ) for n in notes]

# =====================================
# ANALYTICS
# =====================================
@api_router.get("/analytics/progress")
async def get_progress(user: dict = Depends(get_current_user)):
    """Get user's overall progress statistics"""
    user_id = user["id"]
    
    # Count sessions by status
    total_sessions = await db.study_sessions.count_documents({"user_id": user_id})
    completed_sessions = await db.study_sessions.count_documents({
        "user_id": user_id,
        "status": SessionStatus.COMPLETED
    })
    
    today = datetime.utcnow().date().isoformat()
    late_sessions = await db.study_sessions.count_documents({
        "user_id": user_id,
        "status": SessionStatus.PENDING,
        "scheduled_date": {"$lt": today}
    })
    
    # Items with active revision
    active_items = await db.user_item_settings.count_documents({
        "user_id": user_id,
        "method": {"$ne": RevisionMethod.NONE}
    })
    
    # Sessions completed today
    today_completed = await db.study_sessions.count_documents({
        "user_id": user_id,
        "status": SessionStatus.COMPLETED,
        "scheduled_date": today
    })
    
    # Calculate streak (consecutive days with completed sessions)
    streak = 0
    check_date = datetime.utcnow().date()
    while True:
        date_str = check_date.isoformat()
        day_completed = await db.study_sessions.count_documents({
            "user_id": user_id,
            "status": SessionStatus.COMPLETED,
            "scheduled_date": date_str
        })
        if day_completed > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break
        if streak > 365:  # Safety limit
            break
    
    return {
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "late_sessions": late_sessions,
        "active_items": active_items,
        "today_completed": today_completed,
        "completion_rate": round(completed_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0,
        "streak": streak
    }

@api_router.get("/analytics/calendar")
async def get_calendar_data(
    month: int,
    year: int,
    user: dict = Depends(get_current_user)
):
    """Get calendar data for a specific month"""
    user_id = user["id"]
    
    # Get date range for the month
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # Get sessions for this month
    sessions = await db.study_sessions.find({
        "user_id": user_id,
        "scheduled_date": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }).to_list(1000)
    
    # Group by date
    calendar_data = {}
    today = datetime.utcnow().date().isoformat()
    
    for s in sessions:
        date_key = s["scheduled_date"]
        if date_key not in calendar_data:
            calendar_data[date_key] = {
                "pending": 0,
                "completed": 0,
                "late": 0,
                "total": 0
            }
        
        calendar_data[date_key]["total"] += 1
        
        if s["status"] == SessionStatus.COMPLETED:
            calendar_data[date_key]["completed"] += 1
        elif s["status"] == SessionStatus.PENDING:
            if s["scheduled_date"] < today:
                calendar_data[date_key]["late"] += 1
            else:
                calendar_data[date_key]["pending"] += 1
    
    return calendar_data

# =====================================
# SEED DATA (Development)
# =====================================
@api_router.post("/admin/seed")
async def seed_demo_data(admin: dict = Depends(get_admin_user)):
    """Seed demo catalog data"""
    # Check if data exists
    existing = await db.catalog_items.count_documents({})
    if existing > 0:
        return {"message": "Données déjà présentes", "count": existing}
    
    # Create demo chapters and courses
    chapters = [
        {"title": "Cardiologie", "courses": [
            "Insuffisance cardiaque", "Syndromes coronariens aigus", 
            "Troubles du rythme cardiaque", "Hypertension artérielle",
            "Valvulopathies", "Péricardites"
        ]},
        {"title": "Pneumologie", "courses": [
            "Asthme", "BPCO", "Pneumonies", "Embolie pulmonaire",
            "Pneumothorax", "Cancer bronchique"
        ]},
        {"title": "Neurologie", "courses": [
            "AVC", "Épilepsie", "Maladie de Parkinson", "Sclérose en plaques",
            "Céphalées", "Neuropathies périphériques"
        ]},
        {"title": "Gastro-entérologie", "courses": [
            "RGO", "Ulcères gastroduodénaux", "Cirrhose", "Hépatites",
            "MICI", "Pancréatite"
        ]},
        {"title": "Endocrinologie", "courses": [
            "Diabète type 1", "Diabète type 2", "Dysthyroïdies",
            "Insuffisance surrénalienne", "Hypercorticisme"
        ]}
    ]
    
    order = 0
    for chapter in chapters:
        chapter_id = str(uuid.uuid4())
        await db.catalog_items.insert_one({
            "id": chapter_id,
            "title": chapter["title"],
            "parent_id": None,
            "order": order,
            "level": 0,
            "created_at": datetime.utcnow()
        })
        
        course_order = 0
        for course in chapter["courses"]:
            await db.catalog_items.insert_one({
                "id": str(uuid.uuid4()),
                "title": course,
                "parent_id": chapter_id,
                "order": course_order,
                "level": 1,
                "created_at": datetime.utcnow()
            })
            course_order += 1
        
        order += 1
    
    return {"message": "Données de démonstration créées", "chapters": len(chapters)}

# =====================================
# ADMIN MANAGEMENT
# =====================================

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify admin user"""
    user = await get_current_user(credentials)
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user

class AdminUserResponse(BaseModel):
    id: str
    email: str
    role: str
    is_blocked: bool = False
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    sessions_count: int = 0
    courses_count: int = 0

class BlockUserRequest(BaseModel):
    reason: Optional[str] = None

@api_router.get("/admin/users", response_model=List[AdminUserResponse])
async def admin_get_all_users(admin: dict = Depends(get_admin_user)):
    """Get all users (admin only)"""
    users = await db.users.find({}).to_list(1000)
    result = []
    
    for u in users:
        # Count sessions and courses for each user
        sessions_count = await db.study_sessions.count_documents({"user_id": u["id"]})
        courses_count = await db.user_item_settings.count_documents({"user_id": u["id"]})
        
        result.append(AdminUserResponse(
            id=u["id"],
            email=u["email"],
            role=u.get("role", "user"),
            is_blocked=u.get("is_blocked", False),
            created_at=u.get("created_at"),
            last_login=u.get("last_login"),
            sessions_count=sessions_count,
            courses_count=courses_count
        ))
    
    return result

@api_router.post("/admin/users/{user_id}/block")
async def admin_block_user(user_id: str, request: BlockUserRequest, admin: dict = Depends(get_admin_user)):
    """Block a user (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.get("role") == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Impossible de bloquer un administrateur")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": True, "blocked_reason": request.reason, "blocked_at": datetime.utcnow()}}
    )
    
    return {"message": "Utilisateur bloqué", "user_id": user_id}

@api_router.post("/admin/users/{user_id}/unblock")
async def admin_unblock_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Unblock a user (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": False}, "$unset": {"blocked_reason": "", "blocked_at": ""}}
    )
    
    return {"message": "Utilisateur débloqué", "user_id": user_id}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user and all their data (GDPR compliant) - admin only"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.get("role") == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Impossible de supprimer un administrateur")
    
    # Delete all user data (GDPR compliant)
    deleted_data = {
        "study_sessions": (await db.study_sessions.delete_many({"user_id": user_id})).deleted_count,
        "user_item_settings": (await db.user_item_settings.delete_many({"user_id": user_id})).deleted_count,
        "personal_events": (await db.personal_events.delete_many({"user_id": user_id})).deleted_count,
        "ics_subscriptions": (await db.ics_subscriptions.delete_many({"user_id": user_id})).deleted_count,
        "ics_events_cache": 0,  # Will be handled below
        "item_notes": (await db.item_notes.delete_many({"user_id": user_id})).deleted_count,
        "analytics_logs": (await db.analytics_logs.delete_many({"user_id": user_id})).deleted_count,
        "hidden_items": (await db.hidden_items.delete_many({"user_id": user_id})).deleted_count,
        "custom_sections": (await db.custom_sections.delete_many({"user_id": user_id})).deleted_count,
        "user_item_colors": (await db.user_item_colors.delete_many({"user_id": user_id})).deleted_count,
        "user_item_sections": (await db.user_item_sections.delete_many({"user_id": user_id})).deleted_count,
        "catalog_items_personal": (await db.catalog_items.delete_many({"owner_id": user_id})).deleted_count,
    }
    
    # Delete ICS events cache for user's subscriptions
    user_subs = await db.ics_subscriptions.find({"user_id": user_id}).to_list(100)
    for sub in user_subs:
        deleted_data["ics_events_cache"] += (await db.ics_events_cache.delete_many({"subscription_id": sub["id"]})).deleted_count
    
    # Finally delete the user
    await db.users.delete_one({"id": user_id})
    
    return {
        "message": "Utilisateur et toutes ses données supprimés (conformité RGPD)",
        "user_id": user_id,
        "deleted_data": deleted_data
    }

@api_router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, admin: dict = Depends(get_admin_user)):
    """Reset a user's password and generate a temporary password - admin only"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.get("role") == UserRole.ADMIN and admin["id"] != user_id:
        raise HTTPException(status_code=400, detail="Impossible de réinitialiser le mot de passe d'un autre administrateur")
    
    # Generate temporary password
    temp_password = generate_temp_password(12)
    hashed_password = pwd_context.hash(temp_password)
    
    # Update user password
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": hashed_password}}
    )
    
    logger.info(f"Admin {admin['email']} reset password for user {user['email']}")
    
    return {
        "message": "Mot de passe réinitialisé avec succès",
        "user_id": user_id,
        "user_email": user["email"],
        "temporary_password": temp_password,
        "instructions": "Communiquez ce mot de passe temporaire à l'utilisateur. Il pourra le changer dans son profil."
    }

@api_router.post("/admin/create")
async def create_admin_user():
    """Create default admin user if not exists"""
    admin_email = "admin@mystudyplanner.com"
    admin_password = "Admin123!"
    
    existing = await db.users.find_one({"email": admin_email})
    if existing:
        return {"message": "Admin déjà existant", "email": admin_email}
    
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(admin_password)
    
    admin_user = {
        "id": user_id,
        "email": admin_email,
        "hashed_password": hashed_password,
        "role": UserRole.ADMIN,
        "created_at": datetime.utcnow(),
        "is_blocked": False
    }
    
    await db.users.insert_one(admin_user)
    
    return {
        "message": "Administrateur créé",
        "email": admin_email,
        "password": admin_password,
        "note": "Changez ce mot de passe après la première connexion!"
    }

# =====================================
# FEEDBACK / SIGNALEMENTS
# =====================================

class FeedbackType(str, Enum):
    BUG = "bug"
    SUGGESTION = "suggestion"
    OTHER = "other"

class FeedbackCreate(BaseModel):
    type: str
    message: str
    timestamp: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    type: str
    message: str
    status: str
    created_at: datetime

@api_router.post("/feedback")
async def create_feedback(feedback: FeedbackCreate, user: dict = Depends(get_current_user)):
    """Submit user feedback/bug report"""
    feedback_id = str(uuid.uuid4())
    feedback_doc = {
        "id": feedback_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "type": feedback.type,
        "message": feedback.message,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    await db.feedback.insert_one(feedback_doc)
    return {"message": "Signalement envoyé avec succès", "id": feedback_id}

@api_router.get("/admin/feedback", response_model=List[FeedbackResponse])
async def get_all_feedback(admin: dict = Depends(get_admin_user)):
    """Get all user feedback - admin only"""
    feedback_list = await db.feedback.find().sort("created_at", -1).to_list(500)
    return [FeedbackResponse(
        id=f["id"],
        user_id=f["user_id"],
        user_email=f["user_email"],
        type=f["type"],
        message=f["message"],
        status=f.get("status", "pending"),
        created_at=f["created_at"]
    ) for f in feedback_list]

@api_router.get("/admin/feedback/count")
async def get_feedback_count(admin: dict = Depends(get_admin_user)):
    """Get feedback counts by status and type - admin only"""
    total = await db.feedback.count_documents({})
    pending = await db.feedback.count_documents({"status": "pending"})
    bugs = await db.feedback.count_documents({"type": "bug"})
    suggestions = await db.feedback.count_documents({"type": "suggestion"})
    return {
        "total": total,
        "pending": pending,
        "bugs": bugs,
        "suggestions": suggestions
    }

@api_router.put("/admin/feedback/{feedback_id}/status")
async def update_feedback_status(feedback_id: str, status: str, admin: dict = Depends(get_admin_user)):
    """Update feedback status - admin only"""
    result = await db.feedback.update_one(
        {"id": feedback_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Signalement non trouvé")
    return {"message": "Statut mis à jour"}

@api_router.delete("/admin/feedback/{feedback_id}")
async def delete_feedback(feedback_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a feedback - admin only"""
    result = await db.feedback.delete_one({"id": feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Signalement non trouvé")
    return {"message": "Signalement supprimé"}

# =====================================
# DATA EXPORT (GDPR)
# =====================================

@api_router.get("/account/export")
async def export_user_data(user: dict = Depends(get_current_user)):
    """Export all user data for GDPR compliance"""
    user_id = user["id"]
    
    # Collect all user data
    export_data = {
        "account": {
            "id": user_id,
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user.get("role", "user"),
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
            "settings": user.get("settings", {})
        },
        "personal_courses": [],
        "course_settings": [],
        "sessions": [],
        "personal_events": [],
        "notes": [],
        "ics_subscriptions": [],
        "hidden_items": [],
        "feedback": [],
        "export_date": datetime.utcnow().isoformat()
    }
    
    # Personal courses
    personal_courses = await db.catalog_items.find({"owner_id": user_id}).to_list(1000)
    export_data["personal_courses"] = [
        {"id": c["id"], "title": c["title"], "description": c.get("description"), "created_at": c.get("created_at").isoformat() if c.get("created_at") else None}
        for c in personal_courses
    ]
    
    # Course settings
    settings = await db.user_item_settings.find({"user_id": user_id}).to_list(1000)
    export_data["course_settings"] = [
        {"item_id": s["item_id"], "revision_method": s.get("revision_method"), "j_days": s.get("j_days"), "created_at": s.get("created_at").isoformat() if s.get("created_at") else None}
        for s in settings
    ]
    
    # Sessions
    sessions = await db.study_sessions.find({"user_id": user_id}).to_list(5000)
    export_data["sessions"] = [
        {"id": s["id"], "item_id": s["item_id"], "scheduled_date": s["scheduled_date"], "status": s.get("status"), "j_day": s.get("j_day")}
        for s in sessions
    ]
    
    # Personal events
    events = await db.personal_events.find({"user_id": user_id}).to_list(1000)
    export_data["personal_events"] = [
        {"id": e["id"], "title": e["title"], "start_time": e["start_time"], "end_time": e.get("end_time"), "description": e.get("description")}
        for e in events
    ]
    
    # Notes
    notes = await db.item_notes.find({"user_id": user_id}).to_list(1000)
    export_data["notes"] = [
        {"id": n["id"], "item_id": n["item_id"], "content": n["content"], "created_at": n.get("created_at").isoformat() if n.get("created_at") else None}
        for n in notes
    ]
    
    # ICS subscriptions
    ics_subs = await db.ics_subscriptions.find({"user_id": user_id}).to_list(100)
    export_data["ics_subscriptions"] = [
        {"id": i["id"], "name": i["name"], "url": i["url"]}
        for i in ics_subs
    ]
    
    # Hidden items
    hidden = await db.hidden_items.find({"user_id": user_id}).to_list(1000)
    export_data["hidden_items"] = [h["item_id"] for h in hidden]
    
    # Feedback
    feedback = await db.feedback.find({"user_id": user_id}).to_list(100)
    export_data["feedback"] = [
        {"type": f["type"], "message": f["message"], "created_at": f.get("created_at").isoformat() if f.get("created_at") else None}
        for f in feedback
    ]
    
    return export_data

# =====================================
# USER ACCOUNT SETTINGS
# =====================================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str = "SUPPRIMER"

@api_router.put("/account/password")
async def change_password(request: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Change user password"""
    stored_password = user.get("hashed_password") or user.get("password", "")
    if not verify_password(request.current_password, stored_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit faire au moins 6 caractères")
    
    new_hashed = pwd_context.hash(request.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"hashed_password": new_hashed, "password": new_hashed}}
    )
    
    return {"message": "Mot de passe modifié avec succès"}

@api_router.delete("/account")
async def delete_own_account(request: DeleteAccountRequest, user: dict = Depends(get_current_user)):
    """Delete own account and all data (GDPR compliant)"""
    stored_password = user.get("hashed_password") or user.get("password", "")
    if not verify_password(request.password, stored_password):
        raise HTTPException(status_code=400, detail="Mot de passe incorrect")
    
    if request.confirmation != "SUPPRIMER":
        raise HTTPException(status_code=400, detail="Confirmation incorrecte")
    
    user_id = user["id"]
    
    # Delete all user data
    await db.study_sessions.delete_many({"user_id": user_id})
    await db.user_item_settings.delete_many({"user_id": user_id})
    await db.personal_events.delete_many({"user_id": user_id})
    await db.ics_subscriptions.delete_many({"user_id": user_id})
    await db.item_notes.delete_many({"user_id": user_id})
    await db.hidden_items.delete_many({"user_id": user_id})
    await db.custom_sections.delete_many({"user_id": user_id})
    await db.user_item_colors.delete_many({"user_id": user_id})
    await db.user_item_sections.delete_many({"user_id": user_id})
    await db.catalog_items.delete_many({"owner_id": user_id})
    await db.users.delete_one({"id": user_id})
    
    return {"message": "Compte supprimé avec succès"}

# =====================================
# USER PROFILE PHOTO
# =====================================

class ProfilePhotoRequest(BaseModel):
    photo_base64: str  # Base64 encoded image
    photo_type: str = "custom"  # "custom" or "avatar"

class AvatarOption(BaseModel):
    id: str
    name: str
    url: str

AVATAR_OPTIONS = [
    {"id": "avatar1", "name": "Médecin", "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=doctor"},
    {"id": "avatar2", "name": "Étudiant", "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=student"},
    {"id": "avatar3", "name": "Scientifique", "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=scientist"},
    {"id": "avatar4", "name": "Chercheur", "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=researcher"},
    {"id": "avatar5", "name": "Infirmier", "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=nurse"},
    {"id": "avatar6", "name": "Pharmacien", "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=pharmacist"},
    {"id": "avatar7", "name": "Biologiste", "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=biologist"},
    {"id": "avatar8", "name": "Chirurgien", "url": "https://api.dicebear.com/7.x/avataaars/svg?seed=surgeon"},
]

@api_router.get("/profile/avatars")
async def get_avatar_options():
    """Get predefined avatar options"""
    return AVATAR_OPTIONS

@api_router.put("/profile/photo")
async def update_profile_photo(request: ProfilePhotoRequest, user: dict = Depends(get_current_user)):
    """Update user profile photo"""
    update_data = {
        "profile_photo": request.photo_base64,
        "photo_type": request.photo_type,
        "photo_updated_at": datetime.utcnow()
    }
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update_data}
    )
    
    return {"message": "Photo de profil mise à jour"}

@api_router.put("/profile/avatar/{avatar_id}")
async def set_profile_avatar(avatar_id: str, user: dict = Depends(get_current_user)):
    """Set user profile to predefined avatar"""
    avatar = next((a for a in AVATAR_OPTIONS if a["id"] == avatar_id), None)
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar non trouvé")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "profile_photo": avatar["url"],
            "photo_type": "avatar",
            "avatar_id": avatar_id,
            "photo_updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Avatar défini", "avatar": avatar}

@api_router.delete("/profile/photo")
async def delete_profile_photo(user: dict = Depends(get_current_user)):
    """Delete user profile photo"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$unset": {"profile_photo": "", "photo_type": "", "avatar_id": "", "photo_updated_at": ""}}
    )
    
    return {"message": "Photo de profil supprimée"}

# =====================================
# ROOT & HEALTH
# =====================================
@api_router.get("/")
async def root():
    return {"message": "RevisionMed API v1.0", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.catalog_items.create_index("id", unique=True)
    await db.catalog_items.create_index("parent_id")
    await db.user_item_settings.create_index([("user_id", 1), ("item_id", 1)], unique=True)
    await db.study_sessions.create_index([("user_id", 1), ("scheduled_date", 1)])
    await db.study_sessions.create_index("id", unique=True)
    await db.personal_events.create_index([("user_id", 1)])
    await db.ics_subscriptions.create_index([("user_id", 1)])
    await db.item_notes.create_index([("user_id", 1), ("item_id", 1)], unique=True)
    await db.analytics_logs.create_index([("user_id", 1), ("timestamp", -1)])
    await db.hidden_items.create_index([("user_id", 1), ("item_id", 1)], unique=True)
    await db.catalog_items.create_index("owner_id")
    await db.custom_sections.create_index([("user_id", 1)])
    await db.user_item_colors.create_index([("user_id", 1), ("item_id", 1)], unique=True)
    await db.user_item_sections.create_index([("user_id", 1), ("item_id", 1)], unique=True)
    
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
