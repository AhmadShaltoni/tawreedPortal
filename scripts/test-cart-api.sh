#!/bin/bash
# Cart API Testing Script
# يستخدم curl لاختبار الـ cart endpoints

API_URL="http://localhost:3000/api/v1"
TOKEN="your-jwt-token-here"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛒 Tawreed Cart API Testing${NC}\n"

# Test 1: Get empty cart
echo -e "${YELLOW}Test 1: GET /api/v1/cart (Empty Cart)${NC}"
curl -X GET "${API_URL}/cart" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -s | jq '.' 
echo -e "\n"

# Test 2: Add item without flavor
echo -e "${YELLOW}Test 2: POST /api/v1/cart (Add item without flavor)${NC}"
curl -X POST "${API_URL}/cart" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "VARIANT_UUID_HERE",
    "quantity": 2
  }' \
  -s | jq '.'
echo -e "\n"

# Test 3: Add item with flavor (option)
echo -e "${YELLOW}Test 3: POST /api/v1/cart (Add item with flavor)${NC}"
curl -X POST "${API_URL}/cart" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "variantId": "VARIANT_UUID_HERE",
    "variantOptionId": "OPTION_UUID_HERE",
    "quantity": 1
  }' \
  -s | jq '.'
echo -e "\n"

# Test 4: Get cart with items
echo -e "${YELLOW}Test 4: GET /api/v1/cart (With items)${NC}"
curl -X GET "${API_URL}/cart" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -s | jq '.'
echo -e "\n"

# Test 5: Update cart item quantity
echo -e "${YELLOW}Test 5: PATCH /api/v1/cart/{itemId} (Update quantity)${NC}"
# Note: Replace CART_ITEM_ID with actual ID from cart
curl -X PATCH "${API_URL}/cart/CART_ITEM_ID" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 5
  }' \
  -s | jq '.'
echo -e "\n"

# Test 6: Remove item from cart
echo -e "${YELLOW}Test 6: DELETE /api/v1/cart/{itemId} (Remove item)${NC}"
curl -X DELETE "${API_URL}/cart/CART_ITEM_ID" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -s | jq '.'
echo -e "\n"

# Test 7: Get orders
echo -e "${YELLOW}Test 7: GET /api/v1/orders (List orders)${NC}"
curl -X GET "${API_URL}/orders?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -s | jq '.'
echo -e "\n"

# Test 8: Get order details
echo -e "${YELLOW}Test 8: GET /api/v1/orders/{id} (Order details)${NC}"
# Note: Replace ORDER_ID with actual order ID
curl -X GET "${API_URL}/orders/ORDER_ID" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -s | jq '.'
echo -e "\n"

echo -e "${GREEN}✅ All tests completed!${NC}"
