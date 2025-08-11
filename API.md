# TPX Booking System API

Version: 1.0
Base URL: /api/
Auth: JWT Bearer (Authorization: Bearer <access_token>)
Docs:
- OpenAPI JSON: GET /api/schema/
- Swagger UI: GET /api/docs/swagger/
- ReDoc: GET /api/docs/redoc/

Conventions:
- Content-Type: application/json
- Timezone: UTC (server)
- Monetary values: decimal strings (DB Decimal)
- Date/time format: date YYYY-MM-DD, time HH:MM[:SS]

Global errors:
- 401 Unauthorized when token missing/invalid
- 403 Forbidden when permission denied
- 404 Not Found when resource missing
- 400 Validation errors in DRF format:
  {
    "field_name": ["error message"],
    "non_field_errors": ["..."]
  }

------------------------------------------------------------
Authentication
------------------------------------------------------------

1) Register
POST /api/register/
Public

Creates a new user and sends a welcome email (non-blocking; failures don’t break registration).

Request body
{
  "username": "string (unique, required)",
  "password": "string (required, validated by Django)",
  "nickname": "string (optional)",
  "mobile_number": "string (unique, required)",
  "email": "email (unique, required)",
  "birthday": "YYYY-MM-DD (optional)"
}

Success 201
{
  "id": number,
  "username": "string",
  "email": "string",
  "nickname": "string",
  "mobile_number": "string",
  "birthday": "YYYY-MM-DD|null"
}

Possible errors
- 400:
  {
    "username": ["A user with that username already exists."],
    "email": ["user with this Email already exists."],
    "mobile_number": ["user with this Mobile number already exists."],
    "password": ["This password is too short.", "..."]
  }

Curl
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username":"alice",
    "password":"P@ssw0rd!",
    "mobile_number":"09123456789",
    "email":"alice@example.com"
  }'

2) Login (obtain tokens with extra claims)
POST /api/login/
Public

Request body
{
  "username": "string",
  "password": "string"
}

Success 200
{
  "refresh": "<jwt>",
  "access": "<jwt>",
  "role": "client|barber|administrator|staff",
  "is_staff": true|false
}

Errors
- 401:
  {
    "detail": "No active account found with the given credentials"
  }

Curl
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"P@ssw0rd!"}'

3) Obtain/Refresh tokens (standard)
POST /api/token/
POST /api/token/refresh/
Public

POST /api/token/ (same request as login)
{
  "username": "string",
  "password": "string"
}
-> 200: { "refresh": "<jwt>", "access": "<jwt>" }

POST /api/token/refresh/
{
  "refresh": "<jwt>"
}
-> 200: { "access": "<jwt>" }

Errors
- 401/401-like payload from SimpleJWT:
  {
    "detail": "Given token not valid for any token type",
    "code": "token_not_valid",
    "messages": [
      { "token_class": "AccessToken|RefreshToken", "token_type": "access|refresh", "message": "Token is expired" }
    ]
  }

------------------------------------------------------------
Services
------------------------------------------------------------

Base: /api/services/
View: ServiceViewSet
Auth: Public (no permission class configured)

Model fields
- id: int
- name: string (required)
- description: string
- duration_minutes: int (default 30)
- price: decimal string "100.00"

Endpoints
- GET /api/services/
- POST /api/services/
- GET /api/services/{id}/
- PUT /api/services/{id}/
- PATCH /api/services/{id}/
- DELETE /api/services/{id}/

List (GET /api/services/)
- Query params: none
- 200 OK: array<Service>

Retrieve (GET /api/services/{id}/)
- Path params: id (int)
- 200 OK: Service
- 404 Not Found

Create (POST /api/services/)
- Body (application/json):
  {
    "name": "Basic Cut",
    "description": "Trendy cut",
    "duration_minutes": 30,
    "price": "100.00"
  }
- 201 Created: Service
- 400 Validation errors

Update full (PUT /api/services/{id}/)
- Path: id (int)
- Body: same as Create (all fields required)
- 200 OK: Service
- 400/404 on errors

Partial update (PATCH /api/services/{id}/)
- Path: id (int)
- Body: any subset of fields
- 200 OK: Service
- 400/404 on errors

Delete (DELETE /api/services/{id}/)
- Path: id (int)
- 204 No Content
- 404 Not Found

Create/Update body
{
  "name": "Basic Cut",
  "description": "Trendy cut",
  "duration_minutes": 30,
  "price": "100.00"
}

