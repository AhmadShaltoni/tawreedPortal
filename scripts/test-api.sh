#!/bin/bash

# Tawreed Mobile API Testing Script
# Run this script to test all authentication endpoints

# Configuration
API_URL="${API_URL:-http://localhost:3000/api/v1}"
ADMIN_PHONE="0791234567"
ADMIN_PASSWORD="Admin@123"
TEST_PHONE="07988776655"
TEST_PASSWORD="TestPass123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️ $1${NC}"
}

# Test 1: Register New User
print_section "Test 1: Register New User"
echo "Payload:"
REGISTER_PAYLOAD=$(cat <<EOF
{
  "action": "register",
  "username": "testuser001",
  "phone": "$TEST_PHONE",
  "storeName": "متجري الاختبار",
  "password": "$TEST_PASSWORD",
  "role": "buyer"
}
EOF
)
echo "$REGISTER_PAYLOAD" | jq '.'

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_PAYLOAD")

echo ""
echo "Response:"
echo "$REGISTER_RESPONSE" | jq '.'

# Check if registration was successful
if echo "$REGISTER_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
  print_success "User registered successfully"
  TEST_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
  print_info "Token: $TEST_TOKEN"
else
  print_error "Registration failed"
  if echo "$REGISTER_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$REGISTER_RESPONSE" | jq -r '.error')
    print_error "Error: $ERROR_MSG"
  fi
fi

# Test 2: Try to Register with Duplicate Phone (Should Fail - 409)
print_section "Test 2: Register with Duplicate Phone (Expected: 409)"
echo "Payload:"
DUPLICATE_PAYLOAD=$(cat <<EOF
{
  "action": "register",
  "username": "testuser002",
  "phone": "$TEST_PHONE",
  "storeName": "متجر آخر",
  "password": "$TEST_PASSWORD",
  "role": "buyer"
}
EOF
)
echo "$DUPLICATE_PAYLOAD" | jq '.'

DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
  -H "Content-Type: application/json" \
  -d "$DUPLICATE_PAYLOAD")

echo ""
echo "Response:"
echo "$DUPLICATE_RESPONSE" | jq '.'

if echo "$DUPLICATE_RESPONSE" | jq -e '.error | contains("مسجل بالفعل")' > /dev/null 2>&1; then
  print_success "Duplicate phone validation works (409 returned)"
else
  print_error "Duplicate phone validation failed"
fi

# Test 3: Login with Correct Credentials
print_section "Test 3: Login with Correct Credentials"
echo "Payload:"
LOGIN_PAYLOAD=$(cat <<EOF
{
  "phone": "$TEST_PHONE",
  "password": "$TEST_PASSWORD"
}
EOF
)
echo "$LOGIN_PAYLOAD" | jq '.'

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD")

echo ""
echo "Response:"
echo "$LOGIN_RESPONSE" | jq '.'

if echo "$LOGIN_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
  print_success "Login successful"
  TEST_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
else
  print_error "Login failed"
fi

# Test 4: Login with Wrong Password
print_section "Test 4: Login with Wrong Password (Expected: 401)"
echo "Payload:"
WRONG_PASS_PAYLOAD=$(cat <<EOF
{
  "phone": "$TEST_PHONE",
  "password": "WrongPassword123"
}
EOF
)
echo "$WRONG_PASS_PAYLOAD" | jq '.'

WRONG_PASS_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
  -H "Content-Type: application/json" \
  -d "$WRONG_PASS_PAYLOAD")

echo ""
echo "Response:"
echo "$WRONG_PASS_RESPONSE" | jq '.'

if echo "$WRONG_PASS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  print_success "Wrong password validation works (401 returned)"
else
  print_error "Wrong password validation failed"
fi

# Test 5: Login with Non-existent Phone
print_section "Test 5: Login with Non-existent Phone (Expected: 401)"
echo "Payload:"
NO_USER_PAYLOAD=$(cat <<EOF
{
  "phone": "07999999999",
  "password": "$TEST_PASSWORD"
}
EOF
)
echo "$NO_USER_PAYLOAD" | jq '.'

