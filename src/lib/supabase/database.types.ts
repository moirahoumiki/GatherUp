/* eslint-disable @typescript-eslint/no-explicit-any */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type AnyTable = {
  Row: Record<string, any>
  Insert: Record<string, any>
  Update: Record<string, any>
  Relationships: Array<{
    foreignKeyName: string
    columns: string[]
    isOneToOne: boolean
    referencedRelation: string
    referencedColumns: string[]
  }>
}

export type Database = {
  public: {
    Tables: {
      users: AnyTable
      user_public_id_history: AnyTable
      user_auth_identities: AnyTable
      organizer_verifications: AnyTable
      events: AnyTable
      event_organizers: AnyTable
      review_requests: AnyTable
      collection_code_versions: AnyTable
      event_finance_settings: AnyTable
      event_expenses: AnyTable
      event_order_counters: AnyTable
      registrations: AnyTable
      registration_attendees: AnyTable
      payments: AnyTable
      payment_proofs: AnyTable
      refund_requests: AnyTable
      refund_proofs: AnyTable
      waitlist_entries: AnyTable
      seats: AnyTable
      seat_locks: AnyTable
      seat_assignments: AnyTable
      check_ins: AnyTable
      announcements: AnyTable
      notification_deliveries: AnyTable
      push_devices: AnyTable
      activity_materials: AnyTable
      export_jobs: AnyTable
      complaints: AnyTable
      platform_settings: AnyTable
      admin_users: AnyTable
      audit_logs: AnyTable
      api_rate_limits: AnyTable
    } & Record<string, AnyTable>
    Views: Record<string, never>
    Functions: {
      set_updated_at: { Args: Record<string, any>; Returns: any }
      prevent_public_id_over_limit: { Args: Record<string, any>; Returns: any }
      create_payment_for_registration: { Args: Record<string, any>; Returns: any }
      create_registration_atomic: { Args: Record<string, any>; Returns: any }
      join_waitlist_atomic: { Args: Record<string, any>; Returns: any }
      invite_waitlist_entry_atomic: { Args: Record<string, any>; Returns: any }
      convert_waitlist_entry_atomic: { Args: Record<string, any>; Returns: any }
      mark_payment_submitted_from_proof: { Args: Record<string, any>; Returns: any }
      review_payment_atomic: { Args: Record<string, any>; Returns: any }
      expire_seat_locks_for_event: { Args: Record<string, any>; Returns: any }
      create_seat_lock_atomic: { Args: Record<string, any>; Returns: any }
      confirm_seat_assignment_atomic: { Args: Record<string, any>; Returns: any }
      check_in_order_atomic: { Args: Record<string, any>; Returns: any }
      request_refund_atomic: { Args: Record<string, any>; Returns: any }
      review_refund_request_atomic: { Args: Record<string, any>; Returns: any }
      record_refund_proof_atomic: { Args: Record<string, any>; Returns: any }
      confirm_refund_receipt_atomic: { Args: Record<string, any>; Returns: any }
      resolve_refund_dispute_atomic: { Args: Record<string, any>; Returns: any }
      sync_seat_status_on_assignment: { Args: Record<string, any>; Returns: any }
      current_app_user_id: { Args: Record<string, any>; Returns: any }
      can_manage_event: { Args: Record<string, any>; Returns: any }
      can_edit_event: { Args: Record<string, any>; Returns: any }
      can_manage_event_finance: { Args: Record<string, any>; Returns: any }
      can_manage_event_payments: { Args: Record<string, any>; Returns: any }
      can_handle_event_refunds: { Args: Record<string, any>; Returns: any }
      is_platform_admin: { Args: Record<string, any>; Returns: any }
      manage_event_organizer_atomic: { Args: Record<string, any>; Returns: any }
      respond_event_organizer_invitation_atomic: { Args: Record<string, any>; Returns: any }
      mark_notification_deliveries_read: { Args: Record<string, any>; Returns: any }
      storage_folder_uuid: { Args: Record<string, any>; Returns: any }
      consume_rate_limit: { Args: Record<string, any>; Returns: any }
      prune_expired_rate_limits: { Args: Record<string, any>; Returns: any }
      mirror_notification_to_email: { Args: Record<string, any>; Returns: any }
      expire_waitlist_invitations: { Args: Record<string, any>; Returns: any }
      create_event_atomic: { Args: Record<string, any>; Returns: any }
      get_public_event_registration_counts: { Args: Record<string, any>; Returns: any }
    } & Record<string, { Args: Record<string, any>; Returns: any }>
    Enums: {
      event_category: string
      event_template: string
      event_visibility: string
      event_status: string
      registration_status: string
      payment_status: string
      seat_status: string
      announcement_status: string
      contact_type: string
      order_number_format: string
      event_organizer_role: string
      event_organizer_status: string
      event_fee_mode: string
      event_expense_category: string
      event_expense_status: string
      auth_identity_provider: string
      organizer_verification_status: string
      review_target_type: string
      review_status: string
      price_visibility: string
      location_visibility: string
      seat_selection_mode: string
      collection_code_status: string
      payment_proof_type: string
      payment_proof_status: string
      refund_status: string
      waitlist_status: string
      seat_lock_status: string
      check_in_status: string
      notification_channel: string
      notification_delivery_status: string
      activity_material_type: string
      activity_material_visibility: string
      export_status: string
      complaint_target_type: string
      complaint_status: string
      admin_role: string
      admin_status: string
      platform_setting_value_type: string
      audit_risk_level: string
    } & Record<string, string>
    CompositeTypes: Record<string, never>
  }
  storage: {
    Tables: {
      objects: AnyTable
      buckets: AnyTable
    } & Record<string, AnyTable>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
