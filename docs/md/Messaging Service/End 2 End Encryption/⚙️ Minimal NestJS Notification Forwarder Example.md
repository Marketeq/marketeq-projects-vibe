# **⚙️ Minimal NestJS Notification Forwarder Example**

Your notification service typically listens for **lightweight events**
like new_message, without ever needing to decrypt message content.

## **🚀 Controller (messages microservice)**

****// src/messages/messages.controller.ts

\@Post()

async sendMessage(@Body() dto: CreateMessageDto) {

const message = await this.messagesService.create(dto);

// Immediately notify the notification service

await this.notificationService.sendNewMessageNotification({

recipientId: dto.recipientId,

senderName: dto.senderName,

conversationId: dto.conversationId,

conversationName: dto.conversationName

});

return message;

}



## **🛠 Notification payload DTO**

****export class NewMessageNotificationDto {

\@IsUUID()

recipientId: string;

\@IsString()

senderName: string;

\@IsUUID()

conversationId: string;

\@IsString()

conversationName: string;

}



## **🔔 Notification service integration (could call SNS, FCM, SendGrid, etc.)**

****\@Injectable()

export class NotificationService {

async sendNewMessageNotification(payload: NewMessageNotificationDto) {

// Could use SNS, SendGrid, or just a queue like Bull

await this.queue.add(\'send-notification\', payload);

}

}



## **✅ JSON event example for your workers**

****{

\"type\": \"new_message\",

\"recipientId\": \"user-456\",

\"senderName\": \"Anna\",

\"conversationId\": \"project-abc\",

\"conversationName\": \"Landing Page Redesign\"

}

✅ Notice: **no decrypted text ever sent.\**
The notification just says:

> \"Anna sent you a message in Landing Page Redesign\"
