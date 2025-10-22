# Admin Panel with Spatie Permissions

This is a Next.js admin panel that integrates with a Laravel backend using Spatie Permissions for role-based access control (RBAC).

## Features

- User authentication with Laravel Sanctum
- User management (CRUD operations)
- Role management (CRUD operations)
- Permission management (CRUD operations)
- Role-based access control
- Responsive design with Tailwind CSS
- Protected routes based on user roles

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Library**: Tailwind CSS
- **State Management**: React Context API
- **HTTP Client**: Fetch API
- **Authentication**: Laravel Sanctum with Bearer Tokens

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example` and configure your API base URL:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   └── login/page.tsx
│   ├── components/
│   │   ├── AdminLayout.tsx
│   │   ├── Header.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── Sidebar.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── PermissionContext.tsx
│   │   ├── RoleContext.tsx
│   │   └── UserContext.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── permissions/
│   │   ├── PermissionForm.tsx
│   │   ├── PermissionList.tsx
│   │   └── page.tsx
│   ├── roles/
│   │   ├── RoleForm.tsx
│   │   ├── RoleList.tsx
│   │   └── page.tsx
│   ├── services/
│   │   └── api.ts
│   └── users/
│       ├── UserForm.tsx
│       ├── UserList.tsx
│       └── page.tsx
├── app/layout.tsx
└── app/page.tsx
```

## Role-Based Access Control

- **Admin users** can access:
  - Dashboard
  - User management
  - Presence management (future)
  - Point of Sales (future)

- **Super Admin users** can access:
  - All admin features
  - Role management
  - Permission management

## API Integration

The frontend communicates with the Laravel backend through RESTful API endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get authenticated user

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get specific user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Role Management
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create role
- `GET /api/roles/{id}` - Get specific role
- `PUT /api/roles/{id}` - Update role
- `DELETE /api/roles/{id}` - Delete role

### Permission Management
- `GET /api/permissions` - Get all permissions
- `POST /api/permissions` - Create permission
- `GET /api/permissions/{id}` - Get specific permission
- `PUT /api/permissions/{id}` - Update permission
- `DELETE /api/permissions/{id}` - Delete permission
- `POST /api/roles/{roleId}/permissions/{permissionId}` - Assign permission to role
- `DELETE /api/roles/{roleId}/permissions/{permissionId}` - Remove permission from role

## Deployment

The application can be deployed to Vercel with minimal configuration. Ensure environment variables are set in the Vercel dashboard.

## Future Enhancements

- Presence management module
- Point of Sales module
- Advanced filtering and sorting
- User activity logs
- Role-permission assignment UI
- Dark mode toggle