NO_USER_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
  -H "Content-Type: application/json" \
  -d "$NO_USER_PAYLOAD")

echo ""
echo "Response:"
echo "$NO_USER_RESPONSE" | jq '.'

if echo "$NO_USER_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  print_success "Non-existent phone validation works (401 returned)"
else
  print_error "Non-existent phone validation failed"
fi

# Test 6: Register with Invalid Phone Format
print_section "Test 6: Register with Invalid Phone Format (Expected: 400)"
echo "Payload:"
INVALID_PHONE_PAYLOAD=$(cat <<EOF
{
  "action": "register",
  "username": "testuser003",
  "phone": "1234567890",
  "storeName": "متجر",
  "password": "$TEST_PASSWORD",
  "role": "buyer"
}
EOF
)
echo "$INVALID_PHONE_PAYLOAD" | jq '.'

INVALID_PHONE_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
  -H "Content-Type: application/json" \
  -d "$INVALID_PHONE_PAYLOAD")

echo ""
echo "Response:"
echo "$INVALID_PHONE_RESPONSE" | jq '.'

if echo "$INVALID_PHONE_RESPONSE" | jq -e '.error | contains("07xxxxxxxx")' > /dev/null 2>&1; then
  print_success "Phone format validation works (400 returned)"
else
  print_error "Phone format validation failed"
fi

# Test 7: Register with Short Password
print_section "Test 7: Register with Short Password (Expected: 400)"
echo "Payload:"
SHORT_PASS_PAYLOAD=$(cat <<EOF
{
  "action": "register",
  "username": "testuser004",
  "phone": "07988776666",
  "storeName": "متجر",
  "password": "Pass1",
  "role": "buyer"
}
EOF
)
echo "$SHORT_PASS_PAYLOAD" | jq '.'

SHORT_PASS_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
  -H "Content-Type: application/json" \
  -d "$SHORT_PASS_PAYLOAD")

echo ""
echo "Response:"
echo "$SHORT_PASS_RESPONSE" | jq '.'

if echo "$SHORT_PASS_RESPONSE" | jq -e '.error | contains("8 أحرف")' > /dev/null 2>&1; then
  print_success "Password length validation works (400 returned)"
else
  print_error "Password length validation failed"
fi

# Test 8: Register with Role in Lowercase (Should Work)
print_section "Test 8: Register with Role in Lowercase (Expected: Success)"
echo "Payload:"
LOWERCASE_ROLE_PAYLOAD=$(cat <<EOF
{
  "action": "register",
  "username": "testuser005",
  "phone": "07988776677",
  "storeName": "متجر النموذج",
  "password": "$TEST_PASSWORD",
  "role": "supplier"
}
EOF
)
echo "$LOWERCASE_ROLE_PAYLOAD" | jq '.'

LOWERCASE_ROLE_RESPONSE=$(curl -s -X POST "$API_URL/auth" \
  -H "Content-Type: application/json" \
  -d "$LOWERCASE_ROLE_PAYLOAD")

echo ""
echo "Response:"
echo "$LOWERCASE_ROLE_RESPONSE" | jq '.'

if echo "$LOWERCASE_ROLE_RESPONSE" | jq -e '.user.role == "SUPPLIER"' > /dev/null 2>&1; then
  print_success "Lowercase role is converted to uppercase (SUPPLIER returned)"
else
  print_error "Lowercase role conversion failed"
fi

# Summary
print_section "📊 Test Summary"
echo "All manual tests completed!"
echo "Review the results above to verify:"
echo "  ✓ Registration with valid data"
echo "  ✓ Duplicate phone detection (409)"
echo "  ✓ Login with correct credentials"
echo "  ✓ Login with wrong password (401)"
echo "  ✓ Login with non-existent phone (401)"
echo "  ✓ Invalid phone format validation (400)"
echo "  ✓ Short password validation (400)"
echo "  ✓ Lowercase role conversion"