Success (list item)
{
  "id": 1,
  "name": "Basic Cut",
  "description": "Trendy cut",
  "duration_minutes": 30,
  "price": "100.00"
}

Errors
- 400: field validation errors
- 404: when {id} not found

Curl (list)
curl http://localhost:8000/api/services/

------------------------------------------------------------
Barbers
------------------------------------------------------------

Base: /api/barbers/
View: BarberViewSet
Auth: Public (no permission class configured) — consider protecting

Model fields
- id: int
- user: FK user (required)
- full_name: string (required)
- is_active: bool (default true)
- services: array<int> (ManyToMany to Service)

Endpoints
- GET /api/barbers/
- POST /api/barbers/
- GET /api/barbers/{id}/
- PUT /api/barbers/{id}/
- PATCH /api/barbers/{id}/
- DELETE /api/barbers/{id}/

List (GET /api/barbers/)
- Query params: none
- 200 OK: array<Barber>

Retrieve (GET /api/barbers/{id}/)
- Path: id (int)
- 200 OK: Barber
- 404 Not Found

Create (POST /api/barbers/)
- Body:
  {
    "user": 3,
    "full_name": "John Smith",
    "is_active": true,
    "services": [1, 2]
  }
- 201 Created: Barber
- 400 Validation errors (e.g., non-existent service IDs)

Update (PUT /api/barbers/{id}/)
- Path: id (int)
- Body: all fields required (see Create)
- 200 OK: Barber
- 400/404 on errors

Partial update (PATCH /api/barbers/{id}/)
- Path: id (int)
- Body: any subset of fields
- 200 OK: Barber
- 400/404 on errors

Delete (DELETE /api/barbers/{id}/)
- Path: id (int)
- 204 No Content
- 404 Not Found

Create/Update body
{
  "user": 3,
  "full_name": "John Smith",
  "is_active": true,
  "services": [1, 2]
}

Success (list item)
{
  "id": 2,
  "user": 3,
  "full_name": "John Smith",
  "is_active": true,
  "services": [1, 2]
}

Errors
- 400: field validation errors
- 404: when {id} not found

Curl (list)
curl http://localhost:8000/api/barbers/

------------------------------------------------------------
Bookings
------------------------------------------------------------

Base: /api/bookings/
View: BookingViewSet
Auth: Public (current code has no permission class)
Notes:
- Serializer fields do not include `user`; POST may fail due to missing owner assignment.

Model fields
- id: int
- booking_code: string (auto, read-only)
- user: FK (implicit, not in serializer)
- service: FK Service (required)
- barber: FK Barber (optional)
- date: "YYYY-MM-DD"
- time: "HH:MM"
- status: "pending|confirmed|cancelled" (read-only, default pending)
- created_at: datetime (read-only)
- barber_name: string (read-only, from barber.full_name)

Endpoints
- GET /api/bookings/
- POST /api/bookings/
- GET /api/bookings/{id}/
- PUT /api/bookings/{id}/
- PATCH /api/bookings/{id}/
- DELETE /api/bookings/{id}/

List (GET /api/bookings/)
- 200 OK: array<Booking>

Retrieve (GET /api/bookings/{id}/)
- Path: id (int)
- 200 OK: Booking
- 404 Not Found

Create (POST /api/bookings/)
- Body:
  {
    "service": 1,
    "barber": 2,               // optional, null allowed
    "date": "2025-12-30",
    "time": "10:30"
  }
- 201 Created: Booking (if server assigns user)
- 400/500 if user ownership not set by server

Update (PUT /api/bookings/{id}/)
- Path: id (int)
- Body: all updatable fields (service, barber, date, time)
- 200 OK: Booking
- 400/404 on errors

Partial update (PATCH /api/bookings/{id}/)
- Path: id (int)
- Body: subset of fields
- 200 OK: Booking
- 400/404 on errors

Delete (DELETE /api/bookings/{id}/)
- Path: id (int)
- 204 No Content
- 404 Not Found

Create/Update body
{
  "service": 1,
  "barber": 2,               // optional, null allowed
  "date": "2025-12-30",
  "time": "10:30"
}

Success 200/201
{
  "id": 10,
  "service": 1,
  "barber": 2,
  "barber_name": "John Smith",
  "date": "2025-12-30",
  "time": "10:30:00",
  "status": "pending",
  "created_at": "2025-08-11T06:28:58Z"
}

