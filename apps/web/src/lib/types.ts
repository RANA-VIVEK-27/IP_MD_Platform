export type UserRole =
  | 'patient'
  | 'doctor'
  | 'pharmacist'
  | 'pharmacy_admin'
  | 'pharmacy_staff_owned'
  | 'partner_pharmacy'
  | 'admin'
  | 'user_admin'
  | 'super_admin';

export type UserStatus = 'active' | 'pending' | 'suspended';

export interface User {
  user_id: string;
  role: UserRole;
  full_name: string;
  email?: string;
  phone?: string;
  status: UserStatus;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  is_new_user?: boolean;
}

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string | null;
  has_more?: boolean;
}

export interface ExtractedField {
  field_id: string;
  prescription_id: string;
  field_name: string;
  value: string;
  confidence_score: number;
  review_state: 'auto_accepted' | 'needs_review' | 'doctor_edited';
  edited_by?: string | null;
  edited_reason?: string | null;
}

export interface MedicineItem {
  sequence: number;
  raw_name: string;
  name: string;
  strength?: string | null;
  dosage_instruction?: string | null;
  duration?: string | null;
  quantity?: number | null;
  ocr_confidence: number;
  parser_confidence: number;
  validation_confidence: number;
  overall_confidence: number;
  needs_review: boolean;
}

export interface PrescriptionSummary {
  prescription_id: string;
  patient_id: string;
  doctor_id?: string | null;
  doctor_name?: string | null;
  document_id: string;
  extraction_status: 'queued' | 'processing' | 'extracted' | 'needs_review' | 'failed';
  verification_status: 'pending_review' | 'doctor_verified' | 'rejected';
  created_at: string;
}

export interface PrescriptionDetail extends PrescriptionSummary {
  is_ai_generated: boolean;
  extracted_fields: ExtractedField[];
  medicines: MedicineItem[];
  raw_ocr_text?: string | null;
  overall_confidence?: number | null;
  needs_review?: boolean | null;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  doctor_reg_no?: string | null;
  doctor_qualification?: string | null;
  doctor_specialization?: string | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  patient_name?: string | null;
  patient_phone?: string | null;
  patient_age?: string | null;
  patient_gender?: string | null;
  patient_mrd?: string | null;
  prescription_date?: string | null;
  patient_note?: string | null;
  diagnosis?: string | null;
  document_url?: string | null;
}

export interface PrescriptionUploadResponse {
  prescription_id: string;
  document_id: string;
  status: string;
}

export interface PrescriptionStatusResponse {
  status: string;
  progress_pct: number;
  is_ai_generated: boolean;
}

export interface PrescriptionListResponse extends PaginatedResponse<PrescriptionSummary> {}

export interface FieldEditResponse {
  field_id: string;
  value: string;
  review_state: string;
}

export interface Medicine {
  medicine_id: string;
  name: string;
  generic_name?: string | null;
  schedule: 'otc' | 'h' | 'h1' | 'x';
  price?: number | null;
  in_stock: boolean;
  total_stock: number;
  manufacturer?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  pack_size?: string | null;
  description?: string | null;
}

export interface MedicineDetail extends Medicine {
  standard_identifier: string;
  total_quantity: number;
  stock_sources: StockSource[];
  generic_equivalents: GenericEquivalent[];
  created_at: string;
}

export interface StockSource {
  source_type: string;
  source_id: string;
  source_name?: string | null;
  quantity: number;
  price: number;
}

export interface GenericEquivalent {
  medicine_id: string;
  name: string;
  generic_name?: string | null;
  schedule: string;
}

export interface MedicineSearchResponse extends PaginatedResponse<Medicine> {}

export interface CartItemDetail {
  line_item_id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name?: string | null;
  schedule: string;
  quantity: number;
  unit_price: number;
  price: number;
  prescription_id?: string | null;
  checkout_blocked: boolean;
}

export interface CartDetail {
  cart_id: string;
  patient_id: string;
  status: string;
  items: CartItemDetail[];
  subtotal: number;
  has_blocked_items: boolean;
}

