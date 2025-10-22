// API service for interacting with the Laravel backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001/api';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      const rawBody = await response.text();
      let parsedBody: unknown = null;

      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = rawBody;
        }
      }

      if (!response.ok) {
        const message = extractErrorMessage(parsedBody) ?? `HTTP error! status: ${response.status}`;
        const errors = extractValidationErrors(parsedBody);
        throw new ApiError(message, response.status, errors);
      }

      return parsedBody;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
    tenantName: string,
  ) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        name, 
        email, 
        password, 
        password_confirmation: passwordConfirmation,
        tenant_name: tenantName,
      }),
    });
    if (response.success && response.user) {
      response.user = normaliseUser(response.user as ApiUserPayload);
    }
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.user) {
      response.user = normaliseUser(response.user as ApiUserPayload);
    }
    return response;
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getInvitation(token: string) {
    return this.request(`/auth/invitations/${token}`);
  }

  async completeInvitation(token: string, payload: InvitationCompletionInput) {
    const response = await this.request(`/auth/invitations/${token}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (response.success && response.user) {
      response.user = normaliseUser(response.user as ApiUserPayload);
    }
    return response;
  }

  async getAuthenticatedUser() {
    const response = await this.request('/auth/user');
    if (response.success && response.user) {
      response.user = normaliseUser(response.user as ApiUserPayload);
    }
    return response;
  }

  // User endpoints
  async getUsers() {
    const response = await this.request('/users');
    // Ensure users have roles property
    if (response.success && response.users) {
      response.users = response.users.map((payload: ApiUserPayload) => normaliseUser(payload));
    }
    return response;
  }

  async getUser(id: string) {
    const response = await this.request(`/users/${id}`);
    // Ensure user has roles property
    if (response.success && response.user) {
      response.user = normaliseUser(response.user as ApiUserPayload);
    }
    return response;
  }

  async createUser(userData: UserCreateInput) {
    const response = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    // Ensure user has roles property
    if (response.success && response.user) {
      response.user = normaliseUser(response.user as ApiUserPayload);
    }
    return response;
  }

  async updateUser(id: string, userData: UserUpdateInput) {
    const response = await this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    // Ensure user has roles property
    if (response.success && response.user) {
      response.user = normaliseUser(response.user as ApiUserPayload);
    }
    return response;
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Role endpoints
  async getRoles() {
    return this.request('/roles');
  }

  async getRole(id: string) {
    return this.request(`/roles/${id}`);
  }

  async createRole(roleData: Partial<Role>) {
    return this.request('/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  async updateRole(id: string, roleData: Partial<Role>) {
    return this.request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }

  async deleteRole(id: string) {
    return this.request(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  // Permission endpoints
  async getPermissions() {
    return this.request('/permissions');
  }

  async getPermission(id: string) {
    return this.request(`/permissions/${id}`);
  }

  async createPermission(permissionData: Partial<Permission>) {
    return this.request('/permissions', {
      method: 'POST',
      body: JSON.stringify(permissionData),
    });
  }

  async updatePermission(id: string, permissionData: Partial<Permission>) {
    return this.request(`/permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(permissionData),
    });
  }

  async deletePermission(id: string) {
    return this.request(`/permissions/${id}`, {
      method: 'DELETE',
    });
  }

  // Role-Permission assignment
  async assignPermissionToRole(roleId: string, permissionId: string) {
    return this.request(`/roles/${roleId}/permissions/${permissionId}`, {
      method: 'POST',
    });
  }

  async removePermissionFromRole(roleId: string, permissionId: string) {
    return this.request(`/roles/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  }

  // Tenant endpoints
  async getTenants() {
    const response = await this.request('/tenants');
    if (response.success && Array.isArray(response.tenants)) {
      response.tenants = response.tenants.map((tenant: ApiTenantPayload) => normaliseTenant(tenant));
    }
    return response;
  }

  async createTenant(tenantData: TenantInput) {
    const response = await this.request('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
    if (response.success && response.tenant) {
      response.tenant = normaliseTenant(response.tenant as ApiTenantPayload);
    }
    return response;
  }

  async updateTenant(id: string, tenantData: TenantUpdateInput) {
    const response = await this.request(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
    if (response.success && response.tenant) {
      response.tenant = normaliseTenant(response.tenant as ApiTenantPayload);
    }
    return response;
  }

  async deleteTenant(id: string) {
    return this.request(`/tenants/${id}`, {
      method: 'DELETE',
    });
  }

  // Store endpoints
  async getTenantStores(tenantId: string) {
    const response = await this.request(`/tenants/${tenantId}/stores`);
    if (response.success && Array.isArray(response.stores)) {
      response.stores = response.stores.map((store: ApiStorePayload) => normaliseStore(store));
    }
    return response;
  }

  async createStore(tenantId: string, storeData: StoreInput) {
    const response = await this.request(`/tenants/${tenantId}/stores`, {
      method: 'POST',
      body: JSON.stringify(storeData),
    });
    if (response.success && response.store) {
      response.store = normaliseStore(response.store as ApiStorePayload);
    }
    return response;
  }

  async updateStore(tenantId: string, storeId: string, storeData: StoreInput) {
    const response = await this.request(`/tenants/${tenantId}/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(storeData),
    });
    if (response.success && response.store) {
      response.store = normaliseStore(response.store as ApiStorePayload);
    }
    return response;
  }

  async deleteStore(tenantId: string, storeId: string) {
    return this.request(`/tenants/${tenantId}/stores/${storeId}`, {
      method: 'DELETE',
    });
  }

  // Shift store endpoints
  async getTenantShiftStores(tenantId: string) {
    const response = await this.request(`/tenants/${tenantId}/shift-stores`);
    if (response.success && Array.isArray(response.shift_stores)) {
      response.shift_stores = response.shift_stores.map((shift: ApiShiftStorePayload) => normaliseShiftStore(shift));
    }
    return response;
  }

  async createShiftStore(tenantId: string, shiftData: ShiftStoreInput) {
    const response = await this.request(`/tenants/${tenantId}/shift-stores`, {
      method: 'POST',
      body: JSON.stringify(shiftData),
    });
    if (response.success && response.shift_store) {
      response.shift_store = normaliseShiftStore(response.shift_store as ApiShiftStorePayload);
    }
    return response;
  }

  async updateShiftStore(tenantId: string, shiftStoreId: string, shiftData: ShiftStoreInput) {
    const response = await this.request(`/tenants/${tenantId}/shift-stores/${shiftStoreId}`, {
      method: 'PUT',
      body: JSON.stringify(shiftData),
    });
    if (response.success && response.shift_store) {
      response.shift_store = normaliseShiftStore(response.shift_store as ApiShiftStorePayload);
    }
    return response;
  }

  async deleteShiftStore(tenantId: string, shiftStoreId: string) {
    return this.request(`/tenants/${tenantId}/shift-stores/${shiftStoreId}`, {
      method: 'DELETE',
    });
  }

  // Attendance endpoints
  async getAttendances(params?: AttendanceListParams) {
    const queryParams = new URLSearchParams();
    if (params?.store_id) queryParams.append('store_id', params.store_id);
    if (params?.shift_store_id) queryParams.append('shift_store_id', params.shift_store_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    
    const endpoint = `/attendance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request(endpoint);
    
    // Laravel resource collection returns data in 'data' field
    if (response && Array.isArray(response.data)) {
      response.data = response.data.map((attendance: ApiAttendancePayload) => normaliseAttendance(attendance));
    }
    return response;
  }

  async createAttendance(attendanceData: AttendanceCreateInput) {
    if (!attendanceData.shift_store_id) {
      throw new ApiError('Shift harus dipilih sebelum melakukan check-in.', 422);
    }

    if (!attendanceData.image_in) {
      throw new ApiError('Foto check-in wajib diisi (gunakan URL atau base64).', 422);
    }

    if (attendanceData.latitude_in === undefined || attendanceData.latitude_in === null || attendanceData.longitude_in === undefined || attendanceData.longitude_in === null) {
      throw new ApiError('Koordinat check-in wajib diisi.', 422);
    }

    const payload = {
      store_id: attendanceData.store_id,
      shift_store_id: attendanceData.shift_store_id,
      image_in: attendanceData.image_in,
      check_in: attendanceData.check_in,
      latitude_in: attendanceData.latitude_in,
      longitude_in: attendanceData.longitude_in,
    };

    const response = await this.request('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (response.success && response.attendance) {
      response.attendance = normaliseAttendance(response.attendance as ApiAttendancePayload);
    }
    return response;
  }

  async updateAttendanceStatus(attendanceId: string, status: AttendanceStatus) {
    return this.request(`/attendance/${attendanceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

const apiService = new ApiService();

export default apiService;

// Data models
export interface Role {
  id: string;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  name: string;
}

export interface TenantOwner {
  id: string;
  name: string;
  email: string;
}

export interface Store {
  id: string;
  tenant_id: string;
  name: string;
  nickname: string | null;
  no_telp: string | null;
  email: string | null;
  status: string | null;
  radius: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftStore {
  id: string;
  tenant_id: string;
  name: string;
  shift_start_time: string;
  shift_end_time: string;
  duration: number;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  users_count?: number;
  owner?: TenantOwner;
  stores?: Store[];
  shiftStores?: ShiftStore[];
}

export type TenantMembershipRole = 'owner' | 'admin' | 'member';

export interface UserTenantMembership {
  tenant: Tenant;
  role: TenantMembershipRole;
  assignedBy: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  roles: UserRole[];
  tenant?: Tenant;
  tenants: Tenant[];
  memberships: UserTenantMembership[];
}

export interface TenantInput {
  name: string;
  owner_id: string;
}

export interface TenantUpdateInput {
  name?: string;
  owner_id?: string;
}

export interface StoreInput {
  name: string;
  nickname?: string | null;
  no_telp?: string | null;
  email?: string | null;
  status?: string | null;
  radius?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ShiftStoreInput {
  name: string;
  shift_start_time: string;
  shift_end_time: string;
  duration?: number | null;
}

export interface UserCreateInput {
  name?: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  tenant_id?: string;
  roles?: string[];
  role?: TenantMembershipRole;
  user_id?: string;
  manager_id?: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  tenant_id?: string;
  roles?: string[];
  membership_role?: TenantMembershipRole;
  manager_id?: string | null;
}

export interface InvitationDetails {
  email: string;
  tenant_names: string[];
}

export interface InvitationCompletionInput {
  name: string;
  password: string;
  password_confirmation: string;
}

// Attendance types
export type AttendanceStatus = 'pending' | 'approved' | 'rejected';

export interface Attendance {
  id: string;
  store_id: string;
  shift_store_id: string | null;
  status: AttendanceStatus;
  was_late?: boolean;
  image_in: string | null;
  check_in: string | null;
  latitude_in?: number | null;
  longitude_in?: number | null;
  location_in?: AttendanceLocation | null;
  image_out: string | null;
  check_out: string | null;
  latitude_out?: number | null;
  longitude_out?: number | null;
  location_out?: AttendanceLocation | null;
  auto_checked_out_at?: string | null;
  created_by_id: string;
  approved_by_id: string | null;
  created_at: string;
  updated_at: string;
  store?: Store;
  shiftStore?: ShiftStore;
  creator?: User;
  approver?: User;
}

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
}

export interface AttendanceListParams {
  store_id?: string;
  shift_store_id?: string;
  status?: AttendanceStatus;
  per_page?: number;
}

export interface AttendanceCreateInput {
  store_id: string;
  shift_store_id?: string | null;
  image_in?: string | null;
  check_in?: string | null;
  latitude_in?: number | null;
  longitude_in?: number | null;
  image_out?: string | null;
  check_out?: string | null;
  latitude_out?: number | null;
  longitude_out?: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractErrorMessage(body: unknown): string | null {
  if (isRecord(body) && typeof body.message === 'string') {
    return body.message;
  }

  if (typeof body === 'string' && body.trim() !== '') {
    return body;
  }

  return null;
}

function isRecordOfStringArray(value: unknown): value is Record<string, string[]> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'string'),
  );
}

function extractValidationErrors(body: unknown): Record<string, string[]> | undefined {
  if (!isRecord(body) || !('errors' in body)) {
    return undefined;
  }

  const potentialErrors = (body as Record<string, unknown>).errors;
  return isRecordOfStringArray(potentialErrors) ? potentialErrors : undefined;
}

interface ApiPermissionPayload {
  id: string;
  name: string;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiRolePayload {
  id: string;
  name: string;
  guard_name?: string;
  created_at?: string;
  updated_at?: string;
  permissions?: ApiPermissionPayload[] | null;
}

interface ApiStorePayload {
  id: string;
  tenant_id: string;
  name: string;
  nickname?: string | null;
  no_telp?: string | null;
  email?: string | null;
  status?: string | null;
  radius?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  created_at?: string;
  updated_at?: string;
}

interface ApiShiftStorePayload {
  id: string;
  tenant_id: string;
  name: string;
  shift_start_time: string;
  shift_end_time: string;
  duration: number;
  created_at?: string;
  updated_at?: string;
}

interface ApiTenantOwnerPayload {
  id: string;
  name: string;
  email: string;
}

interface ApiTenantPivotPayload {
  role?: TenantMembershipRole | null;
  assigned_by?: string | null;
}

interface ApiTenantPayload {
  id: string;
  name: string;
  users_count?: number;
  owner?: ApiTenantOwnerPayload | null;
  stores?: ApiStorePayload[] | null;
  shift_stores?: ApiShiftStorePayload[] | null;
  pivot?: ApiTenantPivotPayload | null;
}

interface ApiUserPayload {
  id: string;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
  roles?: ApiRolePayload[] | null;
  tenant?: ApiTenantPayload | null;
  tenants?: ApiTenantPayload[] | null;
}

interface ApiAttendancePayload {
  id: string;
  store_id: string;
  shift_store_id?: string | null;
  status: AttendanceStatus;
  was_late?: boolean;
  image_in?: string | null;
  check_in?: string | null;
  latitude_in?: number | null;
  longitude_in?: number | null;
  location_in?: { latitude: number; longitude: number } | null;
  image_out?: string | null;
  check_out?: string | null;
  latitude_out?: number | null;
  longitude_out?: number | null;
  location_out?: { latitude: number; longitude: number } | null;
  auto_checked_out_at?: string | null;
  created_by_id: string;
  approved_by_id?: string | null;
  created_at: string;
  updated_at: string;
  store?: ApiStorePayload | null;
  shift_store?: ApiShiftStorePayload | null;
  creator?: ApiUserPayload | null;
  approver?: ApiUserPayload | null;
}

function normaliseStore(store: ApiStorePayload): Store {
  const normaliseCoordinate = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  return {
    id: store.id,
    tenant_id: store.tenant_id,
    name: store.name,
    nickname: store.nickname ?? null,
    no_telp: store.no_telp ?? null,
    email: store.email ?? null,
    status: store.status ?? null,
    radius: normaliseCoordinate(store.radius),
    latitude: normaliseCoordinate(store.latitude),
    longitude: normaliseCoordinate(store.longitude),
    created_at: store.created_at,
    updated_at: store.updated_at,
  };
}

function normaliseShiftStore(shiftStore: ApiShiftStorePayload): ShiftStore {
  const formatTime = (value: string): string => {
    if (!value) {
      return value;
    }

    const [time] = value.split(' ');
    const [hours, minutes] = time.split(':');
    return `${hours ?? '00'}:${minutes ?? '00'}`;
  };

  return {
    id: shiftStore.id,
    tenant_id: shiftStore.tenant_id,
    name: shiftStore.name,
    shift_start_time: formatTime(shiftStore.shift_start_time),
    shift_end_time: formatTime(shiftStore.shift_end_time),
    duration: Number(shiftStore.duration) || 0,
    created_at: shiftStore.created_at,
    updated_at: shiftStore.updated_at,
  };
}

function normaliseTenant(tenant: ApiTenantPayload): Tenant {
  return {
    id: tenant.id,
    name: tenant.name,
    users_count: tenant.users_count,
    owner: tenant.owner
      ? {
          id: tenant.owner.id,
          name: tenant.owner.name,
          email: tenant.owner.email,
        }
      : undefined,
    stores: Array.isArray(tenant.stores)
      ? tenant.stores.map((store) => normaliseStore(store))
      : undefined,
    shiftStores: Array.isArray(tenant.shift_stores)
      ? tenant.shift_stores.map((shiftStore) => normaliseShiftStore(shiftStore))
      : undefined,
  };
}

function normaliseUser(user: ApiUserPayload): User {
  const memberships: UserTenantMembership[] = Array.isArray(user.tenants)
    ? user.tenants.map((rawTenant) => {
        const normalisedTenant = normaliseTenant(rawTenant);
        return {
          tenant: normalisedTenant,
          role: rawTenant.pivot?.role ?? 'member',
          assignedBy: rawTenant.pivot?.assigned_by ?? null,
        };
      })
    : [];

  const preferredTenantRoles: TenantMembershipRole[] = ['owner', 'admin', 'member'];

  const directTenant = user.tenant ? normaliseTenant(user.tenant) : undefined;

  const fallbackTenant = directTenant
    ?? preferredTenantRoles
      .map((role) => memberships.find((membership) => membership.role === role))
      .find((membership) => membership !== undefined)?.tenant
    ?? memberships[0]?.tenant;

  const tenantList = memberships.map((membership) => membership.tenant);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified_at: user.email_verified_at ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at,
    roles: Array.isArray(user.roles)
      ? user.roles.map((role) => ({
          id: role.id,
          name: role.name,
        }))
      : [],
    tenant: fallbackTenant,
    tenants: tenantList,
    memberships,
  };
}

function normaliseAttendance(attendance: ApiAttendancePayload): Attendance {
  const normaliseCoordinate = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const resolveLocation = (
    location: { latitude: number; longitude: number } | null | undefined,
    fallbackLat: number | null | undefined,
    fallbackLng: number | null | undefined,
  ): AttendanceLocation | null => {
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }

    const lat = normaliseCoordinate(fallbackLat);
    const lng = normaliseCoordinate(fallbackLng);

    if (lat === null || lng === null) {
      return null;
    }

    return { latitude: lat, longitude: lng };
  };

  return {
    id: attendance.id,
    store_id: attendance.store_id,
    shift_store_id: attendance.shift_store_id ?? null,
    status: attendance.status,
    was_late: Boolean(attendance.was_late),
    image_in: attendance.image_in ?? null,
    check_in: attendance.check_in ?? null,
    latitude_in: normaliseCoordinate(attendance.latitude_in),
    longitude_in: normaliseCoordinate(attendance.longitude_in),
    location_in: resolveLocation(attendance.location_in, attendance.latitude_in, attendance.longitude_in),
    image_out: attendance.image_out ?? null,
    check_out: attendance.check_out ?? null,
    latitude_out: normaliseCoordinate(attendance.latitude_out),
    longitude_out: normaliseCoordinate(attendance.longitude_out),
    location_out: resolveLocation(attendance.location_out, attendance.latitude_out, attendance.longitude_out),
    auto_checked_out_at: attendance.auto_checked_out_at ?? null,
    created_by_id: attendance.created_by_id,
    approved_by_id: attendance.approved_by_id ?? null,
    created_at: attendance.created_at,
    updated_at: attendance.updated_at,
    store: attendance.store ? normaliseStore(attendance.store) : undefined,
    shiftStore: attendance.shift_store ? normaliseShiftStore(attendance.shift_store) : undefined,
    creator: attendance.creator ? normaliseUser(attendance.creator) : undefined,
    approver: attendance.approver ? normaliseUser(attendance.approver) : undefined,
  };
}