Errors
- 401: missing/invalid token
- 403: accessing another user’s booking (implicitly handled by queryset)
- 400: validation errors (e.g., invalid date/time/service)
- 404: booking not found (or out of user scope)

Curl (create)
curl -X POST http://localhost:8000/api/bookings/ \
  -H "Authorization: Bearer <ACCESS>" \
  -H "Content-Type: application/json" \
  -d '{"service":1,"date":"2025-12-30","time":"10:30"}'

------------------------------------------------------------
Clients
------------------------------------------------------------

Base: /api/clients/
View: ClientViewSet (ReadOnlyModelViewSet)
Auth: Public (no permission class configured)

Description
- Returns users with `role = "client"`.

Serializer fields (UserSerializer)
- id: number
- username: string
- nickname: string|null
- email: string
- mobile_number: string
- birthday: YYYY-MM-DD|null
- role: string ("client"|"barber"|"administrator"|"staff")

Endpoints
- GET /api/clients/
- GET /api/clients/{id}/

Success 200 (list)
[
  {
    "id": 7,
    "username": "alice",
    "nickname": "Ali",
    "email": "alice@example.com",
    "mobile_number": "09123456789",
    "birthday": "1999-01-01",
    "role": "client"
  }
]

Retrieve 200
{
  "id": 7,
  "username": "alice",
  "nickname": "Ali",
  "email": "alice@example.com",
  "mobile_number": "09123456789",
  "birthday": "1999-01-01",
  "role": "client"
}

Errors
- 401: missing/invalid token

Curl (list)
curl http://localhost:8000/api/clients/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

------------------------------------------------------------
Loyalty Points
------------------------------------------------------------

Base: /api/points/
View: LoyaltyPointViewSet
Auth: Public (no permission class configured) — consider protecting

Model fields
- id: int
- user: FK user
- total_points: int (default 0)
- last_updated: datetime (auto)

Endpoints
- GET /api/points/
- POST /api/points/
- GET /api/points/{id}/
- PUT /api/points/{id}/
- PATCH /api/points/{id}/
- DELETE /api/points/{id}/

List (GET /api/points/)
- 200 OK: array<LoyaltyPoint>

Retrieve (GET /api/points/{id}/)
- Path: id (int)
- 200 OK: LoyaltyPoint
- 404 Not Found

Create (POST /api/points/)
- Body:
  {
    "user": 3,
    "total_points": 120
  }
- 201 Created: LoyaltyPoint
- 400 Validation errors

Update (PUT /api/points/{id}/)
- Path: id (int)
- Body: all fields required
- 200 OK
- 400/404 on errors

Partial update (PATCH /api/points/{id}/)
- Path: id (int)
- Body: subset of fields
- 200 OK
- 400/404 on errors

Delete (DELETE /api/points/{id}/)
- Path: id (int)
- 204 No Content
- 404 Not Found

Create/Update body
{
  "user": 3,
  "total_points": 120
}

Success
{
  "id": 5,
  "user": 3,
  "total_points": 120,
  "last_updated": "2025-08-11T06:28:58Z"
}

Errors
- 400: invalid or missing fields
- 404: record not found

Curl (list)
curl http://localhost:8000/api/points/

------------------------------------------------------------
Vouchers
------------------------------------------------------------

Base: /api/vouchers/
View: VoucherViewSet (ModelViewSet + custom action)
Auth: Required (IsAuthenticated)

Model fields
- id: int
- code: string (unique, <=12)
- user: FK user
- value: decimal string (e.g., "50.00")
- points_required: int
- redeemed: bool
- expires_at: datetime
- created_at: datetime

Endpoints
- GET /api/vouchers/
- POST /api/vouchers/
- GET /api/vouchers/{id}/
- PUT /api/vouchers/{id}/
- PATCH /api/vouchers/{id}/
- DELETE /api/vouchers/{id}/

List (GET /api/vouchers/)
- 200 OK: array<Voucher>

Retrieve (GET /api/vouchers/{id}/)
- Path: id (int)
- 200 OK: Voucher
- 404 Not Found

Create (POST /api/vouchers/)
- Body:
  {
    "code": "ABC123",
    "user": 3,
    "value": "50.00",
    "points_required": 100,
    "redeemed": false,
    "expires_at": "2025-12-31T23:59:59Z"
  }
