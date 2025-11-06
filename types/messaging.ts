export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderType: 'job-seeker' | 'employer' | 'admin'
  content: string
  type: 'text' | 'file' | 'gig-update' | 'application-update'
  metadata?: {
    gigId?: string
    applicationId?: string
    fileName?: string
    fileUrl?: string
    fileSize?: number
    gigTitle?: string
    applicationStatus?: 'pending' | 'accepted' | 'rejected'
  }
  isRead: boolean
  createdAt: Date
  updatedAt?: Date
}

export interface Conversation {
  id: string
  participants: ConversationParticipant[]
  participantIds: string[] // Array of participant user IDs for easier querying
  gigId?: string
  gigTitle?: string
  lastMessage?: Message
  lastMessageAt: Date
  unreadCount: {
    [userId: string]: number
  }
  status: 'active' | 'archived' | 'blocked'
  createdAt: Date
  updatedAt?: Date
}

export interface ConversationParticipant {
  userId: string
  userName: string
  userType: 'job-seeker' | 'employer' | 'admin'
  profilePhoto?: string
  joinedAt: Date
  lastSeenAt?: Date
}

export interface ConversationPreview {
  id: string
  otherParticipant: ConversationParticipant
  gigTitle?: string
  lastMessage?: {
    content: string
    senderId: string
    createdAt: Date
    type: Message['type']
  }
  unreadCount: number
  lastMessageAt: Date
  status: 'active' | 'archived' | 'blocked'
}

export interface MessageInput {
  content: string
  type: 'text' | 'file'
  fileData?: {
    fileName: string
    fileUrl: string
    fileSize: number
  }
}

export interface MessagingState {
  conversations: ConversationPreview[]
  activeConversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  totalUnreadCount: number
}

export interface TypingStatus {
  conversationId: string
  userId: string
  userName: string
  isTyping: boolean
  timestamp: Date
}