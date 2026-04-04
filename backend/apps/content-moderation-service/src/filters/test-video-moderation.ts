import { MediaModerationService } from './media-moderation.service';
import * as path from 'path';

console.log('Starting video moderation test script...');

const moderationService = new MediaModerationService();

const testVideoInput = process.env.TEST_VIDEO_URL?.trim()
  ? process.env.TEST_VIDEO_URL.trim()
  : process.env.TEST_VIDEO_PATH?.trim()
    ? path.resolve(process.env.TEST_VIDEO_PATH)
    : 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';

console.log('Video input:', testVideoInput);

async function run() {
  try {
    console.log('Running video moderation...');
    const result = await moderationService.moderateVideo(testVideoInput);
    console.log('Video Moderation Result:', result);
  } catch (err) {
    console.error('Error during video moderation:', err);
  }
}

run();
