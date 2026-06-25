// API service for interacting with the Laravel backend
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocalBrowser =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1';

    if (isLocalBrowser && configuredApiBaseUrl?.startsWith('http')) {
      return '/api';
    }
  }

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

  // Image Upload
  /**
   * Upload an image to the img service via signed URL.
   * Returns the path (e.g. "ops/product/UUID.webp") on success.
   */
  async uploadImage(file: File, directory?: string): Promise<string> {
    // 1. Get signed upload URL from api-ops
    const query = directory ? `?directory=${encodeURIComponent(directory)}` : '';
    const signedUrlResponse = await this.request(`/auth/upload-url${query}`);
    if (!isRecord(signedUrlResponse) || typeof (signedUrlResponse as any).upload_url !== 'string') {
      throw new ApiError('Failed to obtain upload URL.', 500);
    }

    const uploadUrl = (signedUrlResponse as any).upload_url as string;

    // 2. POST the file directly to the img service
    const formData = new FormData();
    formData.append('image', file);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      let message = `Upload failed with status ${uploadResponse.status}`;
      try {
        const body = await uploadResponse.json();
        if (typeof body.error === 'string') message = body.error;
      } catch { /* ignore */ }
      throw new ApiError(message, uploadResponse.status);
    }

    const result = await uploadResponse.json();
    // Return the path (e.g. "UUID.webp") — this is what the backend stores
    return (result.path as string) ?? (result.url as string);
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
    const payload = buildProductJsonPayload(input);

    // Upload image first if present
    if (input.imageFile instanceof File) {
      const imagePath = await this.uploadImage(input.imageFile, 'ops/product');
      payload.image = imagePath;
    }

    const response = await this.request('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (isRecord(response) && 'product' in response && response.product) {
      (response as Record<string, unknown>).product = normaliseProduct(response.product as ApiProductPayload);
    }

    return response;
  }

  async updateProduct(productId: string, input: ProductInput) {
    const payload = buildProductJsonPayload(input);

    // Upload image first if present
    if (input.imageFile instanceof File) {
      const imagePath = await this.uploadImage(input.imageFile, 'ops/product');
      payload.image = imagePath;
    }

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

  async getPosShifts(params?: { storeId?: string; status?: string; businessDate?: string }) {
    const query = new URLSearchParams();
    if (params?.storeId) query.set('store_id', params.storeId);
    if (params?.status) query.set('status', params.status);
    if (params?.businessDate) query.set('business_date', params.businessDate);

    const response = await this.request(`/ops/shifts${query.toString() ? `?${query.toString()}` : ''}`);
    const rows = (response as { data?: ApiPosShiftPayload[] }).data;
    return Array.isArray(rows) ? rows.map(normalisePosShift) : [];
  }

  async getPosShift(shiftId: string) {
    const response = await this.request(`/ops/shifts/${shiftId}`);
    const row = (response as { data?: ApiPosShiftPayload }).data;
    return row ? normalisePosShift(row) : null;
  }

  async forceClosePosShift(shiftId: string, reason: string) {
    const response = await this.request(`/ops/shifts/${shiftId}/force-close`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    const row = (response as { data?: ApiPosShiftPayload }).data;
    return row ? normalisePosShift(row) : null;
  }

  async getProductPrices(params: { storeId?: string; productId?: string; customerTypeId?: string }) {
    const searchParams = new URLSearchParams();
    if (params.storeId) searchParams.set('store_id', params.storeId);
    if (params.productId) searchParams.set('product_id', params.productId);
    if (params.customerTypeId) searchParams.set('customer_type_id', params.customerTypeId);

    const response = await this.request(`/product-prices?${searchParams.toString()}`);
    const rows = (response as { data?: ApiProductPricePayload[] }).data;
    return Array.isArray(rows) ? rows.map(normaliseProductPrice) : [];
  }

  async saveProductPrices(input: { storeId: string; productId: string; prices: ProductPriceInput[] }) {
    const response = await this.request('/product-prices/bulk', {
      method: 'POST',
      body: JSON.stringify({
        store_id: input.storeId,
        product_id: input.productId,
        prices: input.prices,
      }),
    });

    const rows = (response as { data?: ApiProductPricePayload[] }).data;
    return Array.isArray(rows) ? rows.map(normaliseProductPrice) : [];
  }

  async createStore(tenantId: string, storeData: StoreInput) {
    const payload: Record<string, unknown> = { ...storeData };

    if (storeData.email_receipt_logo instanceof File) {
      payload.email_receipt_logo = await this.uploadImage(storeData.email_receipt_logo, 'ops/store');
    }
    if (storeData.print_receipt_logo instanceof File) {
      payload.print_receipt_logo = await this.uploadImage(storeData.print_receipt_logo, 'ops/store');
    }

    const response = await this.request(`/tenants/${tenantId}/stores`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (isRecord(response) && response.success && 'store' in response && response.store) {
      response.store = normaliseStore(response.store as ApiStorePayload);
    }
    return response;
  }

  async updateStore(tenantId: string, storeId: string, storeData: StoreInput) {
    const payload: Record<string, unknown> = { ...storeData };

    if (storeData.email_receipt_logo instanceof File) {
      payload.email_receipt_logo = await this.uploadImage(storeData.email_receipt_logo, 'ops/store');
    }
    if (storeData.print_receipt_logo instanceof File) {
      payload.print_receipt_logo = await this.uploadImage(storeData.print_receipt_logo, 'ops/store');
    }

    const response = await this.request(`/tenants/${tenantId}/stores/${storeId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
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

  async getStoreGroups(tenantId: string) {
    const response = await this.request(`/tenants/${tenantId}/store-groups`);
    const groups = (response as { store_groups?: ApiStoreGroupPayload[] }).store_groups;
    return Array.isArray(groups) ? groups.map(normaliseStoreGroup) : [];
  }

  async createStoreGroup(tenantId: string, input: StoreGroupInput) {
    const response = await this.request(`/tenants/${tenantId}/store-groups`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (isRecord(response) && response.success && response.store_group) {
      response.store_group = normaliseStoreGroup(response.store_group as ApiStoreGroupPayload);
    }
    return response;
  }

  async updateStoreGroup(tenantId: string, groupId: string, input: StoreGroupInput) {
    const response = await this.request(`/tenants/${tenantId}/store-groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    if (isRecord(response) && response.success && response.store_group) {
      response.store_group = normaliseStoreGroup(response.store_group as ApiStoreGroupPayload);
    }
    return response;
  }

  async deleteStoreGroup(tenantId: string, groupId: string) {
    return this.request(`/tenants/${tenantId}/store-groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  async syncStoreGroupSettings(tenantId: string, groupId: string, sourceStoreId: string) {
    return this.request(`/tenants/${tenantId}/store-groups/${groupId}/sync-settings`, {
      method: 'POST',
      body: JSON.stringify({ source_store_id: sourceStoreId }),
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
    } else if (
      isRecord(response) &&
      isRecord(response.data) &&
      Array.isArray((response.data as { data?: unknown }).data)
    ) {
      const paginatedData = response.data as { data: Attendance[] | ApiAttendancePayload[] };
      paginatedData.data = paginatedData.data.map((attendance) => normaliseAttendancePayload(attendance as ApiAttendancePayload));
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
    // Upload selfie first, then send JSON with URL
    const selfiePath = await this.uploadImage(data.selfie_photo, 'ops/attendance');

    const response = await this.request('/presence/check-in', {
      method: 'POST',
      body: JSON.stringify({
        store_id: data.store_id,
        shift_store_id: data.shift_store_id,
        selfie_photo: selfiePath,
        latitude: data.latitude,
        longitude: data.longitude,
        gps_accuracy: data.gps_accuracy,
        device_info: data.device_info,
      }),
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
    // Upload selfie first, then send JSON with URL
    const selfiePath = await this.uploadImage(data.selfie_photo, 'ops/attendance');

    const response = await this.request('/presence/check-out', {
      method: 'POST',
      body: JSON.stringify({
        attendance_id: data.attendance_id,
        store_id: data.store_id,
        selfie_photo: selfiePath,
        latitude: data.latitude,
        longitude: data.longitude,
        gps_accuracy: data.gps_accuracy,
        device_info: data.device_info,
      }),
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
  async getPaymentMethods(storeId: string, options?: { scope?: 'store' | 'group' }) {
    const searchParams = new URLSearchParams({ store_id: storeId });
    if (options?.scope === 'group') {
      searchParams.set('scope', 'group');
    }

    const response = await this.request(`/payment-methods?${searchParams.toString()}`);
    if (isRecord(response) && Array.isArray((response as any).data)) {
      return (response as any).data;
    }
    return [];
  }

  async createPaymentMethod(data: any) {
    const payload = { ...data };

    // Upload QRIS image file if present
    if (payload.details?.qr_image_file instanceof File) {
      const imagePath = await this.uploadImage(payload.details.qr_image_file);
      payload.details = { ...payload.details, qr_image: imagePath };
      delete payload.details.qr_image_file;
    }

    // Upload generic payment image file if present
    if (payload.details?.payment_image_file instanceof File) {
      const imagePath = await this.uploadImage(payload.details.payment_image_file);
      payload.details = { ...payload.details, image: imagePath };
      delete payload.details.payment_image_file;
    }

    const response = await this.request('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (isRecord(response) && (response as any).data) {
      return (response as any).data;
    }
    return response;
  }

  async updatePaymentMethod(id: string, data: any) {
    const payload = { ...data };

    // Upload QRIS image file if present
    if (payload.details?.qr_image_file instanceof File) {
      const imagePath = await this.uploadImage(payload.details.qr_image_file);
      payload.details = { ...payload.details, qr_image: imagePath };
      delete payload.details.qr_image_file;
    }

    // Upload generic payment image file if present
    if (payload.details?.payment_image_file instanceof File) {
      const imagePath = await this.uploadImage(payload.details.payment_image_file);
      payload.details = { ...payload.details, image: imagePath };
      delete payload.details.payment_image_file;
    }

    const response = await this.request(`/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
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
  async getCustomerTypes(storeId?: string) {
    const query = storeId ? `?store_id=${storeId}` : '';
    const response = await this.request(`/customer-types${query}`);
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

  // Sales / Order endpoints
  async getSalesSummary(params?: {
    startDate?: string;
    endDate?: string;
    storeId?: string;
    source?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('start_date', params.startDate);
    if (params?.endDate) searchParams.set('end_date', params.endDate);
    if (params?.storeId) searchParams.set('store_id', params.storeId);
    if (params?.source) searchParams.set('source', params.source);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await this.request(`/orders/summary${query}`);

    if (isRecord(response) && response.success && response.data) {
      return response.data as SalesSummary;
    }

    return null;
  }

  async getSalesChart(params?: {
    startDate?: string;
    endDate?: string;
    startHour?: number;
    endHour?: number;
    storeId?: string;
    source?: string;
    createdBy?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('start_date', params.startDate);
    if (params?.endDate) searchParams.set('end_date', params.endDate);
    if (params?.startHour !== undefined) searchParams.set('start_hour', String(params.startHour));
    if (params?.endHour !== undefined) searchParams.set('end_hour', String(params.endHour));
    if (params?.storeId) searchParams.set('store_id', params.storeId);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.createdBy) searchParams.set('created_by', params.createdBy);
    if (params?.groupBy) searchParams.set('group_by', params.groupBy);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await this.request(`/orders/chart${query}`);

    if (isRecord(response) && response.success && response.data) {
      return response.data as SalesChart;
    }

    return null;
  }

  async getOrders(params?: {
    storeId?: string;
    status?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    perPage?: number;
    page?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.storeId) searchParams.set('store_id', params.storeId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.startDate) searchParams.set('start_date', params.startDate);
    if (params?.endDate) searchParams.set('end_date', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.perPage) searchParams.set('per_page', params.perPage.toString());
    if (params?.page) searchParams.set('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await this.request(`/orders${query}`);

    return response;
  }

  async getOrder(orderId: string) {
    const response = await this.request(`/orders/${orderId}`);
    return response;
  }

  // Refund endpoints (manager/owner only)
  async checkRefundEligibility(orderId: string): Promise<RefundEligibility> {
    const response = await this.request(`/orders/${orderId}/refund-eligibility`);
    const data = (response as { success?: boolean; data?: RefundEligibility })?.data;
    if (!data) {
      throw new ApiError('Failed to check refund eligibility', 500);
    }
    return data;
  }

  async processRefund(
    orderId: string,
    payload: RefundInput,
  ): Promise<Refund> {
    const response = await this.request(`/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = (response as { success?: boolean; data?: Refund })?.data;
    if (!data) {
      throw new ApiError('Failed to process refund', 500);
    }
    return data;
  }

  async getRefunds(params?: {
    orderId?: string;
    storeId?: string;
    status?: string;
    refundType?: string;
    startDate?: string;
    endDate?: string;
    perPage?: number;
    page?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.orderId) searchParams.set('order_id', params.orderId);
    if (params?.storeId) searchParams.set('store_id', params.storeId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.refundType) searchParams.set('refund_type', params.refundType);
    if (params?.startDate) searchParams.set('start_date', params.startDate);
    if (params?.endDate) searchParams.set('end_date', params.endDate);
    if (params?.perPage) searchParams.set('per_page', params.perPage.toString());
    if (params?.page) searchParams.set('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/refunds${query}`);
  }

  async getRefund(refundId: string) {
    return this.request(`/refunds/${refundId}`);
  }
}

const apiService = new ApiService();

export default apiService;

// Category API wrappers
export const getCategories = (token: string) => apiService.getCategories(token);
export const createCategory = (token: string, data: { name: string }) => apiService.createCategory(token, data);
export const updateCategory = (token: string, id: string, data: { name: string }) => apiService.updateCategory(token, id, data);
export const deleteCategory = (token: string, id: string) => apiService.deleteCategory(token, id);

// Sales / Order types
export interface SalesSummaryBreakdownItem {
  status?: string;
  source?: string;
  store_id?: string;
  store_name?: string;
  store_nickname?: string;
  product_id?: string;
  product_name?: string;
  payment_type_id?: string;
  payment_type_name?: string;
  count: number;
  total: number;
  total_quantity?: number;
  total_revenue?: number;
  total_amount?: number;
  order_count?: number;
}

export interface SalesSummary {
  period: {
    start_date: string;
    end_date: string;
    timezone: string;
  };
  filters: {
    store_id: string | null;
    source: string | null;
  };
  totals: {
    total_orders: number;
    total_subtotal: number;
    total_discount: number;
    total_tax: number;
    total_service: number;
    total_revenue: number;
    average_order_value: number;
  };
  by_status: SalesSummaryBreakdownItem[];
  by_source: SalesSummaryBreakdownItem[];
  by_store: SalesSummaryBreakdownItem[];
  top_products: SalesSummaryBreakdownItem[];
  by_payment_type: SalesSummaryBreakdownItem[];
}

export interface SalesChartSeriesItem {
  period: string;
  gross_sales: number;
  refunds: number;
  discounts: number;
  net_sales: number;
  gross_profit: number;
  cogs: number;
  order_count: number;
}

export interface SalesChart {
  period: {
    start_date: string;
    end_date: string;
    timezone: string;
  };
  filters: {
    store_id: string | null;
    source: string | null;
    created_by: string | null;
    start_hour: number | null;
    end_hour: number | null;
    group_by: string;
  };
  totals: {
    gross_sales: number;
    refunds: number;
    discounts: number;
    net_sales: number;
    gross_profit: number;
    cogs: number;
    order_count: number;
  };
  series: SalesChartSeriesItem[];
}

// Receipt / Order detail types
export interface ReceiptItemVariant {
  id: string;
  product_variant_id: string | null;
  name: string;
  price: number;
}

export interface ReceiptItemModification {
  id: string;
  product_modification_id: string | null;
  price: number;
  quantity: number;
}

export interface ReceiptItem {
  id: string;
  order_id: string;
  /**
   * Product name. Prefer reading from `product_snapshot.name`; this field is
   * kept for backward compatibility and is populated from the snapshot when
   * the backend OrderItem model exposes its `name_snapshot` accessor.
   */
  name_snapshot?: string;
  product_snapshot?: { id?: string | null; name?: string | null; price?: number | null } | null;
  /**
   * Variant snapshot stored on the order item.
   * Shape varies by source:
   *  - api-mobile guest: `{ id, name, price }` (single object)
   *  - api-ops POS: `Array<{ id, name, price }>` (array)
   *  - legacy: `Array<ReceiptItemVariant>`
   */
  variant_snapshot?:
    | { id?: string | null; name?: string | null; price?: number | null }
    | Array<{ id?: string | null; name?: string | null; price?: number | null }>
    | null;
  modifications_snapshot?: Array<{ name?: string | null; price?: number | null; quantity?: number | null }> | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  variants?: ReceiptItemVariant[];
  order_item_modifications?: ReceiptItemModification[];
}

/**
 * Helper to resolve an order item's display name regardless of whether it
 * comes from the legacy `name_snapshot` column or the new `product_snapshot`
 * JSON payload.
 */
export function getReceiptItemName(item: ReceiptItem): string {
  return (
    item.name_snapshot ??
    item.product_snapshot?.name ??
    'Unknown Product'
  );
}

export interface ReceiptPayment {
  id: string;
  order_id: string;
  amount: number;
  payment_type_id: string | null;
  reference: string | null;
  captured_at: string | null;
  is_offline: boolean;
}

export interface ReceiptStore {
  id: string;
  name: string;
  nickname: string | null;
  address?: string | null;
  phone?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
}

export interface Receipt {
  id: string;
  tenant_id: string;
  store_id: string;
  shift_session_id: string | null;
  created_by: string | null;
  customer_name: string | null;
  table_code: string | null;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  subtotal: number;
  discount_total: number;
  tax_total: number;
  service_total: number;
  grand_total: number;
  payment_type_id: string | null;
  paid_at: string | null;
  source: string;
  device_identifier: string | null;
  is_offline: boolean;
  synced_at: string | null;
  customer_type_id: string | null;
  proof_of_payment: string | null;
  payment_snapshot: Record<string, unknown> | null;
  customer_type_snapshot: Record<string, unknown> | null;
  receipt_number: string;
  time_ago: string;
  created_at: string;
  updated_at: string;
  // relations
  store?: ReceiptStore | null;
  order_items?: ReceiptItem[];
  order_payments?: ReceiptPayment[];
}

export interface ReceiptsPaginatedResponse {
  current_page: number;
  data: Receipt[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

// Refund types
export interface RefundItemSummary {
  id: string;
  order_item_id: string;
  product_name: string;
  quantity_refunded: number;
  unit_price: number;
  total_refund_amount: number;
  reason: string | null;
}

export interface Refund {
  id: string;
  order_id: string;
  refund_number: string;
  refund_type: 'full' | 'partial';
  total_amount: number;
  reason: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  payment_method: string | null;
  refunded_by: string | null;
  refunded_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  order?: {
    id: string;
    receipt_number: string;
    store_id: string;
    store_name: string | null;
    grand_total: number;
    customer_name: string | null;
    created_at: string | null;
  } | null;
  items: RefundItemSummary[];
}

export interface RefundEligibilityItem {
  order_item_id: string;
  product_name: string;
  quantity: number;
  quantity_refunded: number;
  quantity_pending_refund: number;
  available_quantity: number;
  unit_price: number;
  max_refund_amount: number;
}

export interface RefundEligibility {
  order: {
    id: string;
    receipt_number: string;
    grand_total: number;
    total_refunded: number;
    available_refund_amount: number;
  };
  available_items: RefundEligibilityItem[];
}

export interface RefundInputItem {
  order_item_id: string;
  quantity: number;
  reason?: string | null;
}

export interface RefundInput {
  items: RefundInputItem[];
  reason: string;
  notes?: string | null;
  payment_method?: string | null;
}

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
  sortOrder?: number;
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

export interface ProductPrice {
  id: string;
  storeId: string;
  productId: string;
  customerTypeId: string;
  price: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPriceInput {
  store_id: string;
  product_id: string;
  customer_type_id: string;
  price: number;
  is_active?: boolean;
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
  sortOrder?: number;
  linkedProductId?: string | null;
  linkedProductQuantity?: number | null;
  linkedProduct?: ProductBundleComponent | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductType = 'single' | 'bundle';
export type BundlePricingMode = 'fixed' | 'sum_components';

export interface ProductBundleComponent {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  stock: number;
  isActive: boolean;
}

export interface ProductBundleItem {
  id: string;
  bundleProductId: string;
  componentProductId: string;
  quantity: number;
  sortOrder: number;
  componentProduct?: ProductBundleComponent | null;
}

export interface ProductBundleItemInput {
  component_product_id: string;
  quantity: number;
  sort_order?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  type: ProductType;
  bundlePricingMode: BundlePricingMode;
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
  stores?: { id: string; name: string; price?: number | null; stock?: number | null }[];
  storeIds?: string[];
  variants?: ProductVariant[];
  variantGroups?: ProductVariantGroup[];
  variantCombinations?: ProductVariantCombination[];
  productPrices?: ProductPrice[];
  modifications?: ProductModification[];
  bundleItems?: ProductBundleItem[];
  bundleAvailableStock?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariantInput {
  name: string;
  sku?: string;
  price?: number | null;
  stock?: number | null;
  isActive?: boolean;
  sortOrder?: number;
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
  sortOrder?: number;
  linkedProductId?: string | null;
  linkedProductQuantity?: number | null;
}

export interface ProductInput {
  name: string;
  slug?: string;
  description?: string | null;
  type?: ProductType;
  bundle_pricing_mode?: BundlePricingMode;
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
  bundle_items?: ProductBundleItemInput[];
  stores?: { id: string; price?: number | null; stock?: number | null }[];
  store_ids?: string[];
}

export interface PosShiftStockItem {
  id: string;
  productId: string;
  product?: { id: string; name: string; sku?: string | null } | null;
  openingStock: number;
  additionStock: number;
  soldQuantity: number;
  expectedClosingStock: number;
  actualClosingStock?: number | null;
  variance?: number | null;
  openingVariance?: number | null;
  openingVarianceNote?: string | null;
  closingNote?: string | null;
}

export interface PosShift {
  id: string;
  tenantId?: string | null;
  storeId: string;
  store?: { id: string; name: string; nickname?: string | null } | null;
  openedByUserId?: string | null;
  closedByUserId?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  businessDate?: string | null;
  status: 'open' | 'closed' | 'force_closed' | 'overdue' | string;
  rawStatus?: string | null;
  openingNote?: string | null;
  closingNote?: string | null;
  isForceClosed: boolean;
  forceCloseReason?: string | null;
  stockItemsCount: number;
  items?: PosShiftStockItem[];
}

export interface Store {
  id: string;
  tenant_id: string;
  store_group_id?: string | null;
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
  receipt_header?: string | null;
  receipt_footer?: string | null;
  email_receipt_logo?: string | null;
  print_receipt_logo?: string | null;
  email_receipt_logo_url?: string | null;
  print_receipt_logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  payment_methods?: PaymentMethod[];
  created_at?: string;
  updated_at?: string;
}

export interface StoreGroup {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  stores: Store[];
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
  store_group_id?: string | null;
  nickname?: string | null;
  no_telp?: string | null;
  email?: string | null;
  status?: string | null;
  radius?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  email_receipt_logo?: File | string | null;
  print_receipt_logo?: File | string | null;
  address?: string | null;
  phone?: string | null;
}

export interface StoreGroupInput {
  name: string;
  description?: string | null;
  store_ids?: string[];
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
  store_group_id?: string | null;
  name: string;
  nickname?: string | null;
  no_telp?: string | null;
  email?: string | null;
  status?: string | null;
  radius?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  email_receipt_logo?: string | null;
  print_receipt_logo?: string | null;
  email_receipt_logo_url?: string | null;
  print_receipt_logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ApiStoreGroupPayload {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  stores?: ApiStorePayload[] | null;
  created_at?: string;
  updated_at?: string;
}

// Store payload when nested under a product relationship
interface ApiProductStorePayload {
  id: string;
  name: string;
  price?: number | string | null;
  stock?: number | string | null;
}

interface ApiProductVariantPayload {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | string | null;
  stock?: number | string | null;
  is_active?: boolean;
  sort_order?: number | string | null;
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

interface ApiProductPricePayload {
  id: string;
  store_id: string;
  product_id: string;
  customer_type_id: string;
  price: number | string;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ApiProductModificationPayload {
  id: string;
  name: string;
  price?: number | string | null;
  is_active?: boolean;
  sort_order?: number | string | null;
  linked_product_id?: string | null;
  linked_product_quantity?: number | string | null;
  linked_product?: {
    id: string;
    name: string;
    sku?: string | null;
    price?: number | string | null;
    stock?: number | string | null;
    is_active?: boolean;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ApiProductBundleItemPayload {
  id: string;
  bundle_product_id: string;
  component_product_id: string;
  quantity: number | string;
  sort_order?: number | string | null;
  component_product?: {
    id: string;
    name: string;
    sku?: string | null;
    price?: number | string | null;
    stock?: number | string | null;
    is_active?: boolean;
  } | null;
}

interface ApiProductPayload {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  type?: string | null;
  bundle_pricing_mode?: string | null;
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
  product_prices?: ApiProductPricePayload[] | null;
  modifications?: ApiProductModificationPayload[] | null;
  bundle_items?: ApiProductBundleItemPayload[] | null;
  bundle_available_stock?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ApiPosShiftStockItemPayload {
  id: string;
  product_id: string;
  product?: { id: string; name: string; sku?: string | null } | null;
  opening_stock?: number | string | null;
  addition_stock?: number | string | null;
  sold_quantity?: number | string | null;
  expected_closing_stock?: number | string | null;
  actual_closing_stock?: number | string | null;
  variance?: number | string | null;
  opening_variance?: number | string | null;
  opening_variance_note?: string | null;
  closing_note?: string | null;
}

interface ApiPosShiftPayload {
  id: string;
  tenant_id?: string | null;
  store_id: string;
  store?: { id: string; name: string; nickname?: string | null } | null;
  opened_by_user_id?: string | null;
  closed_by_user_id?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  business_date?: string | null;
  status: string;
  raw_status?: string | null;
  opening_note?: string | null;
  closing_note?: string | null;
  is_force_closed?: boolean | number | null;
  force_close_reason?: string | null;
  stock_items_count?: number | string | null;
  items?: ApiPosShiftStockItemPayload[] | null;
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
      stock: store.stock != null ? toNumber(store.stock, 0) : undefined,
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
          sortOrder: toNumber(variant.sort_order ?? 0, 0),
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
      sortOrder: toNumber(modification.sort_order ?? 0, 0),
      linkedProductId: modification.linked_product_id ?? null,
      linkedProductQuantity: modification.linked_product_quantity != null
        ? toNumber(modification.linked_product_quantity, 1)
        : null,
      linkedProduct: modification.linked_product
        ? {
          id: String(modification.linked_product.id ?? ''),
          name: String(modification.linked_product.name ?? ''),
          sku: modification.linked_product.sku ?? null,
          price: toNumber(modification.linked_product.price ?? null, 0),
          stock: toNumber(modification.linked_product.stock ?? null, 0),
          isActive: typeof modification.linked_product.is_active === 'boolean' ? modification.linked_product.is_active : true,
        }
        : null,
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

  const productPrices = Array.isArray(product.product_prices)
    ? product.product_prices.map(normaliseProductPrice)
    : undefined;

  const productType: ProductType = product.type === 'bundle' ? 'bundle' : 'single';
  const bundlePricingMode: BundlePricingMode = product.bundle_pricing_mode === 'sum_components'
    ? 'sum_components'
    : 'fixed';

  const bundleItems = Array.isArray(product.bundle_items)
    ? product.bundle_items.map((item) => ({
      id: String(item.id ?? ''),
      bundleProductId: String(item.bundle_product_id ?? ''),
      componentProductId: String(item.component_product_id ?? ''),
      quantity: toNumber(item.quantity, 1),
      sortOrder: toNumber(item.sort_order ?? 0, 0),
      componentProduct: item.component_product
        ? {
          id: String(item.component_product.id ?? ''),
          name: String(item.component_product.name ?? ''),
          sku: item.component_product.sku ?? null,
          price: toNumber(item.component_product.price ?? null, 0),
          stock: toNumber(item.component_product.stock ?? null, 0),
          isActive: typeof item.component_product.is_active === 'boolean'
            ? item.component_product.is_active
            : true,
        }
        : null,
    }))
    : undefined;

  return {
    id: String(product.id ?? ''),
    name: String(product.name ?? ''),
    slug: String(product.slug ?? ''),
    description: product.description ?? null,
    category: product.category ?? categoryDetail?.name ?? null,
    type: productType,
    bundlePricingMode,
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
    productPrices,
    modifications,
    bundleItems,
    bundleAvailableStock: product.bundle_available_stock != null
      ? toNumber(product.bundle_available_stock, 0)
      : null,
    createdAt: product.created_at ?? undefined,
    updatedAt: product.updated_at ?? undefined,
  };
}

function normaliseProductPrice(price: ApiProductPricePayload): ProductPrice {
  const parsedPrice = typeof price.price === 'number' ? price.price : Number(price.price);

  return {
    id: String(price.id ?? ''),
    storeId: String(price.store_id ?? ''),
    productId: String(price.product_id ?? ''),
    customerTypeId: String(price.customer_type_id ?? ''),
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    isActive: typeof price.is_active === 'boolean' ? price.is_active : true,
    createdAt: price.created_at ?? undefined,
    updatedAt: price.updated_at ?? undefined,
  };
}

function normalisePosShift(shift: ApiPosShiftPayload): PosShift {
  const toShiftNumber = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
  };

  return {
    id: String(shift.id ?? ''),
    tenantId: shift.tenant_id ?? null,
    storeId: String(shift.store_id ?? ''),
    store: shift.store
      ? {
        id: String(shift.store.id ?? ''),
        name: String(shift.store.name ?? ''),
        nickname: shift.store.nickname ?? null,
      }
      : null,
    openedByUserId: shift.opened_by_user_id ?? null,
    closedByUserId: shift.closed_by_user_id ?? null,
    openedAt: shift.opened_at ?? null,
    closedAt: shift.closed_at ?? null,
    businessDate: shift.business_date ?? null,
    status: shift.status,
    rawStatus: shift.raw_status ?? null,
    openingNote: shift.opening_note ?? null,
    closingNote: shift.closing_note ?? null,
    isForceClosed: Boolean(shift.is_force_closed),
    forceCloseReason: shift.force_close_reason ?? null,
    stockItemsCount: toShiftNumber(shift.stock_items_count ?? null, 0),
    items: Array.isArray(shift.items)
      ? shift.items.map((item) => ({
        id: String(item.id ?? ''),
        productId: String(item.product_id ?? ''),
        product: item.product
          ? {
            id: String(item.product.id ?? ''),
            name: String(item.product.name ?? ''),
            sku: item.product.sku ?? null,
          }
          : null,
        openingStock: toShiftNumber(item.opening_stock ?? null, 0),
        additionStock: toShiftNumber(item.addition_stock ?? null, 0),
        soldQuantity: toShiftNumber(item.sold_quantity ?? null, 0),
        expectedClosingStock: toShiftNumber(item.expected_closing_stock ?? null, 0),
        actualClosingStock: item.actual_closing_stock != null ? toShiftNumber(item.actual_closing_stock, 0) : null,
        variance: item.variance != null ? toShiftNumber(item.variance, 0) : null,
        openingVariance: item.opening_variance != null ? toShiftNumber(item.opening_variance, 0) : null,
        openingVarianceNote: item.opening_variance_note ?? null,
        closingNote: item.closing_note ?? null,
      }))
      : undefined,
  };
}

/**
 * Resolve a relative image path to a full URL using the img service.
 * If the path is already a full URL, return it as-is.
 */
function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const imgBaseUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_IMG_URL)
    || 'https://img.sagansa.id';
  return `${imgBaseUrl}/storage/${path}`;
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
    store_group_id: store.store_group_id ?? null,
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
    email_receipt_logo_url: store.email_receipt_logo_url ?? resolveImageUrl(store.email_receipt_logo),
    print_receipt_logo_url: store.print_receipt_logo_url ?? resolveImageUrl(store.print_receipt_logo),
    address: store.address ?? null,
    phone: store.phone ?? null,
    created_at: store.created_at,
    updated_at: store.updated_at,
  };
}

function normaliseStoreGroup(group: ApiStoreGroupPayload): StoreGroup {
  return {
    id: group.id,
    tenant_id: group.tenant_id,
    name: group.name,
    description: group.description ?? null,
    stores: Array.isArray(group.stores)
      ? group.stores.map((store) => normaliseStore(store))
      : [],
    created_at: group.created_at,
    updated_at: group.updated_at,
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
    type: input.type ?? 'single',
    bundle_pricing_mode: input.type === 'bundle' ? (input.bundle_pricing_mode ?? 'fixed') : 'fixed',
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
      stock: store.stock != null ? Math.max(0, Math.round(store.stock)) : null,
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
    payload.variant_groups = input.variant_groups.map((group, groupIndex) => ({
      name: group.name,
      is_required: group.isRequired,
      order: groupIndex,
      variants: group.variants.map((variant, variantIndex) => ({
        name: variant.name,
        sku: variant.sku ?? null,
        price: variant.price ?? 0,
        stock: variant.stock ?? 0,
        is_active: variant.isActive ?? true,
        sort_order: variant.sortOrder ?? variantIndex,
        available_with_variants: variant.availableWithVariants ?? null,
      })),
    }));
  }

  if (input.modifications !== undefined) {
    payload.modifications = input.modifications.map((modification, index) => ({
      name: modification.name,
      price: modification.price ?? 0,
      is_active: modification.isActive ?? true,
      sort_order: modification.sortOrder ?? index,
      linked_product_id: modification.linkedProductId || null,
      linked_product_quantity: modification.linkedProductId ? (modification.linkedProductQuantity ?? 1) : null,
    }));
  }

  if (input.bundle_items !== undefined) {
    payload.bundle_items = input.bundle_items.map((item) => ({
      component_product_id: item.component_product_id,
      quantity: item.quantity,
      sort_order: item.sort_order ?? 0,
    }));
  }

  return payload;
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