export interface SavedAddress {
  address_id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface CartCreateResponse {
  cart_id: string;
  patient_id: string;
  status: string;
  created_at: string;
}

export interface CartItemAddResponse {
  cart_id: string;
  line_item_id: string;
  checkout_blocked: boolean;
}

export interface OrderLineItem {
  line_item_id: string;
  medicine_id: string;
  medicine_name?: string | null;
  prescription_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  fulfillment_source?: string | null;
}

export interface FulfillmentRecord {
  fulfillment_record_id: string;
  line_item_id: string;
  source_type: string;
  source_id: string;
  status: string;
  dispatched_at?: string | null;
  delivered_at?: string | null;
}

export interface RoutingDecision {
  routing_decision_id: string;
  line_item_id: string;
  decision_basis: string;
  source_type: string;
  source_id: string;
  overridden_by?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface OrderSummary {
  order_id: string;
  patient_id: string;
  status: 'placed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'captured' | 'refunded' | 'failed';
  total_amount: number;
  items_count: number;
  created_at: string;
}

export interface OrderDetail {
  order_id: string;
  patient_id: string;
  status: 'placed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'captured' | 'refunded' | 'failed';
  total_amount: number;
  created_at: string;
  cart_id: string;
  delivery_address_id: string;
  line_items: OrderLineItem[];
  fulfillment_records: FulfillmentRecord[];
  routing_decisions: RoutingDecision[];
}

export interface OrderCreateResponse {
  order_id: string;
  cart_id: string;
  patient_id: string;
  status: string;
  payment_status: string;
  fulfillment_records: FulfillmentRecord[];
  payment_required_amount: number;
  created_at: string;
}

export interface OrderListResponse extends PaginatedResponse<OrderSummary> {}

export interface OrderCancelResponse {
  order_id: string;
  status: string;
  refund_id?: string | null;
}

export interface Dispute {
  dispute_id: string;
  order_id: string;
  dispute_type: string;
  flagged_at: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution?: string | null;
}

export interface DisputeListResponse extends PaginatedResponse<Dispute> {}

export interface PaymentOrderCreateResponse {
  payment_intent_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
}

export interface PaymentCaptureResponse {
  payment_intent_id: string;
  status: string;
  order_id: string;
}

export interface PaymentDetail {
  payment_id: string;
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  status: string;
  captured_at?: string | null;
  refunded_amount: number;
}

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  type: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  read: boolean;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface DashboardSummary {
  orders_today: number;
  fulfillment_sla_breach_count: number;
  doctor_verification_queue_depth: number;
  payment_success_rate_30d: number;
}

export interface PartnerPharmacyAdmin {
  partner_id: string;
  name: string;
  fulfillment_radius_km: number;
  status: 'pending_activation' | 'active' | 'suspended' | 'delisted';
}

export interface PartnerPharmacyListResponse extends PaginatedResponse<PartnerPharmacyAdmin> {}

export interface VerificationQueueItem {
  prescription_id: string;
  patient_ref: string;
  extraction_status: string;
  verification_status: string;
  queued_at: string;
  sla_breach: boolean;
}

export interface VerificationQueueResponse extends PaginatedResponse<VerificationQueueItem> {}

export interface VerificationActionResponse {
  prescription_id: string;
  verification_status: string;
  audit_log_id: string;
}

export interface VerificationAuditEntry {
  actor_id?: string | null;
  actor_role: string;
  action_type: string;
  timestamp: string;
  justification?: string | null;
}

export interface DoctorKYCItem {
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  license_number: string;
  submitted_at: string;
  medical_registration?: {
    medical_registration_number?: string;
    state_medical_council?: string;
    registration_authority?: string;
    registration_date?: string;
  };
  qualification?: {
    primary_qualification?: string;
    university?: string;
    specialization?: string;
    graduation_year?: string;
  };
  practice_info?: {
    clinic_hospital?: string;
    consultation_type?: string;
    facility_association?: string;
    practice_address?: { full_address?: string };
  };
  address?: { full_address?: string };
}

export interface DoctorKYCListResponse {
  data: DoctorKYCItem[];
}

export interface DoctorKYCVerifyResponse {
  user_id: string;
  status: string;
  audit_log_id: string;
}

export interface AccountActionResponse {
  user_id: string;
  status?: string | null;
  updated_fields?: string[] | null;
  audit_log_id: string;
}

export interface AccountListItem {
  user_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  created_at: string;
}

export interface AccountListResponse {
  data: AccountListItem[];
  total: number;
  next_cursor?: string | null;
}

export interface PlatformSettingsResponse {
  commission_rate_pct?: number;
  payment_gateway_credential_ref?: string;
  security_policies?: {
    mfa_required?: boolean;
    session_timeout_mins?: number;
    password_min_length?: number;
  };
}

export interface PlatformSettingsUpdateResponse {
  updated_fields: string[];
  config_version: number;
  audit_log_id: string;
}

export interface AdminAccount {
  user_id: string;
  full_name: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
}

export interface AdminCreateResponse {
  user_id: string;
  role: string;
  audit_log_id: string;
}

export interface AdminRevokeResponse {
  user_id: string;
  status: string;
  audit_log_id: string;
}

export interface AdminListItem {
  user_id: string;
  full_name: string;
  email?: string;
  role: string;
  status: string;
}

export interface AdminListResponse extends PaginatedResponse<AdminListItem> {}

export interface AuditLogEntry {
  audit_log_id: string;
  actor_id?: string;
  actor_role: string;
  action_type: string;
  target_entity_type: string;
  target_entity_id: string;
  justification?: string;
  timestamp: string;
}

export interface AuditLogQueryResponse extends PaginatedResponse<AuditLogEntry> {}

export interface OverdueVerificationItem {
  prescription_id: string;
  queued_at: string;
  hours_overdue: number;
  assigned_doctor_id?: string | null;
}

export interface OverdueVerificationResponse {
  data: OverdueVerificationItem[];
}

export interface ComplianceOverrideResponse {
  override_id: string;
  order_id: string;
  audit_log_id: string;
}

export interface ReportDetail {
  report_id: string;
  patient_id: string;
  document_id: string;
  report_type?: string | null;
  extraction_status: string;
  ai_explanation?: string | null;
  is_ai_generated: boolean;
  values: ReportValue[];
  created_at: string;
}

export interface ReportSummary {
  report_id: string;
  patient_id: string;
  document_id: string;
  report_type?: string | null;
  extraction_status: string;
  created_at: string;
}

export interface ReportListResponse {
  data: ReportSummary[];
  next_cursor?: string | null;
}

export interface ReportValue {
  value_id: string;
  test_name: string;
  value: string;
  unit?: string | null;
  reference_range?: string | null;
  flag: 'normal' | 'abnormal';
}

export interface NotificationPreference {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  updated_at: string;
}

export interface DeliveryLog {
  delivery_log_id: string;
  notification_id: string;
  channel: string;
  status: string;
  error_detail?: string | null;
  attempted_at: string;
}

// M12: Document Management Types

export type DocumentStatus =
  | 'upload_pending' | 'uploaded' | 'quarantined' | 'scanning'
  | 'clean' | 'processing' | 'ready'
  | 'upload_failed' | 'scan_failed' | 'infected' | 'processing_failed'
  | 'deleted';

export type ScanStatus = 'pending' | 'clean' | 'infected' | 'scan_failed';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DocumentItem {
  document_id: string;
  uploaded_by: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256?: string | null;
  file_type: string;
  doc_status: DocumentStatus;
  scan_status: ScanStatus;
  processing_status: ProcessingStatus;
  storage_provider?: string | null;
  uploaded_at: string;
  updated_at?: string | null;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  doc_status: string;
  scan_status: string;
  checksum_sha256?: string | null;
  message: string;
}

export interface DocumentDownloadResponse {
  document_id: string;
  download_url: string;
  expires_in: number;
  filename: string;
}

export interface DocumentListResponse extends PaginatedResponse<DocumentItem> {}

export interface DocumentStatusPoll {
  document_id: string;
  doc_status: DocumentStatus;
  scan_status: ScanStatus;
  processing_status: ProcessingStatus;
}

export interface DocumentDeleteResponse {
  document_id: string;
  deleted: boolean;
  message: string;
}

// M9: AI & RAG Chat Assistant Types

export interface ConsentResponse {
  consent_id: string;
  user_id: string;
  consent_type: string;
  consent_given: boolean;
  recorded_at: string;
}

export interface ChatSessionResponse {
  session_id: string;
  patient_id: string;
  document_type?: string | null;
  context_prescription_id?: string | null;
  context_document_id?: string | null;
  context_report_id?: string | null;
  created_at: string;
}

export interface ChatDocumentOption {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export interface PatientChatDocumentsResponse {
  prescriptions: ChatDocumentOption[];
  lab_reports: ChatDocumentOption[];
  general_reports: ChatDocumentOption[];
}

export interface ChatMessageItem {
  message_id: string;
  session_id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  is_ai_generated: boolean;
  guardrail_triggered: boolean;
  created_at: string;
}

export interface ChatTurnResponse {
  user_message: ChatMessageItem;
  assistant_message: ChatMessageItem;
  rag_sources_used: number;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatMessageItem[];
  total: number;
}

// ── Pharmacy Staff Types ──────────────────────────

export interface PharmacyDashboard {
  total_medicines: number;
  total_stock_units: number;
  low_stock_count: number;
  expiring_soon_count: number;
  pending_orders: number;
  dispatched_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  recent_orders: PharmacyOrderSummary[];
  inventory_summary: PharmacyInventorySummaryItem[];
}

export interface PharmacyOrderSummary {
  order_id: string;
  patient_name: string;
  status: string;
  payment_status: string;
  total_amount: number;
  items_count: number;
  created_at: string;
}

export interface PharmacyInventorySummaryItem {
  medicine_id: string;
  name: string;
  total_quantity: number;
  batch_count: number;
  is_low: boolean;
}

export interface PharmacyMedicine {
  medicine_id: string;
  standard_identifier: string;
  name: string;
  generic_name?: string | null;
  schedule: string;
  manufacturer?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  pack_size?: string | null;
  description?: string | null;
  side_effects?: string | null;
  contraindications?: string | null;
  storage_conditions?: string | null;
  drug_interactions?: string | null;
  total_stock: number;
  in_stock: boolean;
  created_at: string;
}

export interface PharmacyMedicineListResponse {
  data: PharmacyMedicine[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface PharmacyStockItem {
  stock_id: string;
  medicine_id: string;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  price: number;
  is_expired: boolean;
  is_expiring_soon: boolean;
  is_low_stock: boolean;
  updated_at: string;
}

export interface PharmacyStockListResponse {
  data: PharmacyStockItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface PharmacyOrderItem {
  order_id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  payment_status: string;
  total_amount: number;
  items_count: number;
  fulfillment_statuses: string[];
  delivery_address?: { full?: string; street?: string; city?: string; state?: string; pincode?: string } | null;
  created_at: string;
}

export interface PharmacyOrderListResponse {
  data: PharmacyOrderItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface PharmacyOrderDetail {
  order_id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  payment_status: string;
  total_amount: number;
  items: PharmacyOrderLineItem[];
  created_at: string;
}

export interface PharmacyOrderLineItem {
  line_item_id: string;
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  fulfillment?: {
    fulfillment_record_id?: string | null;
    source_type?: string | null;
    status?: string | null;
    dispatched_at?: string | null;
  } | null;
}

export interface PharmacyFulfillmentItem {
  fulfillment_record_id: string;
  line_item_id: string;
  order_id: string | null;
  medicine_name: string;
  quantity: number;
  source_type: string;
  status: string;
  dispatched_at: string | null;
  delivered_at: string | null;
}

export interface PharmacyFulfillmentListResponse {
  data: PharmacyFulfillmentItem[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ─── Professional Onboarding Types ─────────────────────────────────────────

export type ProfessionalStatus = 'draft' | 'submitted' | 'under_review' | 'needs_information' | 'resubmitted' | 'verified' | 'active' | 'suspended' | 'rejected' | 'expired';

export type CredentialStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export type OrganizationStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export type MembershipStatus = 'invited' | 'pending' | 'active' | 'suspended' | 'revoked';

export type VerificationRequestStatus = 'draft' | 'submitted' | 'under_review' | 'needs_information' | 'resubmitted' | 'verified' | 'rejected';

export interface ProfessionalCredential {
  credential_id: string;
  credential_type: string;
  credential_name?: string;
  issuing_authority?: string;
  registration_number?: string;
  state?: string;
  issue_date?: string;
  expiry_date?: string;
  document_id?: string;
  status: CredentialStatus;
  verification_method?: string;
  verified_at?: string;
  verified_by?: string;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  organization_id: string;
  name: string;
  trade_name?: string;
  organization_type: string;
  business_type?: string;
  address?: Record<string, unknown>;
  contact_email?: string;
  contact_phone?: string;
  gstin?: string;
  status: OrganizationStatus;
  verified_at?: string;
  verified_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  membership_id: string;
  user_id?: string;
  organization_id: string;
  role: string;
  status: MembershipStatus;
  invited_by?: string;
  invited_at?: string;
  accepted_at?: string;
  revoked_at?: string;
  invitation_token?: string;
  invitation_expires_at?: string;
  created_at: string;
}

export interface VerificationRequest {
  request_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  request_type: string;
  status: VerificationRequestStatus;
  application_data?: Record<string, unknown>;
  rejection_reason?: string;
  requested_info?: Record<string, unknown>;
  submitted_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  decision_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalStatusResponse {
  user_id: string;
  role: string;
  status: string;
  professional_status?: ProfessionalStatus;
  verification_request?: {
    request_id: string;
    request_type: string;
    status: VerificationRequestStatus;
    submitted_at?: string;
    reviewed_at?: string;
    rejection_reason?: string;
    requested_info?: Record<string, unknown>;
  };
  credentials: Array<{
    credential_id: string;
    credential_type: string;
    credential_name?: string;
    registration_number?: string;
    status: CredentialStatus;
    verified_at?: string;
  }>;
  organizations: Array<{
    membership_id: string;
    organization_id: string;
    role: string;
    status: MembershipStatus;
  }>;
}

export interface MedicalRegistration {
  registration_authority?: string;
  state_medical_council?: string;
  medical_registration_number?: string;
  registration_date?: string;
}

export interface QualificationInfo {
  primary_qualification?: string;
  university?: string;
  graduation_year?: string;
  specialization?: string;
  additional_qualifications?: Array<Record<string, unknown>>;
}

export interface PracticeInfo {
  clinic_hospital?: string;
  facility_association?: string;
  practice_address?: Record<string, unknown>;
  consultation_type?: string;
  professional_contact?: string;
}

export interface PharmacyRegistration {
  state_pharmacy_council?: string;
  registration_number?: string;
  registration_date?: string;
  expiry_date?: string;
}

export interface PharmacistDetails {
  qualification?: QualificationInfo;
  pharmacy_registration?: PharmacyRegistration;
}

export interface PharmacyRegistrationDetails {
  pharmacy_name: string;
  trade_name?: string;
  business_type?: string;
  address: Record<string, unknown>;
  gstin?: string;
  license_type?: string;
  license_number?: string;
  license_issuing_authority?: string;
  license_issue_date?: string;
  license_expiry_date?: string;
  responsible_pharmacist_name?: string;
  responsible_pharmacist_reg_no?: string;
}

