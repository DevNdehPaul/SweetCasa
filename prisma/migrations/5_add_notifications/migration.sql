// ─── Push Notifications ──────────────────────────────────────────────────────
model PushToken {
  id        Int       @id @default(autoincrement())
  userId    Int       @map("user_id")
  token     String    @db.VarChar(255)
  platform  String    @default("ios") @db.VarChar(20) /// 'ios' | 'android' | 'web'
  createdAt DateTime? @default(now()) @map("created_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, token], map: "unique_user_push_token")
  @@map("push_tokens")
}

// ─── In-App Notifications ─────────────────────────────────────────────────────
model Notification {
  id        Int       @id @default(autoincrement())
  userId    Int       @map("user_id")
  /// 'listing_approved' | 'listing_rejected' | 'new_message' | 'escrow_update' | 'casa_match' | 'system'
  type      String    @db.VarChar(50)
  title     String    @db.VarChar(200)
  body      String
  data      Json?     /// Optional metadata payload (e.g. listingId, conversationId)
  read      Boolean   @default(false)
  sent      Boolean   @default(false) /// Whether a push notification was sent
  createdAt DateTime? @default(now()) @map("created_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}
