import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreService } from './firestore';
import {
  Message,
  Conversation,
  ConversationPreview,
  ConversationParticipant,
  MessageInput
} from '@/types/messaging';
import {
  sanitizeMessageContent,
  sanitizeUsername,
  validateMessageSubmission,
  messageRateLimiter,
  MESSAGE_LIMITS
} from '@/lib/utils/messageValidation';

export class MessagingService {
  // Conversation operations
  static async createConversation(
    participants: Omit<ConversationParticipant, 'joinedAt'>[],
    gigId?: string,
    gigTitle?: string
  ): Promise<string> {
    try {
      const conversationData = {
        participants: participants.map(p => ({
          ...p,
          joinedAt: new Date()
        })),
        participantIds: participants.map(p => p.userId), // Add participantIds for easier querying
        gigId: gigId || null,
        gigTitle: gigTitle || null,
        lastMessageAt: new Date(),
        unreadCount: participants.reduce((acc, p) => ({
          ...acc,
          [p.userId]: 0
        }), {}),
        status: 'active' as const,
        createdAt: new Date()
      };

      return await FirestoreService.create('conversations', conversationData);
    } catch (error: unknown) {
      throw new Error(`Error creating conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getConversationBetweenUsers(
    userId1: string,
    userId2: string,
    gigId?: string
  ): Promise<Conversation | null> {
    try {
      // Query conversations where userId1 is a participant (only gets conversations user has access to)
      const conversations = await FirestoreService.getWhere<Conversation>(
        'conversations',
        'participantIds',
        'array-contains',
        userId1
      );

      return conversations.find(conv => {
        const participantIds = conv.participants.map(p => p.userId);
        const hasAllUsers = participantIds.includes(userId1) && participantIds.includes(userId2);
        const gigMatches = gigId ? conv.gigId === gigId : true;
        return hasAllUsers && gigMatches;
      }) || null;
    } catch (error: unknown) {
      throw new Error(`Error getting conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getOrCreateConversation(
    currentUserId: string,
    otherUserId: string,
    otherUserName: string,
    otherUserType: 'job-seeker' | 'employer' | 'admin',
    gigId?: string,
    gigTitle?: string,
    currentUserName?: string,
    currentUserType?: 'job-seeker' | 'employer' | 'admin'
  ): Promise<string> {
    try {
      // Check if conversation already exists
      const existingConv = await this.getConversationBetweenUsers(currentUserId, otherUserId, gigId);

      if (existingConv) {
        return existingConv.id;
      }

      // Create new conversation
      const participants: Omit<ConversationParticipant, 'joinedAt'>[] = [
        {
          userId: currentUserId,
          userName: currentUserName || 'You',
          userType: currentUserType || 'job-seeker'
        },
        {
          userId: otherUserId,
          userName: otherUserName,
          userType: otherUserType
        }
      ];

      return await this.createConversation(participants, gigId, gigTitle);
    } catch (error: unknown) {
      throw new Error(`Error getting or creating conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getUserConversations(userId: string, includeArchived: boolean = false): Promise<ConversationPreview[]> {
    try {
      // Query conversations where userId is a participant (only gets conversations user has access to)
      const conversations = await FirestoreService.getWhere<Conversation>(
        'conversations',
        'participantIds',
        'array-contains',
        userId,
        'lastMessageAt'
      );

      return conversations
        .filter(conv => {
          const statusFilter = includeArchived ? true : conv.status !== 'archived';
          return statusFilter;
        })
        .map(conv => {
          const otherParticipant = conv.participants.find(p => p.userId !== userId)!;
          return {
            id: conv.id,
            otherParticipant,
            gigTitle: conv.gigTitle,
            lastMessage: conv.lastMessage ? {
              content: conv.lastMessage.content,
              senderId: conv.lastMessage.senderId,
              createdAt: conv.lastMessage.createdAt,
              type: conv.lastMessage.type
            } : undefined,
            unreadCount: conv.unreadCount[userId] || 0,
            lastMessageAt: conv.lastMessageAt,
            status: conv.status
          };
        });
    } catch (error: unknown) {
      throw new Error(`Error getting user conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getConversationById(conversationId: string, authenticatedUserId?: string): Promise<Conversation | null> {
    try {
      const conversation = await FirestoreService.getById<Conversation>('conversations', conversationId);

      // If authenticatedUserId is provided, verify the user is a participant
      if (authenticatedUserId && conversation) {
        const isParticipant = conversation.participantIds.includes(authenticatedUserId);
        if (!isParticipant) {
          throw new Error('Unauthorized: You are not a participant in this conversation');
        }
      }

      return conversation;
    } catch (error: unknown) {
      // If conversation doesn't exist or user doesn't have permission, return null instead of throwing
      // This is expected behavior when there's no active conversation
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Missing or insufficient permissions') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('does not exist')) {
        return null;
      }
      // For unexpected errors, still throw
      throw new Error(`Error getting conversation: ${errorMessage}`);
    }
  }

  // Message operations
  static async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    senderType: 'job-seeker' | 'employer' | 'admin',
    messageInput: MessageInput
  ): Promise<string> {
    try {
      // Verify conversation exists and check status
      const conversation = await this.getConversationById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check if conversation is blocked
      if (conversation.status === 'blocked') {
        throw new Error('Cannot send messages to blocked conversations');
      }

      // Verify sender is a participant
      const isParticipant = conversation.participants.some(p => p.userId === senderId);
      if (!isParticipant) {
        throw new Error('User is not a participant in this conversation');
      }

      // Check rate limiting
      const rateLimitCheck = messageRateLimiter.canSendMessage(senderId);
      if (!rateLimitCheck.allowed) {
        const waitSeconds = Math.ceil((rateLimitCheck.retryAfterMs || 0) / 1000);
        throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before sending another message`);
      }

      // Validate message content
      const validation = validateMessageSubmission(messageInput.content);
      if (!validation.isValid) {
        const errorMessage = Object.values(validation.errors).join('; ');
        throw new Error(`Invalid message: ${errorMessage}`);
      }

      // Sanitize message content
      const sanitizedContent = sanitizeMessageContent(messageInput.content, MESSAGE_LIMITS.CONTENT_MAX);

      // Fetch actual sender name from user database instead of trusting client
      const senderUser = await FirestoreService.getById<{ name: string; userType: string }>(
        'users',
        senderId
      );
      const verifiedSenderName = senderUser ? sanitizeUsername(senderUser.name) : sanitizeUsername(senderName);
      const verifiedSenderType = (senderUser?.userType as 'job-seeker' | 'employer' | 'admin') || senderType;

      const messageData: Omit<Message, 'id'> = {
        conversationId,
        senderId,
        senderName: verifiedSenderName,
        senderType: verifiedSenderType,
        content: sanitizedContent,
        type: messageInput.type,
        isRead: false,
        createdAt: new Date(),
        ...(messageInput.fileData && {
          metadata: {
            fileName: messageInput.fileData.fileName,
            fileUrl: messageInput.fileData.fileUrl,
            fileSize: messageInput.fileData.fileSize
          }
        })
      };

      const messageId = await FirestoreService.create('messages', messageData);

      // Record message for rate limiting
      messageRateLimiter.recordMessage(senderId);

      // Update conversation with last message and increment unread counts
      const unreadUpdates: { [userId: string]: number } = {};
      conversation.participants.forEach(participant => {
        if (participant.userId !== senderId) {
          unreadUpdates[participant.userId] = (conversation.unreadCount[participant.userId] || 0) + 1;
        } else {
          unreadUpdates[participant.userId] = conversation.unreadCount[participant.userId] || 0;
        }
      });

      await FirestoreService.update('conversations', conversationId, {
        lastMessage: { ...messageData, id: messageId },
        lastMessageAt: new Date(),
        unreadCount: unreadUpdates
      });

      return messageId;
    } catch (error: unknown) {
      throw new Error(`Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendSystemMessage(
    conversationId: string,
    content: string,
    type: 'gig-update' | 'application-update',
    metadata?: Message['metadata']
  ): Promise<string> {
    try {
      // Sanitize system message content
      const sanitizedContent = sanitizeMessageContent(content, MESSAGE_LIMITS.CONTENT_MAX);

      const messageData: Omit<Message, 'id'> = {
        conversationId,
        senderId: 'system',
        senderName: 'System',
        senderType: 'job-seeker', // Default, not relevant for system messages
        content: sanitizedContent,
        type,
        metadata,
        isRead: false,
        createdAt: new Date()
      };

      const messageId = await FirestoreService.create('messages', messageData);

      // Update conversation with last message
      const conversation = await this.getConversationById(conversationId);
      if (conversation) {
        const unreadUpdates: { [userId: string]: number } = {};
        conversation.participants.forEach(participant => {
          unreadUpdates[participant.userId] = (conversation.unreadCount[participant.userId] || 0) + 1;
        });

        await FirestoreService.update('conversations', conversationId, {
          lastMessage: { ...messageData, id: messageId },
          lastMessageAt: new Date(),
          unreadCount: unreadUpdates
        });
      }

      return messageId;
    } catch (error: unknown) {
      throw new Error(`Error sending system message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getConversationMessages(
    conversationId: string,
    limitCount: number = 50
  ): Promise<Message[]> {
    try {
      return await FirestoreService.getWhere<Message>(
        'messages',
        'conversationId',
        '==',
        conversationId,
        'createdAt',
        'desc',
        limitCount
      );
    } catch (error: unknown) {
      throw new Error(`Error getting messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      // Update all unread messages in the conversation
      const messages = await this.getConversationMessages(conversationId);
      const unreadMessages = messages.filter(msg => !msg.isRead && msg.senderId !== userId);

      const batch = writeBatch(db);
      unreadMessages.forEach(message => {
        const messageRef = doc(db, 'messages', message.id);
        batch.update(messageRef, { isRead: true });
      });

      // Reset unread count for this user in the conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversation = await this.getConversationById(conversationId);
      if (conversation) {
        const updatedUnreadCount = { ...conversation.unreadCount };
        updatedUnreadCount[userId] = 0;
        batch.update(conversationRef, { unreadCount: updatedUnreadCount });
      }

      await batch.commit();
    } catch (error: unknown) {
      throw new Error(`Error marking messages as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getArchivedConversations(userId: string): Promise<ConversationPreview[]> {
    return this.getUserConversations(userId, true).then(conversations =>
      conversations.filter(conv => conv.status === 'archived')
    );
  }

  static async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const conversations = await this.getUserConversations(userId);
      return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
    } catch (error: unknown) {
      throw new Error(`Error getting total unread count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Real-time subscriptions
  static subscribeToConversations(
    userId: string,
    callback: (conversations: ConversationPreview[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
      try {
        const conversations: Conversation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Conversation, 'id'>;
          // Filter out archived conversations
          if (data.status !== 'archived') {
            conversations.push({ id: doc.id, ...data });
          }
        });

        const previews: ConversationPreview[] = conversations.map(conv => {
          const otherParticipant = conv.participants.find(p => p.userId !== userId)!;
          return {
            id: conv.id,
            otherParticipant,
            gigTitle: conv.gigTitle,
            lastMessage: conv.lastMessage ? {
              content: conv.lastMessage.content,
              senderId: conv.lastMessage.senderId,
              createdAt: conv.lastMessage.createdAt,
              type: conv.lastMessage.type
            } : undefined,
            unreadCount: conv.unreadCount[userId] || 0,
            lastMessageAt: conv.lastMessageAt,
            status: conv.status
          };
        });

        callback(previews);
      } catch (error) {
        console.debug('Error in conversations subscription:', error);
      }
    });
  }

  static subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      try {
        const messages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<Message, 'id'>;
          messages.push({ id: doc.id, ...data });
        });
        callback(messages.reverse()); // Reverse to show oldest first
      } catch (error) {
        console.debug('Error in messages subscription:', error);
      }
    });
  }

  // Archive/Block operations
  static async archiveConversation(conversationId: string): Promise<void> {
    try {
      await FirestoreService.update('conversations', conversationId, { status: 'archived' });
    } catch (error: unknown) {
      throw new Error(`Error archiving conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async blockConversation(conversationId: string): Promise<void> {
    try {
      await FirestoreService.update('conversations', conversationId, { status: 'blocked' });
    } catch (error: unknown) {
      throw new Error(`Error blocking conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async unarchiveConversation(conversationId: string): Promise<void> {
    try {
      await FirestoreService.update('conversations', conversationId, { status: 'active' });
    } catch (error: unknown) {
      throw new Error(`Error unarchiving conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}