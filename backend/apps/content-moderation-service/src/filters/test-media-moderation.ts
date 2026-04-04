import { MediaModerationService } from './media-moderation.service';
import { PythonScriptService } from './python-script.service';
import { ModerationLogService } from '../moderation-log.service'; // ✅ Make sure this path is correct
import { ContentValidationService } from './content-validation.service'; // Add this import if available
import * as path from 'path';

console.log('🚀 Booting up moderation test script...');

// Instantiate services
const pythonService = new PythonScriptService();
const logService = new ModerationLogService(); // ✅ NEW: Log service
const moderationService = new MediaModerationService();
//const contentService = new ContentValidationService(); // Add this if you have it

const testImagePath = process.env.TEST_IMAGE_PATH?.trim()
  ? path.resolve(process.env.TEST_IMAGE_PATH)
  : path.join(__dirname, '../../fixtures/image_3.jpg');
const testContent = {
  title: "Test Project",
  description: "This is a test description for moderation.",
  // Add more fields as needed
};

console.log('🖼️ Image path:', testImagePath);


async function run() {
  try {
    console.log('🔎 Running image moderation...');
    const imageResult = await moderationService.moderateImage(testImagePath);
    console.log('✅ Image Moderation Result:', imageResult);

    console.log('🔎 Running content moderation...');
    //const contentResult = await contentService.validateProjectFields(testContent);
    //console.log('✅ Content Moderation Result:', contentResult);
  } catch (err) {
    console.error('❌ Error during moderation:', err);
  }
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception thrown:', err);
  });
}

run();
