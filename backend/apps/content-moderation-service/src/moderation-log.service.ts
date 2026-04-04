import { Injectable } from '@nestjs/common';

@Injectable()
export class ModerationLogService {
 
  private logs = [
    {
      content_id: "12345",
      content_type: "project",
      action: "approved",
      reason: null,
      moderator_id: null,
      timestamp: new Date().toISOString(),
    },
    {
      content_id: "67890",
      content_type: "review",
      action: "flagged",
      reason: "Profanity detected in review",
      moderator_id: null,
      timestamp: new Date().toISOString(),
    },
    // Add more simulated logs as needed
  ];

  async getLogs(status?: string, contentType?: string, page: number = 1, perPage: number = 10): Promise<any[]> {
    let filteredLogs = this.logs;

    // Optional filtering by status and contentType
    if (status) {
      filteredLogs = filteredLogs.filter(log => log.action === status);
    }
    if (contentType) {
      filteredLogs = filteredLogs.filter(log => log.content_type === contentType);
    }

    // Pagination logic
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filteredLogs.slice(start, end);
  }

  async createLog(log: { contentId: string; action: string; reason: string | null }) {
    const newLog = {
      content_id: log.contentId,
      content_type: 'project',  // You can adjust or pass this dynamically
      action: log.action,
      reason: log.reason,
      moderator_id: null,
      timestamp: new Date().toISOString(),
    };
    this.logs.push(newLog);
    console.log(`Log created:`, newLog);
  }

}