- 201 Created: Voucher
- 400 Validation errors

Update (PUT /api/vouchers/{id}/)
- Path: id (int)
- Body: all fields required
- 200 OK
- 400/404 on errors

Partial update (PATCH /api/vouchers/{id}/)
- Path: id (int)
- Body: subset of fields
- 200 OK
- 400/404 on errors

Delete (DELETE /api/vouchers/{id}/)
- Path: id (int)
- 204 No Content
- 404 Not Found

Create/Update body
{
  "code": "ABC123",
  "user": 3,
  "value": "50.00",
  "points_required": 100,
  "redeemed": false,
  "expires_at": "2025-12-31T23:59:59Z"
}

Success (example)
{
  "id": 12,
  "code": "ABC123",
  "user": 3,
  "value": "50.00",
  "points_required": 100,
  "redeemed": false,
  "expires_at": "2025-12-31T23:59:59Z",
  "created_at": "2025-08-11T06:28:58Z"
}

Errors
- 401: missing/invalid token
- 400: field validation errors
- 404: not found

Custom Action: Redeem
POST /api/vouchers/redeem/
Auth: Required

Body
{
  "code": "ABC123",
  "total_amount": "100.00"
}

Success 200
{
  "message": "Voucher redeemed successfully for user <username>.",
  "original_amount": 100.0,
  "discounted_amount": 50.0,
  "voucher_code": "ABC123"
}

Errors
- 400: { "detail": "code and total_amount are required." }
- 400: { "detail": "Voucher already redeemed." }
- 400: { "detail": "Voucher has expired." }
- 403: { "detail": "You are not allowed to redeem this voucher." }
- 404: { "detail": "Voucher not found." }

Curl
curl -X POST http://localhost:8000/api/vouchers/redeem/ \
  -H "Authorization: Bearer <ACCESS>" \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123","total_amount":"100.00"}'

------------------------------------------------------------
Sales
------------------------------------------------------------

Base: /api/sales/
View: SaleViewSet
Auth: Public (no permission class configured) — consider protecting

Model fields
- id: int
- user: FK user
- voucher: FK voucher|null
- total_amount: decimal string
- discounted_amount: decimal string
- sale_date: datetime

Endpoints
- GET /api/sales/
- POST /api/sales/
- GET /api/sales/{id}/
- PUT /api/sales/{id}/
- PATCH /api/sales/{id}/
- DELETE /api/sales/{id}/

List (GET /api/sales/)
- 200 OK: array<Sale>

Retrieve (GET /api/sales/{id}/)
- Path: id (int)
- 200 OK: Sale
- 404 Not Found

Create (POST /api/sales/)
- Body:
  {
    "user": 3,
    "voucher": 12,     // optional
    "total_amount": "100.00",
    "discounted_amount": "50.00"
  }
- 201 Created: Sale
- 400 Validation errors

Update (PUT /api/sales/{id}/)
- Path: id (int)
- Body: all fields required
- 200 OK
- 400/404 on errors

Partial update (PATCH /api/sales/{id}/)
- Path: id (int)
- Body: subset of fields
- 200 OK
- 400/404 on errors

Delete (DELETE /api/sales/{id}/)
- Path: id (int)
- 204 No Content
- 404 Not Found

Create/Update body
{
  "user": 3,
  "voucher": 12,                 // or null
  "total_amount": "100.00",
  "discounted_amount": "50.00"
}

Success
{
  "id": 20,
  "user": 3,
  "voucher": 12,
  "total_amount": "100.00",
  "discounted_amount": "50.00",
  "sale_date": "2025-08-11T06:28:58Z"
}

Errors
- 400: invalid fields
- 404: record not found

------------------------------------------------------------
Pagination & Filtering
------------------------------------------------------------

- No custom filters defined in code shown. If global DRF pagination is enabled, list responses follow DRF pagination format:
  {
    "count": number,
    "next": "url|null",
    "previous": "url|null",
    "results": [ ...items ]
  }

------------------------------------------------------------
Integration Notes
------------------------------------------------------------

- Do not send Authorization header on /api/register/ or /api/login/.
- Always send Authorization for protected endpoints (bookings, vouchers, redeem).
- Convert decimal strings to numbers in UI if needed.
- Handle 401 by redirecting to login and refreshing tokens if applicable.
- Handle 403 by showing a permission error.
- Show validation messages from 400 responses near the relevant fields.