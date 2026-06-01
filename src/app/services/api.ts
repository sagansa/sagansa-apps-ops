// API service for interacting with the Laravel backend
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');

const getApiBaseUrl = () => {
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'ops.sagansa.id') {
      return 'https://api-ops.sagansa.id/api';
    }

    return '/api';
  }

  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

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

    const isFormData = options.body instanceof FormData;
    const token = this.token || (typeof window !== 'undefined' ? localStorage.getItem('authToken') : null);

    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    (headers as Record<string, string>)['Accept'] = 'application/json';

    if (!isFormData && !(headers as Record<string, string>)['Content-Type']) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    // Add Active Tenant header if available
    if (typeof window !== 'undefined') {
      const activeTenantId = localStorage.getItem('activeTenantId') || localStorage.getItem('active_tenant_id');
      if (activeTenantId) {
        (headers as Record<string, string>)['X-Active-Tenant'] = activeTenantId;
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
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

  private normaliseApiResponse<P, T>(response: unknown, normaliser: (payload: P) => T, key: string) {
    if (isRecord(response) && response.success && key in response) {
      const data = (response as Record<string, unknown>)[key];
      if (Array.isArray(data)) {
        (response as Record<string, unknown>)[key] = (data as unknown[]).map((item) => normaliser(item as P));
      } else if (data !== undefined && data !== null) {
        (response as Record<string, unknown>)[key] = normaliser(data as P);
      }
    }
    return response;
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
    return this.normaliseApiResponse(response, normaliseUser, 'user');
  }

  async login(email: string, password: string) {
    // Use raw fetch to handle 409 (tenant setup required) specially
    const url = `${API_BASE_URL}/auth/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const rawBody = await response.text();
    let parsedBody: any = null;
    if (rawBody) {
      try { parsedBody = JSON.parse(rawBody); } catch { parsedBody = rawBody; }
    }

    if (!response.ok) {
      // Handle tenant setup required (409) - return special response instead of throwing
      if (response.status === 409 && parsedBody?.requires_tenant_setup) {
        return { success: false, requires_tenant_setup: true, token: parsedBody.token, message: parsedBody.message };
      }
      const message = extractErrorMessage(parsedBody) ?? `HTTP error! status: ${response.status}`;
      const errors = extractValidationErrors(parsedBody);
      throw new ApiError(message, response.status, errors);
    }

    return this.normaliseApiResponse(parsedBody, normaliseUser, 'user');
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async switchTenant(tenantId: string) {
    return this.request('/auth/switch-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId }),
    });
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, email: string, password: string, passwordConfirmation: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, email, password, password_confirmation: passwordConfirmation }),
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
    return this.normaliseApiResponse(response, normaliseUser, 'user');
  }

  async getAuthenticatedUser() {
    const response = await this.request('/auth/user');
    return this.normaliseApiResponse(response, normaliseUser, 'user');
  }

  // User endpoints
  async getUsers() {
    const response = await this.request('/users');
    // Ensure users have roles property
    return this.normaliseApiResponse(response, normaliseUser, 'users');
  }

  async getUser(id: string) {
    const response = await this.request(`/users/${id}`);
    // Ensure user has roles property
    return this.normaliseApiResponse(response, normaliseUser, 'user');
  }

  async createUser(userData: UserCreateInput) {
    const response = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return this.normaliseApiResponse(response, normaliseUser, 'user');
  }

  async updateUser(id: string, userData: UserUpdateInput) {
    const response = await this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return this.normaliseApiResponse(response, normaliseUser, 'user');
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async toggleUserStatus(id: string) {
    const response = await this.request(`/users/${id}/toggle-status`, {
      method: 'PATCH',
    });
    return this.normaliseApiResponse(response, normaliseUser, 'user');
  }

  // Role endpoints
  async getRoles() {
    return this.request('/roles');
  }

  async getRole(id: string) {
    return this.request(`/roles/${id}`);
  }

  async createRole(roleData: RoleCreateInput) {
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
  async syncRolePermissions(roleId: string, permissions: string[]) {
    return this.request(`/roles/${roleId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  }

  // Tenant endpoints
  async getTenants() {
    const response = await this.request('/tenants');
    if (isRecord(response) && response.success && Array.isArray(response.tenants)) {
      response.tenants = response.tenants.map((tenant) => normaliseTenant(tenant as ApiTenantPayload));
    }
    return response;
  }

  async getAccessibleTenants() {
    return this.request('/tenants/accessible');
  }

  async createTenant(tenantData: TenantInput) {
    const response = await this.request('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
    if (isRecord(response) && response.success && 'tenant' in response && response.tenant) {
      response.tenant = normaliseTenant(response.tenant as ApiTenantPayload);
    }
    return response;
  }

  async updateTenant(id: string, tenantData: TenantUpdateInput) {
    const response = await this.request(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
    if (isRecord(response) && response.success && 'tenant' in response && response.tenant) {
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
    if (isRecord(response) && response.success && Array.isArray(response.stores)) {
      response.stores = response.stores.map((store) => normaliseStore(store as ApiStorePayload));
    }
    return response;
  }

  async getStores() {
    const response = await this.request('/stores');
    const r = response as { stores?: any[] };
    if (Array.isArray(r.stores)) {
      return r.stores.map((store) => normaliseStore(store));
    }
    return [];
  }

  async getStore(id: string) {
    const response = await this.request(`/stores/${id}`);
    return this.normaliseApiResponse(response, normaliseStore, 'store');
  }

  // Product endpoints
  async getProducts(params?: { includeInactive?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.includeInactive) {
      searchParams.set('include_inactive', '1');
    }

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await this.request(`/products${query}`);
    type ProductsField = ApiProductPayload[] | { data: ApiProductPayload[] } | undefined;
    const productsField = (response as { products?: ProductsField }).products;
    let rawProducts: ApiProductPayload[] = [];
    if (Array.isArray(productsField)) {
      rawProducts = productsField;
    } else if (productsField && 'data' in productsField && Array.isArray(productsField.data)) {
      rawProducts = productsField.data;
    }

    return rawProducts.map((product) => normaliseProduct(product));
  }

  async getProduct(productId: string) {
    const response = await this.request(`/products/${productId}`);
    const r = response as { product?: ApiProductPayload };
    if (r.product) {
      return normaliseProduct(r.product);
    }
    throw new Error('Product not found');
  }

  async createProduct(input: ProductInput) {
    const formData = buildProductFormData(input);
    const response = await this.request('/products', {
      method: 'POST',
      body: formData,
    });

    if (isRecord(response) && 'product' in response && response.product) {
      (response as Record<string, unknown>).product = normaliseProduct(response.product as ApiProductPayload);
    }

    return response;
  }

  async updateProduct(productId: string, input: ProductInput) {
    if (input.imageFile instanceof File) {
      const formData = buildProductFormData(input);
      formData.append('_method', 'PUT');
      const response = await this.request(`/products/${productId}`, {
        method: 'POST',
        body: formData,
      });

      if (isRecord(response) && 'product' in response && response.product) {
        (response as Record<string, unknown>).product = normaliseProduct(response.product as ApiProductPayload);
      }

      return response;
    }

    const payload = buildProductJsonPayload(input);
    const response = await this.request(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (isRecord(response) && 'product' in response && response.product) {
      (response as Record<string, unknown>).product = normaliseProduct(response.product as ApiProductPayload);
    }

    return response;
  }

  async deleteProduct(productId: string) {
    return this.request(`/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async createStore(tenantId: string, storeData: StoreInput) {
    const response = await this.request(`/tenants/${tenantId}/stores`, {
      method: 'POST',
      body: JSON.stringify(storeData),
    });
    if (isRecord(response) && response.success && 'store' in response && response.store) {
      response.store = normaliseStore(response.store as ApiStorePayload);
    }
    return response;
  }

  async updateStore(tenantId: string, storeId: string, storeData: StoreInput) {
    const response = await this.request(`/tenants/${tenantId}/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(storeData),
    });
    if (isRecord(response) && response.success && 'store' in response && response.store) {
      response.store = normaliseStore(response.store as ApiStorePayload);
    }
    return response;
  }

  async deleteStore(tenantId: string, storeId: string) {
    return this.request(`/tenants/${tenantId}/stores/${storeId}`, {
      method: 'DELETE',
    });
  }

  // Category endpoints
  async getCategories(token?: string | null) {
    const authToken = token || this.token;
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await this.request('/categories', {
      headers,
    });
    const r = response as { success?: boolean; categories?: Array<{ id: string; name: string; tenant_id?: string; created_at: string; updated_at: string }> };
    if (r.success && Array.isArray(r.categories)) {
      return r.categories;
    }
    return [];
  }

  async createCategory(token: string, data: { name: string }) {
    const response = await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const r = response as { success?: boolean; category?: { id: string; name: string; tenant_id?: string; created_at: string; updated_at: string } };
    if (r.success && r.category) {
      return r.category;
    }
    throw new Error('Failed to create category');
  }

  async updateCategory(token: string, id: string, data: { name: string }) {
    const response = await this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const r = response as { success?: boolean; category?: { id: string; name: string; tenant_id?: string; created_at: string; updated_at: string } };
    if (r.success && r.category) {
      return r.category;
    }
    throw new Error('Failed to update category');
  }

  async deleteCategory(token: string, id: string) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Shift store endpoints
  async getTenantShiftStores(tenantId: string) {
    const response = await this.request(`/tenants/${tenantId}/shift-stores`);
    if (isRecord(response) && response.success) {
      const stores = (response as Record<string, unknown>).shift_stores || (response as Record<string, unknown>).shiftStores || (response as Record<string, unknown>).data;
      if (Array.isArray(stores)) {
        const normalised = (stores as unknown[]).map((shift) => normaliseShiftStore(shift as ApiShiftStorePayload));
        (response as Record<string, unknown>).shift_stores = normalised;
        (response as Record<string, unknown>).shiftStores = normalised;
      }
    }
    return response;
  }

  async createShiftStore(tenantId: string, shiftData: ShiftStoreInput) {
    const response = await this.request(`/tenants/${tenantId}/shift-stores`, {
      method: 'POST',
      body: JSON.stringify(shiftData),
    });

    // Handle berbagai format response dari backend
    if (isRecord(response) && response.success) {
      const shiftStore = (response as Record<string, unknown>).shift_store || (response as Record<string, unknown>).shiftStore || (response as Record<string, unknown>).data;
      if (shiftStore) {
        const normalisedShiftStore = normaliseShiftStore(shiftStore as ApiShiftStorePayload);
        (response as Record<string, unknown>).shift_store = normalisedShiftStore;
        (response as Record<string, unknown>).shiftStore = normalisedShiftStore;
      }
    }

    return response;
  }

  async updateShiftStore(tenantId: string, shiftStoreId: string, shiftData: ShiftStoreInput) {
    const response = await this.request(`/tenants/${tenantId}/shift-stores/${shiftStoreId}`, {
      method: 'PUT',
      body: JSON.stringify(shiftData),
    });
    if (isRecord(response) && response.success) {
      const store = (response as Record<string, unknown>).shift_store || (response as Record<string, unknown>).shiftStore || (response as Record<string, unknown>).data;
      if (store) {
        const normalised = normaliseShiftStore(store as ApiShiftStorePayload);
        (response as Record<string, unknown>).shift_store = normalised;
        (response as Record<string, unknown>).shiftStore = normalised;
      }
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
    if (isRecord(response) && Array.isArray(response.data)) {
      response.data = response.data.map((attendance) => normaliseAttendancePayload(attendance as ApiAttendancePayload));
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
    if (isRecord(response) && response.success && 'attendance' in response && response.attendance) {
      response.attendance = normaliseAttendancePayload(response.attendance as ApiAttendancePayload);
    }
    return response;
  }

  async updateAttendanceStatus(attendanceId: string, status: AttendanceStatus) {
    return this.request(`/attendance/${attendanceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Presence endpoints (for mobile API)
  async getPresenceList(params?: AttendanceListParams) {
    const queryParams = new URLSearchParams();
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const endpoint = `/presence${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request(endpoint);

    if (isRecord(response) && response.data && Array.isArray(response.data.data)) {
      return {
        ...response,
        data: {
          ...response.data,
          data: response.data.data.map((attendance: ApiAttendancePayload) => normaliseAttendancePayload(attendance))
        }
      };
    }
    return response;
  }

  async getActivePresence() {
    const response = await this.request('/presence/active');
    if (isRecord(response) && response.data) {
      return {
        ...response,
        data: normaliseAttendancePayload(response.data)
      };
    }
    return response;
  }

  async checkInPresence(data: {
    store_id: string;
    shift_store_id: string;
    selfie_photo: File;
    latitude: number;
    longitude: number;
    gps_accuracy?: number;
    device_info?: string;
  }) {
    const formData = new FormData();
    formData.append('store_id', data.store_id);
    formData.append('shift_store_id', data.shift_store_id);
    formData.append('selfie_photo', data.selfie_photo); // This will be stored in image_in field
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());

    if (data.gps_accuracy) formData.append('gps_accuracy', data.gps_accuracy.toString());
    if (data.device_info) formData.append('device_info', data.device_info);

    const response = await this.request('/presence/check-in', {
      method: 'POST',
      body: formData,
    });

    if (isRecord(response) && response.data && response.data.attendance) {
      return {
        ...response,
        data: {
          ...response.data,
          attendance: normaliseAttendancePayload(response.data.attendance)
        }
      };
    }
    return response;
  }

  async checkOutPresence(data: {
    attendance_id: string;
    store_id: string;
    selfie_photo: File;
    latitude: number;
    longitude: number;
    gps_accuracy?: number;
    device_info?: string;
  }) {
    const formData = new FormData();
    formData.append('attendance_id', data.attendance_id);
    formData.append('store_id', data.store_id);
    formData.append('selfie_photo', data.selfie_photo); // This will be stored in image_out field
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());

    if (data.gps_accuracy) formData.append('gps_accuracy', data.gps_accuracy.toString());
    if (data.device_info) formData.append('device_info', data.device_info);

    const response = await this.request('/presence/check-out', {
      method: 'POST',
      body: formData,
    });

    if (isRecord(response) && response.data && response.data.attendance) {
      return {
        ...response,
        data: {
          ...response.data,
          attendance: normaliseAttendancePayload(response.data.attendance)
        }
      };
    }
    return response;
  }

  async getLeaves(params?: LeaveListParams) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.type) queryParams.append('type', params.type);
    const endpoint = `/leaves${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request(endpoint);
    return this.normaliseApiResponse(response, normaliseLeave, 'leaves');
  }

  async createLeave(payload: LeaveCreateInput) {
    const response = await this.request('/leaves', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return this.normaliseApiResponse(response, normaliseLeave, 'leave');
  }

  async updateLeave(id: string, payload: LeaveUpdateInput) {
    const response = await this.request(`/leaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return this.normaliseApiResponse<ApiLeavePayload, Leave>(response, normaliseLeave, 'leave');
  }

  async deleteLeave(id: string) {
    const response = await this.request(`/leaves/${id}`, {
      method: 'DELETE',
    });
    return this.normaliseApiResponse<ApiLeavePayload, Leave>(response, normaliseLeave, 'leave');
  }

  async updateLeaveStatus(id: string, status: LeaveStatus, review_notes?: string) {
    const response = await this.request(`/leaves/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, review_notes }),
    });
    return this.normaliseApiResponse<ApiLeavePayload, Leave>(response, normaliseLeave, 'leave');
  }

  // Payment Method endpoints
  async getPaymentMethods(storeId: string) {
    const response = await this.request(`/payment-methods?store_id=${storeId}`);
    if (isRecord(response) && Array.isArray((response as any).data)) {
      return (response as any).data;
    }
    return [];
  }

  async createPaymentMethod(data: any) {
    // Check if there's a file to upload (QRIS image)
    if (data.details?.qr_image_file) {
      const formData = new FormData();
      formData.append('store_id', data.store_id);
      formData.append('type', data.type);
      formData.append('name', data.name);
      formData.append('is_active', data.is_active ? '1' : '0');
      formData.append('require_proof', data.require_proof ? '1' : '0');

      appendPaymentMethodDetails(formData, data.details);

      if (!data.details.qris_payload) {
        formData.append('qr_image', data.details.qr_image_file);
      }

      const response = await this.request('/payment-methods', {
        method: 'POST',
        body: formData,
      });

      if (isRecord(response) && (response as any).data) {
        return (response as any).data;
      }
      return response;
    }

    // Regular JSON submission for non-file data
    const response = await this.request('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (isRecord(response) && (response as any).data) {
      return (response as any).data;
    }
    return response;
  }

  async updatePaymentMethod(id: string, data: any) {
    // Check if there's a file to upload (QRIS image)
    if (data.details?.qr_image_file) {
      const formData = new FormData();

      // Add regular fields if present
      if (data.store_id) formData.append('store_id', data.store_id);
      if (data.type) formData.append('type', data.type);
      if (data.name) formData.append('name', data.name);
      if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
      if (data.require_proof !== undefined) formData.append('require_proof', data.require_proof ? '1' : '0');

      appendPaymentMethodDetails(formData, data.details);

      if (!data.details.qris_payload) {
        formData.append('qr_image', data.details.qr_image_file);
      }
      formData.append('_method', 'PUT');

      const response = await this.request(`/payment-methods/${id}`, {
        method: 'POST', // Laravel uses POST with _method for file uploads
        body: formData,
      });

      if (isRecord(response) && (response as any).data) {
        return (response as any).data;
      }
      return response;
    }

    // Regular JSON submission for non-file data
    const response = await this.request(`/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (isRecord(response) && (response as any).data) {
      return (response as any).data;
    }
    return response;
  }

  async deletePaymentMethod(id: string) {
    return this.request(`/payment-methods/${id}`, {
      method: 'DELETE',
    });
  }

  // Table endpoints
  async getTables(storeId: string) {
    const response = await this.request(`/tables?store_id=${storeId}`);
    if (isRecord(response) && response.success && Array.isArray((response as any).data)) {
      return (response as any).data;
    }
    return [];
  }

  async createTable(data: any) {
    const response = await this.request('/tables', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (isRecord(response) && response.success && (response as any).data) {
      return (response as any).data;
    }
    return response;
  }

  async updateTable(id: string, data: any) {
    const response = await this.request(`/tables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (isRecord(response) && response.success && (response as any).data) {
      return (response as any).data;
    }
    return response;
  }

  async deleteTable(id: string) {
    return this.request(`/tables/${id}`, {
      method: 'DELETE',
    });
  }

  // Customer Type endpoints
  async getCustomerTypes(storeId: string) {
    const response = await this.request(`/customer-types?store_id=${storeId}`);
    if (isRecord(response) && response.success && Array.isArray((response as any).data)) {
      return (response as any).data;
    }
    return [];
  }

  async createCustomerType(data: any) {
    const response = await this.request('/customer-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (isRecord(response) && response.success && (response as any).data) {
      return (response as any).data;
    }
    return response;
  }

  async updateCustomerType(id: string, data: any) {
    const response = await this.request(`/customer-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (isRecord(response) && response.success && (response as any).data) {
      return (response as any).data;
    }
    return response;
  }

  async deleteCustomerType(id: string) {
    return this.request(`/customer-types/${id}`, {
      method: 'DELETE',
    });
  }

  // Permission Management Methods
  async getAllPermissionsGrouped(): Promise<{ permissions: PermissionModule[] }> {
    return this.request('/permissions/grouped') as Promise<{ permissions: PermissionModule[] }>;
  }

  async getAvailableRoles(): Promise<{ roles: { name: string; label: string; permissions_count: number }[] }> {
    return this.request('/roles') as Promise<{ roles: { name: string; label: string; permissions_count: number }[] }>;
  }

  async getTenantUsers(tenantId: string): Promise<{ tenant: { id: string; name: string }; users: TenantUser[] }> {
    return this.request(`/tenants/${tenantId}/users`, {
      headers: { 'X-Tenant-ID': tenantId }
    }) as Promise<{ tenant: { id: string; name: string }; users: TenantUser[] }>;
  }

  async searchTenantUsers(tenantId: string, search: string) {
    return this.request(`/tenants/${tenantId}/users/search?search=${encodeURIComponent(search)}`, {
      headers: { 'X-Tenant-ID': tenantId }
    });
  }

  async assignPermissionsToUser(tenantId: string, userId: string, permissions: string[]): Promise<void> {
    await this.request(`/tenants/${tenantId}/users/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
      headers: { 'X-Tenant-ID': tenantId }
    });
  }

  async updateUserRole(tenantId: string, userId: string, role: string): Promise<void> {
    await this.request(`/tenants/${tenantId}/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
      headers: { 'X-Tenant-ID': tenantId }
    });
  }

  async addUserToTenant(tenantId: string, userId: string, role: string): Promise<void> {
    await this.request(`/tenants/${tenantId}/users`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
      headers: { 'X-Tenant-ID': tenantId }
    });
  }

  async inviteUserToTenant(tenantId: string, email: string, role: string): Promise<any> {
    return this.request(`/tenants/${tenantId}/users`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
      headers: { 'X-Tenant-ID': tenantId }
    });
  }

  async removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
    await this.request(`/tenants/${tenantId}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'X-Tenant-ID': tenantId }
    });
  }
}

const apiService = new ApiService();

export default apiService;

// Category API wrappers
export const getCategories = (token: string) => apiService.getCategories(token);
export const createCategory = (token: string, data: { name: string }) => apiService.createCategory(token, data);
export const updateCategory = (token: string, id: string, data: { name: string }) => apiService.updateCategory(token, id, data);
export const deleteCategory = (token: string, id: string) => apiService.deleteCategory(token, id);

// Data models
export interface Role {
  id: string;
  name: string;
  guard_name: string;
  tenant_id?: string | null;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
  tenant?: {
    id: string;
    name: string;
  } | null;
}

export interface Permission {
  id: string;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
}

export interface RoleCreateInput {
  name: string;
  permissions?: string[]; // Array of permission names
  guard_name?: string;
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

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  stock?: number | null;
  isActive?: boolean;
  productVariantGroupId?: string | null;
  availableWithVariants?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariantCombination {
  id: string;
  productId: string;
  sku?: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  variantIds: string[];
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariantGroup {
  id: string;
  name: string;
  isRequired: boolean;
  order: number;
  variants: ProductVariant[];
}

export interface ProductModification {
  id: string;
  name: string;
  price?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  price: number;
  image: string | null;
  imageUrl: string | null;
  sku: string;
  barcode: string | null;
  stock: number;
  request: boolean;
  remaining: boolean;
  isActive: boolean;
  unit?: { id: string; name: string; symbol?: string | null } | null;
  categoryDetail?: { id: string; name: string } | null;
  tenant?: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string } | null;
  stores?: { id: string; name: string; price?: number | null }[];
  storeIds?: string[];
  variants?: ProductVariant[];
  variantGroups?: ProductVariantGroup[];
  variantCombinations?: ProductVariantCombination[];
  modifications?: ProductModification[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariantInput {
  name: string;
  sku?: string;
  price?: number | null;
  stock?: number | null;
  isActive?: boolean;
  productVariantGroupId?: string;
  availableWithVariants?: string[];
}

export interface ProductVariantCombinationInput {
  id?: string;
  sku?: string | null;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface ProductVariantGroupInput {
  id?: string;
  name: string;
  isRequired: boolean;
  variants: ProductVariantInput[];
}

export interface ProductModificationInput {
  name: string;
  price?: number | null;
  isActive?: boolean;
}

export interface ProductInput {
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  sku: string;
  barcode?: string | null;
  stock?: number | null;
  request?: boolean | null;
  remaining?: boolean | null;
  unit_id?: string | null;
  category_id?: string | null;
  tenant_id?: string | null;
  user_id?: string | null;
  is_active?: boolean;
  imageFile?: File | null;
  remove_image?: boolean; // Add this flag
  variants?: ProductVariantInput[];
  variant_groups?: ProductVariantGroupInput[];
  modifications?: ProductModificationInput[];
  stores?: { id: string; price?: number | null }[];
  store_ids?: string[];
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
  tax_rate?: number;
  tax_name?: string;
  tax_type?: 'exclusive' | 'inclusive';
  service_charge_type?: 'percentage' | 'fixed';
  service_charge_rate?: number;
  service_charge_amount?: number;
  receipt_header?: string;
  receipt_footer?: string;
  email_receipt_logo?: string;
  print_receipt_logo?: string;
  address?: string;
  phone?: string;
  payment_methods?: PaymentMethod[];
  created_at?: string;
  updated_at?: string;
}

export interface PaymentMethod {
  id: string;
  store_id: string;
  type: 'cash' | 'qris' | 'transfer' | 'debit' | 'credit' | 'online';
  name: string;
  is_active: boolean;
  is_default: boolean;
  details?: any;
  require_proof: boolean;
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
  operation_mode?: 'standard' | 'foodcourt';
  foodcourt_config?: any;
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
  is_active?: boolean;
  last_active_at?: string | null;
  created_at: string;
  updated_at: string;
  roles: UserRole[];
  permissions?: Permission[];
  tenant?: Tenant;
  tenants: Tenant[];
  memberships: UserTenantMembership[];
}

export interface TenantInput {
  name: string;
  owner_id?: string;
  operation_mode?: 'standard' | 'foodcourt';
}

export interface TenantUpdateInput {
  name?: string;
  owner_id?: string;
  operation_mode?: 'standard' | 'foodcourt';
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
  receipt_header?: string | null;
  receipt_footer?: string | null;
  email_receipt_logo?: File | null;
  print_receipt_logo?: File | null;
  address?: string | null;
  phone?: string | null;
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
  creator?: Pick<User, 'id' | 'name' | 'email'>;
  approver?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
}
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Leave {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  duration?: number | null;
  reason?: string | null;
  status: LeaveStatus;
  approved_by_id?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  approver?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface LeaveCreateInput {
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  duration?: number | null;
}

export interface LeaveUpdateInput {
  type?: string;
  start_date?: string;
  end_date?: string;
  reason?: string | null;
  duration?: number | null;
}

export interface LeaveListParams {
  status?: LeaveStatus;
  user_id?: string;
  type?: string;
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

function appendPaymentMethodDetails(formData: FormData, details: unknown) {
  if (!isRecord(details)) {
    return;
  }

  for (const [key, value] of Object.entries(details)) {
    if (key === 'qr_image_file' || key === 'payment_image' || value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'object') {
      formData.append(`details[${key}]`, JSON.stringify(value));
      continue;
    }

    formData.append(`details[${key}]`, String(value));
  }
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

// Store payload when nested under a product relationship
interface ApiProductStorePayload {
  id: string;
  name: string;
  price?: number | string | null;
}

interface ApiProductVariantPayload {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | string | null;
  stock?: number | string | null;
  is_active?: boolean;
  product_variant_group_id?: string | null;
  available_with_variants?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ApiProductVariantGroupPayload {
  id: string;
  name: string;
  is_required: boolean | number;
  order: number;
  variants: ApiProductVariantPayload[];
}

interface ApiProductVariantCombinationPayload {
  id: string;
  product_id: string;
  sku?: string | null;
  price: number | string;
  stock: number | string;
  is_active: boolean;
  variant_ids: string[];
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ApiProductModificationPayload {
  id: string;
  name: string;
  price?: number | string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ApiProductPayload {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  price?: number | string | null;
  image?: string | null;
  image_url?: string | null;
  sku: string;
  barcode?: string | null;
  stock?: number | string | null;
  request?: number | string | null;
  remaining?: number | string | null;
  is_active?: boolean;
  unit?: { id: string; name: string; symbol?: string | null } | null;
  category_detail?: { id: string; name: string } | null;
  tenant?: { id: string; name: string } | null;
  user?: { id: string; name: string; email: string } | null;
  stores?: ApiProductStorePayload[] | null;
  store_ids?: (string | number)[] | null;
  variants?: ApiProductVariantPayload[] | null;
  variant_groups?: ApiProductVariantGroupPayload[] | null;
  variant_combinations?: ApiProductVariantCombinationPayload[] | null;
  modifications?: ApiProductModificationPayload[] | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  uuid?: string | null;
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
  uuid?: string | null;
  name: string;
  email: string;
  email_verified_at?: string | null;
  is_active?: boolean;
  last_active_at?: string | null;
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
interface ApiLeavePayload {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  start_date?: string;
  end_date?: string;
  duration?: number | string | null;
  reason?: string | null;
  status: LeaveStatus;
  approved_by_id?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
  tenant?: ApiTenantPayload | null;
  user?: ApiUserPayload | null;
  approver?: ApiUserPayload | null;
}

function normaliseProduct(product: ApiProductPayload): Product {
  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const unit = product.unit
    ? {
      id: String(product.unit.id ?? ''),
      name: String(product.unit.name ?? ''),
      symbol: product.unit.symbol ?? null,
    }
    : null;

  const categoryDetail = product.category_detail
    ? {
      id: String(product.category_detail.id ?? ''),
      name: String(product.category_detail.name ?? ''),
    }
    : null;

  const tenant = product.tenant
    ? {
      id: String(product.tenant.id ?? ''),
      name: String(product.tenant.name ?? ''),
    }
    : null;

  const user = product.user
    ? {
      id: String(product.user.id ?? ''),
      name: String(product.user.name ?? ''),
      email: String(product.user.email ?? ''),
    }
    : null;

  const stores = Array.isArray(product.stores)
    ? product.stores.map((store) => ({
      id: String(store.id ?? ''),
      name: String(store.name ?? ''),
      price: store.price != null ? toNumber(store.price, 0) : undefined,
    }))
    : undefined;

  const storeIds = Array.isArray(product.store_ids)
    ? product.store_ids.map((id) => String(id))
    : stores
      ? stores.map((store) => store.id)
      : undefined;

  const variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => ({
      id: String(variant.id ?? ''),
      name: String(variant.name ?? ''),
      sku: variant.sku ?? null,
      price: toNumber(variant.price ?? null, 0),
      stock: toNumber(variant.stock ?? null, 0),
      isActive: typeof variant.is_active === 'boolean' ? variant.is_active : true,
      createdAt: variant.created_at ?? undefined,
      updatedAt: variant.updated_at ?? undefined,
    }))
    : undefined;

  const variantGroups = Array.isArray(product.variant_groups)
    ? product.variant_groups.map((group) => ({
      id: String(group.id ?? ''),
      name: String(group.name ?? ''),
      isRequired: Boolean(group.is_required),
      order: Number(group.order ?? 0),
      variants: Array.isArray(group.variants)
        ? group.variants.map((variant) => ({
          id: String(variant.id ?? ''),
          name: String(variant.name ?? ''),
          sku: variant.sku ?? null,
          price: toNumber(variant.price ?? null, 0),
          stock: toNumber(variant.stock ?? null, 0),
          isActive: typeof variant.is_active === 'boolean' ? variant.is_active : true,
          productVariantGroupId: String(group.id ?? ''),
          availableWithVariants: Array.isArray(variant.available_with_variants)
            ? variant.available_with_variants
            : undefined,
          createdAt: variant.created_at ?? undefined,
          updatedAt: variant.updated_at ?? undefined,
        }))
        : [],
    }))
    : undefined;

  const modifications = Array.isArray(product.modifications)
    ? product.modifications.map((modification) => ({
      id: String(modification.id ?? ''),
      name: String(modification.name ?? ''),
      price: toNumber(modification.price ?? null, 0),
      isActive: typeof modification.is_active === 'boolean' ? modification.is_active : true,
      createdAt: modification.created_at ?? undefined,
      updatedAt: modification.updated_at ?? undefined,
    }))
    : undefined;

  const variantCombinations = Array.isArray(product.variant_combinations)
    ? product.variant_combinations.map((combination) => ({
      id: String(combination.id ?? ''),
      productId: String(combination.product_id ?? ''),
      sku: combination.sku ?? null,
      price: toNumber(combination.price, 0),
      stock: toNumber(combination.stock, 0),
      isActive: typeof combination.is_active === 'boolean' ? combination.is_active : true,
      variantIds: Array.isArray(combination.variant_ids) ? combination.variant_ids : [],
      name: String(combination.name ?? ''),
      createdAt: combination.created_at ?? undefined,
      updatedAt: combination.updated_at ?? undefined,
    }))
    : undefined;

  return {
    id: String(product.id ?? ''),
    name: String(product.name ?? ''),
    slug: String(product.slug ?? ''),
    description: product.description ?? null,
    category: product.category ?? categoryDetail?.name ?? null,
    price: toNumber(product.price, 0),
    image: product.image ?? null,
    imageUrl: typeof product.image_url === 'string' ? product.image_url : null,
    sku: String(product.sku ?? ''),
    barcode: product.barcode ?? null,
    stock: toNumber(product.stock, 0),
    request: Boolean(product.request),
    remaining: Boolean(product.remaining),
    isActive: typeof product.is_active === 'boolean' ? product.is_active : true,
    unit,
    categoryDetail,
    tenant,
    user,
    stores,
    storeIds,
    variants,
    variantGroups,
    variantCombinations,
    modifications,
    createdAt: product.created_at ?? undefined,
    updatedAt: product.updated_at ?? undefined,
  };
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
    receipt_header: store.receipt_header ?? null,
    receipt_footer: store.receipt_footer ?? null,
    email_receipt_logo: store.email_receipt_logo ?? null,
    print_receipt_logo: store.print_receipt_logo ?? null,
    address: store.address ?? null,
    phone: store.phone ?? null,
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
        id: tenant.owner.uuid ?? tenant.owner.id,
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

function buildProductJsonPayload(input: ProductInput) {
  const stock = input.stock ?? 0;
  const request = Boolean(input.request);
  const remaining = input.remaining !== undefined ? Boolean(input.remaining) : true;

  const payload: Record<string, unknown> = {
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    sku: input.sku,
    barcode: input.barcode ?? null,
    stock,
    request,
    remaining,
    unit_id: input.unit_id ?? null,
    category_id: input.category_id ?? null,
    tenant_id: input.tenant_id ?? null,
    user_id: input.user_id ?? null,
    is_active: input.is_active ?? true,
    remove_image: input.remove_image,
  };

  if (input.stores !== undefined) {
    payload.stores = input.stores.map((store) => ({
      id: store.id,
      price: store.price != null ? Math.round(store.price) : null,
    }));

    if (input.store_ids === undefined) {
      payload.store_ids = input.stores.map((store) => store.id);
    }
  }

  if (input.store_ids !== undefined) {
    payload.store_ids = input.store_ids;
  }

  if (input.variants !== undefined) {
    payload.variants = input.variants.map((variant) => ({
      name: variant.name,
      sku: variant.sku ?? null,
      price: variant.price ?? 0,
      stock: variant.stock ?? 0,
      is_active: variant.isActive ?? true,
    }));
  }


  if (input.variant_groups !== undefined) {
    payload.variant_groups = input.variant_groups.map((group) => ({
      name: group.name,
      is_required: group.isRequired,
      variants: group.variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku ?? null,
        price: variant.price ?? 0,
        stock: variant.stock ?? 0,
        is_active: variant.isActive ?? true,
        available_with_variants: variant.availableWithVariants ?? null,
      })),
    }));
  }

  if (input.modifications !== undefined) {
    payload.modifications = input.modifications.map((modification) => ({
      name: modification.name,
      price: modification.price ?? 0,
      is_active: modification.isActive ?? true,
    }));
  }

  return payload;
}

function buildProductFormData(input: ProductInput): FormData {
  const formData = new FormData();

  formData.append('name', input.name);
  formData.append('description', input.description ?? '');
  formData.append('price', String(input.price));
  formData.append('sku', input.sku);
  if (input.barcode !== undefined && input.barcode !== null) {
    formData.append('barcode', input.barcode);
  }

  if (input.unit_id) {
    formData.append('unit_id', input.unit_id);
  }
  if (input.category_id) {
    formData.append('category_id', input.category_id);
  }
  if (input.tenant_id) {
    formData.append('tenant_id', input.tenant_id);
  }
  if (input.user_id) {
    formData.append('user_id', input.user_id);
  }

  const stock = input.stock ?? 0;
  const request = input.request ?? false;
  const remaining = input.remaining !== undefined ? Boolean(input.remaining) : true;

  formData.append('stock', String(stock));
  formData.append('request', request ? '1' : '0');
  formData.append('remaining', remaining ? '1' : '0');

  if (typeof input.is_active === 'boolean') {
    formData.append('is_active', input.is_active ? '1' : '0');
  }

  if (input.imageFile instanceof File) {
    formData.append('image', input.imageFile);
  }
  if (input.remove_image) {
    formData.append('remove_image', '1');
  }

  if (input.variants !== undefined) {
    const variantsPayload = input.variants.map((variant) => ({
      name: variant.name,
      sku: variant.sku ?? null,
      price: variant.price ?? 0,
      stock: variant.stock ?? 0,
      is_active: variant.isActive ?? true,
    }));
    formData.append('variants', JSON.stringify(variantsPayload));
  } else if (input.variant_groups !== undefined) {
    // When using variant_groups, send empty array for legacy variants field
    formData.append('variants', JSON.stringify([]));
  }

  if (input.variant_groups !== undefined) {
    const variantGroupsPayload = input.variant_groups.map((group) => ({
      id: group.id,
      name: group.name,
      is_required: group.isRequired,
      variants: group.variants.map((variant) => ({
        name: variant.name,
        sku: variant.sku ?? null,
        price: variant.price ?? 0,
        stock: variant.stock ?? 0,
        is_active: variant.isActive ?? true,
        available_with_variants: variant.availableWithVariants ?? null,
      })),
    }));
    formData.append('variant_groups', JSON.stringify(variantGroupsPayload));
  }

  if (input.modifications !== undefined) {
    const modificationsPayload = input.modifications.map((modification) => ({
      name: modification.name,
      price: modification.price ?? 0,
      is_active: modification.isActive ?? true,
    }));
    formData.append('modifications', JSON.stringify(modificationsPayload));
  }

  if (input.stores !== undefined) {
    const storesPayload = input.stores.map((store) => ({
      id: store.id,
      price: store.price != null ? Math.round(store.price) : null,
    }));
    formData.append('stores', JSON.stringify(storesPayload));
  }

  if (input.store_ids !== undefined) {
    input.store_ids.forEach((storeId) => {
      formData.append('store_ids[]', storeId);
    });
  }

  return formData;
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
  const roles = Array.isArray(user.roles)
    ? user.roles.map((role) => ({
      id: role.id,
      name: role.name,
    }))
    : [];

  if (roles.length === 0) {
    memberships
      .map((membership) => membership.role)
      .filter((role, index, source) => role && source.indexOf(role) === index)
      .forEach((role) => {
        roles.push({
          id: `membership-${role}`,
          name: role,
        });
      });
  }

  return {
    id: user.uuid ?? user.id,
    name: user.name,
    email: user.email,
    email_verified_at: user.email_verified_at ?? null,
    is_active: user.is_active ?? true,
    last_active_at: user.last_active_at ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at,
    roles,
    tenant: fallbackTenant,
    tenants: tenantList,
    memberships,
  };
}

function normaliseBasicUser(user: ApiUserPayload): Pick<User, 'id' | 'name' | 'email'> {
  return {
    id: user.uuid ?? user.id,
    name: user.name,
    email: user.email,
  };
}

// Permission Management Types
export interface PermissionModule {
  module: string;
  permissions: {
    name: string;
    label: string;
  }[];
}

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  pivot_role: string;
  assigned_by: string | null;
  joined_at: string;
  roles: string[];
  permissions: string[];
}

function normaliseAttendancePayload(attendance: ApiAttendancePayload): Attendance {
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
    creator: attendance.creator ? normaliseBasicUser(attendance.creator) : undefined,
    approver: attendance.approver ? normaliseBasicUser(attendance.approver) : undefined,
  };
}

function normaliseLeave(leave: ApiLeavePayload): Leave {
  return {
    id: leave.id,
    tenant_id: leave.tenant_id,
    user_id: leave.user_id,
    type: leave.type,
    start_date: leave.start_date ?? '',
    end_date: leave.end_date ?? '',
    duration: leave.duration != null ? Number(leave.duration) : null,
    reason: leave.reason ?? null,
    status: leave.status,
    approved_by_id: leave.approved_by_id ?? null,
    approved_at: leave.approved_at ?? null,
    rejected_at: leave.rejected_at ?? null,
    review_notes: leave.review_notes ?? null,
    created_at: leave.created_at,
    updated_at: leave.updated_at,
    tenant: leave.tenant ? normaliseTenant(leave.tenant) : undefined,
    user: leave.user ? normaliseBasicUser(leave.user) : undefined,
    approver: leave.approver ? normaliseBasicUser(leave.approver) : undefined,
  };
}
