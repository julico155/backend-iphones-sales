# Chato POS — API Reference

## Tabla de contenidos

- [Información general](#información-general)
- [Autenticación](#autenticación)
- [Planes y límites](#planes-y-límites)
- [Módulos](#módulos)
  - [Auth](#auth)
  - [Tenants](#tenants)
  - [Users](#users)
  - [Products](#products)
  - [Items](#items)
  - [Sales](#sales)
  - [Public](#public)
  - [Health](#health)
- [Códigos de error comunes](#códigos-de-error-comunes)

---

## Información general

**Base URL local:** `http://localhost:3000`  
**Base URL producción:** `https://backend-production-7f909.up.railway.app`  
**Swagger UI:** `{BASE_URL}/api`  
**Swagger JSON:** `{BASE_URL}/api-json`

### Headers requeridos

| Header | Valor | Cuándo |
|---|---|---|
| `Authorization` | `Bearer {token}` | Todos los endpoints protegidos |
| `X-Tenant-ID` | UUID del tenant | Endpoints de operación (items, products, sales, users/my-team) |
| `Content-Type` | `application/json` | Cuando el body es JSON |

### Arquitectura multi-tenant

El sistema es **multi-tenant**: cada tienda tiene su propio `tenantId`. El token JWT ya contiene el `tenantId` del usuario, y el header `X-Tenant-ID` se usa para validar que el usuario opera en su propia tienda. Si el `tenantId` del token no coincide con el header, la respuesta es `403`.

### Flujo de autenticación completo

```
1. POST /public/tenants/lookup/:slug  → obtener el tenantId de la tienda
2. POST /auth/login                    → obtener el accessToken
3. Usar token en Authorization header  → acceder a endpoints protegidos
4. Si mustChangePassword === true      → llamar POST /auth/update-password antes de cualquier otra operación
```

---

## Autenticación

### JWT Payload

El token contiene:

```json
{
  "sub": "uuid-del-usuario",
  "email": "usuario@email.com",
  "role": "ADMIN | SELLER",
  "tenantId": "uuid-del-tenant",
  "mustChangePassword": false,
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Expiración:** 24 horas.

### mustChangePassword

Si el usuario es creado por un admin y tiene `mustChangePassword: true`, **todos los endpoints devuelven 403** hasta que cambie su contraseña vía `POST /auth/update-password`.

---

## Planes y límites

Cada tenant tiene un plan asignado por el administrador del sistema.

| Plan | Usuarios activos | Items activos en inventario |
|---|---|---|
| `BASIC` | 2 | 20 |
| `PRO` | 5 | 50 |
| `MAX` | 10 | 100 |

Cuando se supera el límite al crear un usuario o un item, la respuesta es:

```json
{
  "statusCode": 403,
  "message": "Tu plan BASIC permite máximo 2 usuarios activos. Contacta al administrador para actualizar tu plan."
}
```

---

## Módulos

---

## Auth

### `POST /auth/login`

Login de usuario. Máximo **5 intentos por minuto** (rate limit).

**Sin autenticación.**

**Body:**
```json
{
  "email": "usuario@tienda.com",
  "password": "contraseña123"
}
```

**Respuesta exitosa `200`:**
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "usuario@tienda.com",
    "role": "SELLER",
    "tenantId": "uuid-tenant",
    "mustChangePassword": false
  }
}
```

> Si `mustChangePassword: true`, el usuario debe llamar `POST /auth/update-password` antes de poder usar cualquier otro endpoint.

---

### `POST /auth/update-password`

Cambia la contraseña del usuario autenticado. Disponible aunque `mustChangePassword` sea `true`.

**Requiere:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "currentPassword": "contraseña_actual",
  "newPassword": "nueva_contraseña"
}
```

**Respuesta exitosa `200`:**
```json
{
  "message": "Contraseña actualizada con éxito. Ya puedes usar el sistema de forma segura."
}
```

---

### `GET /auth/profile`

Devuelve el perfil del usuario autenticado con datos de su tenant.

**Requiere:** `Authorization: Bearer {token}`

**Respuesta exitosa `200`:**
```json
{
  "id": "uuid",
  "name": "Juan Pérez",
  "email": "usuario@tienda.com",
  "role": "SELLER",
  "tenantId": "uuid-tenant",
  "tenant": {
    "name": "Tienda Central",
    "slug": "tienda-central"
  }
}
```

---

## Tenants

> Todos los endpoints de este módulo requieren rol **Admin SaaS** (tenant `system-admin`).

### `POST /tenants`

Crea una nueva tienda.

**Body:**
```json
{
  "name": "Tienda Central",
  "slug": "tienda-central"
}
```

**Respuesta exitosa `201`:**
```json
{
  "id": "uuid",
  "name": "Tienda Central",
  "slug": "tienda-central",
  "plan": "BASIC",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### `GET /tenants`

Lista todas las tiendas del sistema.

**Respuesta exitosa `200`:** Array de tenants con todos sus campos.

---

### `PATCH /tenants/:id/plan`

Cambia el plan de una tienda.

**Body:**
```json
{
  "plan": "PRO"
}
```

> Valores válidos: `BASIC`, `PRO`, `MAX`

**Respuesta exitosa `200`:**
```json
{
  "message": "Plan actualizado a PRO correctamente.",
  "tenant": {
    "id": "uuid",
    "name": "Tienda Central",
    "slug": "tienda-central",
    "plan": "PRO",
    "isActive": true
  }
}
```

---

### `PATCH /tenants/:id/toggle`

Activa o desactiva una tienda. El tenant `system-admin` no puede desactivarse.

**Sin body.**

**Respuesta exitosa `200`:**
```json
{
  "message": "Tienda desactivada correctamente.",
  "tenant": {
    "id": "uuid",
    "name": "Tienda Central",
    "slug": "tienda-central",
    "isActive": false
  }
}
```

---

## Users

### Endpoints para Admin SaaS (gestión global)

> Requieren rol **Admin SaaS**.

#### `POST /users`

Crea un usuario en cualquier tenant.

**Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@tienda.com",
  "password": "contraseña123",
  "role": "ADMIN",
  "tenantId": "uuid-del-tenant"
}
```

> Valores válidos para `role`: `ADMIN`, `SELLER`

**Respuesta exitosa `201`:**
```json
{
  "id": "uuid",
  "name": "Juan Pérez",
  "email": "juan@tienda.com",
  "role": "ADMIN",
  "tenantId": "uuid-tenant",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

> El usuario creado tendrá `mustChangePassword: true` por defecto.

---

#### `GET /users`

Lista todos los usuarios del sistema con su tenant.

**Respuesta exitosa `200`:** Array con todos los usuarios.

---

### Endpoints para Admin de tienda (gestión del equipo)

> Requieren `Authorization` + `X-Tenant-ID` + rol `ADMIN`.

#### `GET /users/my-team`

Lista los usuarios de la tienda propia.

**Respuesta exitosa `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "juan@tienda.com",
    "role": "SELLER",
    "isActive": true,
    "mustChangePassword": false
  }
]
```

---

#### `POST /users/my-team`

Crea un usuario dentro de la tienda propia. El `tenantId` se toma del token JWT, no del body.

Sujeto al límite de usuarios del plan activo.

**Body:**
```json
{
  "name": "María López",
  "email": "maria@tienda.com",
  "password": "contraseña123",
  "role": "SELLER"
}
```

**Respuesta exitosa `201`:**
```json
{
  "id": "uuid",
  "name": "María López",
  "email": "maria@tienda.com",
  "role": "SELLER",
  "isActive": true,
  "mustChangePassword": true
}
```

---

#### `PATCH /users/my-team/:id/toggle`

Activa o desactiva un usuario de la tienda. No se puede aplicar al propio usuario.

**Sin body.**

**Respuesta exitosa `200`:**
```json
{
  "message": "Usuario desactivado correctamente.",
  "user": {
    "id": "uuid",
    "name": "María López",
    "email": "maria@tienda.com",
    "role": "SELLER",
    "isActive": false
  }
}
```

---

## Products

> Requieren `Authorization` + `X-Tenant-ID`.

El catálogo de productos define los modelos disponibles (ej: iPhone 15 Pro Max 256GB Negro). Son independientes de las unidades físicas (Items).

### `POST /products`

Crea un modelo de producto.

**Body:**
```json
{
  "model": "iPhone 15 Pro Max",
  "storage": "256GB",
  "color": "Negro Titanio",
  "suggestedPrice": 1200.00
}
```

**Respuesta exitosa `201`:** Objeto del producto creado.

> La combinación `(tenantId, model, storage, color)` es única. Si ya existe devuelve `409`.

---

### `GET /products`

Lista todos los productos del catálogo de la tienda.

**Respuesta exitosa `200`:** Array de productos.

---

### `GET /products/:id`

Obtiene un producto por ID.

**Respuesta exitosa `200`:** Objeto del producto.

---

### `PATCH /products/:id`

Actualiza un producto. Solo se envían los campos a modificar.

**Body (todos opcionales):**
```json
{
  "model": "iPhone 15 Pro Max",
  "storage": "512GB",
  "color": "Blanco",
  "suggestedPrice": 1350.00
}
```

---

### `DELETE /products/:id`

Elimina un producto del catálogo.

> No se puede eliminar si tiene items asociados.

---

## Items

> Requieren `Authorization` + `X-Tenant-ID`.

Los items son las **unidades físicas** del inventario, cada una con su IMEI único.

### Estados de un item

| Estado | Descripción |
|---|---|
| `AVAILABLE` | Disponible para la venta |
| `SOLD` | Vendido (pertenece a una venta) |
| `INACTIVE` | Dado de baja (soft delete) |

---

### `POST /items`

Registra un iPhone físico en el inventario. Soporta carga de fotos.

Sujeto al límite de items del plan activo (solo cuenta los `AVAILABLE`).

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `productId` | UUID | Sí | ID del producto del catálogo |
| `imei` | string (15 chars) | Sí | IMEI único global |
| `serialNumber` | string | No | Número de serie |
| `batteryHealth` | number | No | Porcentaje de salud de batería |
| `condition` | `NEW \| SEMI_NEW` | No | Condición del equipo (default: NEW) |
| `costPrice` | number | No | Precio de costo |
| `salePrice` | number | No | Precio de venta sugerido |
| `notes` | string | No | Notas internas |
| `photos` | files | No | Hasta 5 imágenes |

**Respuesta exitosa `201`:** Objeto del item creado con URLs de imágenes.

---

### `GET /items`

Lista el inventario paginado. Excluye items `INACTIVE` por defecto.

**Query params:**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | number | 1 | Página |
| `limit` | number | 20 | Items por página (máx 100) |
| `status` | `AVAILABLE \| SOLD \| INACTIVE` | — | Filtra por estado (sin filtro = excluye INACTIVE) |

**Respuesta exitosa `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "imei": "123456789012345",
      "condition": "NEW",
      "status": "AVAILABLE",
      "costPrice": "800.00",
      "salePrice": "1100.00",
      "batteryHealth": 98,
      "images": ["https://..."],
      "product": {
        "model": "iPhone 15 Pro Max",
        "storage": "256GB",
        "color": "Negro Titanio"
      }
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### `GET /items/summary`

Resumen del inventario agrupado por modelo de producto, con conteo por estado.

**Respuesta exitosa `200`:**
```json
[
  {
    "product": {
      "id": "uuid",
      "model": "iPhone 15 Pro Max",
      "storage": "256GB",
      "color": "Negro Titanio"
    },
    "available": 3,
    "sold": 12,
    "inactive": 1,
    "total": 16
  }
]
```

> Ordenado por mayor cantidad de `available` primero.

---

### `GET /items/search/:term`

Busca un item por IMEI o número de serie. Solo devuelve items `AVAILABLE`.

**Parámetro:** `:term` — IMEI o serial number

**Respuesta exitosa `200`:** Objeto del item con datos del producto.

---

### `GET /items/:id`

Obtiene un item por ID con sus datos de producto.

---

### `PATCH /items/:id`

Actualiza los datos de un item. Soporta reemplazo/adición de fotos.

**Content-Type:** `multipart/form-data`

| Campo | Tipo | Descripción |
|---|---|---|
| `serialNumber` | string | Número de serie |
| `batteryHealth` | number | Salud de batería |
| `condition` | `NEW \| SEMI_NEW` | Condición |
| `costPrice` | number | Precio de costo |
| `salePrice` | number | Precio de venta |
| `notes` | string | Notas |
| `existingImages` | string[] | URLs de fotos anteriores que se quieren conservar |
| `photos` | files | Nuevas fotos a agregar (hasta 5) |

> Las imágenes finales = `existingImages` + nuevas fotos subidas.

---

### `DELETE /items/:id`

Da de baja un item (soft delete). Cambia el estado a `INACTIVE`. Los datos permanecen en la BD.

**Respuesta exitosa `200`:**
```json
{
  "message": "Equipo dado de baja del inventario correctamente."
}
```

---

## Sales

> Requieren `Authorization` + `X-Tenant-ID`.

### `POST /sales`

Crea una venta. Proceso transaccional: valida disponibilidad, crea la venta, cambia los items a `SOLD`.

**Body:**
```json
{
  "customerName": "Carlos Ramos",
  "customerPhone": "70012345",
  "paymentMethod": "CASH",
  "items": [
    {
      "itemId": "uuid-del-item",
      "priceSold": 1100.00
    },
    {
      "itemId": "uuid-del-item-2",
      "priceSold": 950.00
    }
  ]
}
```

> Valores válidos para `paymentMethod`: `CASH`, `TRANSFER`, `QR`, `CARD`  
> `customerName` y `customerPhone` son opcionales (default: "Cliente Mostrador")  
> Se puede vender más de un item en la misma transacción

**Respuesta exitosa `201`:** Venta completa con detalles e items anidados.

---

### `GET /sales/history`

Historial de ventas paginado con filtros.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `page` | number | Página (default: 1) |
| `limit` | number | Por página, máx 100 (default: 20) |
| `status` | `ACTIVE \| CANCELLED` | Filtra por estado |
| `userId` | UUID | Filtra por vendedor |
| `from` | date string | Desde fecha (ej: `2024-01-01`) |
| `to` | date string | Hasta fecha (ej: `2024-12-31`) |

**Respuesta exitosa `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "clientName": "Carlos Ramos",
      "clientPhone": "70012345",
      "paymentMethod": "CASH",
      "totalAmount": "2050.00",
      "status": "ACTIVE",
      "saleDate": "2024-06-15T14:30:00Z",
      "saleDetails": [
        {
          "id": "uuid",
          "priceSold": "1100.00",
          "item": {
            "imei": "123456789012345",
            "product": {
              "model": "iPhone 15 Pro Max",
              "storage": "256GB",
              "color": "Negro Titanio"
            }
          }
        }
      ]
    }
  ],
  "meta": {
    "total": 87,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

### `GET /sales/dashboard-summary`

Métricas del negocio. Solo cuenta ventas con estado `ACTIVE`.

**Respuesta exitosa `200`:**
```json
{
  "totalRevenue": 45800.00,
  "totalSalesCount": 38,
  "totalItemsSold": 52,
  "availableItemsCount": 14,
  "totalCost": 32000.00,
  "grossProfit": 13800.00,
  "profitMarginPercent": 30.13
}
```

| Campo | Descripción |
|---|---|
| `totalRevenue` | Suma de `totalAmount` de ventas activas |
| `totalSalesCount` | Número de transacciones activas |
| `totalItemsSold` | Cantidad de iPhones vendidos en ventas activas |
| `availableItemsCount` | Equipos disponibles en inventario ahora mismo |
| `totalCost` | Suma del `costPrice` de los items vendidos |
| `grossProfit` | `totalRevenue - totalCost` |
| `profitMarginPercent` | `(grossProfit / totalRevenue) * 100` |

---

### `GET /sales/:id`

Obtiene el detalle completo de una venta por ID.

---

### `PATCH /sales/:id/cancel`

Anula una venta. Los items vuelven a estado `AVAILABLE`.

**Sin body.**

**Respuesta exitosa `200`:**
```json
{
  "message": "Venta anulada correctamente. Los equipos asociados vuelven a estar disponibles en el inventario.",
  "saleId": "uuid"
}
```

> No se puede cancelar una venta ya cancelada (devuelve `400`).

---

## Public

> Sin autenticación. Para uso del frontend antes del login.

### `GET /public/tenants/lookup/:slug`

Obtiene el `id` y `name` de una tienda por su slug. Útil para identificar el `tenantId` antes del login.

**Respuesta exitosa `200`:**
```json
{
  "id": "uuid-del-tenant",
  "name": "Tienda Central"
}
```

---

### `GET /public/tenants/:slug/available-items`

Lista los items disponibles de una tienda sin autenticación. Útil para catálogos públicos o vitrinas.

**Respuesta exitosa `200`:** Array de items `AVAILABLE` con datos del producto.

---

## Health

### `GET /health`

Endpoint de salud. Sin autenticación, sin rate limit.

**Respuesta exitosa `200`:**
```json
{
  "status": "ok",
  "timestamp": "2024-06-15T14:30:00.000Z"
}
```

---

## Códigos de error comunes

| Código | Significado |
|---|---|
| `400` | Bad Request — validación del body fallida o lógica de negocio inválida |
| `401` | Unauthorized — token ausente, inválido o expirado |
| `403` | Forbidden — sin permisos, tenant incorrecto, límite de plan alcanzado, o `mustChangePassword` activo |
| `404` | Not Found — recurso no encontrado en la tienda |
| `409` | Conflict — recurso duplicado (IMEI repetido, email ya registrado, slug en uso) |
| `429` | Too Many Requests — rate limit alcanzado (5 intentos/min en login) |
| `500` | Internal Server Error — error inesperado del servidor |

**Formato estándar de error:**
```json
{
  "statusCode": 403,
  "timestamp": "2024-06-15T14:30:00.000Z",
  "path": "/items",
  "message": "Tu plan BASIC permite máximo 20 equipos activos en inventario."
}
```

---

## Enums de referencia

```
UserRole:      ADMIN | SELLER
ItemCondition: NEW | SEMI_NEW
ItemStatus:    AVAILABLE | SOLD | INACTIVE
PaymentMethod: CASH | TRANSFER | QR | CARD
SaleStatus:    ACTIVE | CANCELLED
TenantPlan:    BASIC | PRO | MAX
```
