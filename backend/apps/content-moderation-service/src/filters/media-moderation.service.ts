
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData = require('form-data');
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { isImageHighQuality as isImageHighQualitySharp } from './isImageHighQuality-sharp';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';

import { runPythonScript } from './python-runner.util';

type MediaModerationDebug = {
  step: string;
  rejectCode?: string;
  detail?: string;
  httpStatus?: number;
  source: 'remote_url' | 'local_file';
};

export type MediaModerationResult = {
  isSafe: boolean;
  status: string;
  reason?: string;
  debug: MediaModerationDebug;
};

@Injectable()
export class MediaModerationService {
  // Supported formats
  private readonly allowedImageFormats = ['.jpg', '.jpeg', '.png'];
  private readonly allowedVideoFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  private readonly ffmpegFrameFps = 1;
  private readonly maxVideoFramesToAnalyze = 12;
  // AI decision thresholds: CLIP softmax scores are low (~0.05-0.10), so keep
  // thresholds realistic and never auto-approve unsafe model outputs.
  private readonly aiRejectThreshold = 0.12;
  private readonly aiReviewThreshold = 0.08;
  private readonly severeUnsafeLabels = new Set([
    'hate symbol',
    'terrorism',
    'child abuse',
    'explicit sexual content',
    'self-harm',
  ]);
  // Reject videos only when multiple frames are strongly unsafe.
  private readonly videoRejectFrameCount = 3;
  private readonly ffmpegCandidates = process.platform === 'win32'
    ? [process.env.FFMPEG_PATH, 'ffmpeg', 'C:\\ffmpeg\\bin\\ffmpeg.exe'].filter(Boolean) as string[]
    : ['ffmpeg'];

  // Check if file extension is supported
  isSupportedFormat(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.allowedImageFormats.includes(ext);
  }

  // File size check (default max 25MB)
  async isFileSizeAcceptable(filePath: string, maxSizeMB = 25): Promise<boolean> {
    const stat = await fsPromises.stat(filePath);
    const sizeMB = stat.size / (1024 * 1024);
    return sizeMB <= maxSizeMB;
  }

  // Simple resolution check
  async isImageHighQuality(imagePath: string): Promise<boolean> {
    // Try sharp-based check first
    try {
      return await isImageHighQualitySharp(imagePath);
    } catch (err) {
      console.error('[isImageHighQuality] sharp failed:', err);
      return false;
    }
  }

  // Main image moderation handler
  async moderateImage(imagePath: string): Promise<MediaModerationResult> {
    let localPath = imagePath;
    let tempFile = null;
    const source: MediaModerationDebug['source'] = /^https?:\/\//i.test(imagePath)
      ? 'remote_url'
      : 'local_file';
    console.log('[Moderation] Starting moderation for', imagePath);
    console.log('[Moderation] Step 1: Initial path and variables set.');
    // If imagePath is a remote URL, download it to a temp file
    if (/^https?:\/\//i.test(imagePath)) {
      console.log('[Moderation] Step 2: Detected remote image URL. Attempting download...');
      try {
        const response = await axios.get(imagePath, { responseType: 'arraybuffer', timeout: 10000, validateStatus: () => true });
        if (response.status !== 200) {
          const reason = `Remote image URL not accessible (status ${response.status})`;
          console.error(`[Moderation] ${reason}`);
          return {
            isSafe: false,
            status: 'rejected',
            reason,
            debug: {
              step: 'download_remote_image',
              rejectCode: 'REMOTE_IMAGE_HTTP_STATUS',
              detail: reason,
              httpStatus: response.status,
              source,
            },
          };
        }
        const ext = path.extname(imagePath).split('?')[0] || '.jpg';
        tempFile = path.join(os.tmpdir(), `moderation-${uuidv4()}${ext}`);
        await fsPromises.writeFile(tempFile, response.data);
        localPath = tempFile;
        console.log('[Moderation] Downloaded remote image to', tempFile);
      } catch (err) {
        const reason = 'Failed to download remote image';
        console.error(`[Moderation] ${reason}:`, err);
        return {
          isSafe: false,
          status: 'rejected',
          reason,
          debug: {
            step: 'download_remote_image',
            rejectCode: 'REMOTE_IMAGE_DOWNLOAD_FAILED',
            detail: reason,
            source,
          },
        };
      }
    }
    try {
      console.log('[Moderation] Step 3: Checking supported format...');
      // TEMPORARY: Commented out early returns to force FastAPI moderation call for debugging
      if (!this.isSupportedFormat(localPath)) {
        const reason = 'Unsupported image format';
        console.warn('[Moderation]', reason, localPath);
        // return { isSafe: false, status: 'rejected', reason };
      }
      console.log('[Moderation] Step 4: Checking file size...');
      const sizeOK = await this.isFileSizeAcceptable(localPath);
      if (!sizeOK) {
        const reason = 'Image size too large';
        console.warn('[Moderation]', reason, localPath);
        // return { isSafe: false, status: 'rejected', reason };
      }
      console.log('[Moderation] Step 5: Checking image quality...');
      let highQuality = false;
      try {
        console.log('[Moderation] Before isImageHighQuality');
        highQuality = await this.isImageHighQuality(localPath);
        console.log('[Moderation] After isImageHighQuality:', highQuality);
      } catch (err) {
        console.error('[Moderation] Error in isImageHighQuality:', err);
      }
      if (!highQuality) {
        const reason = 'Low-resolution image';
        console.warn('[Moderation]', reason, localPath);
        // return { isSafe: false, status: 'rejected', reason };
      }
      try {
        console.log('[Moderation] Before animation check');
        const isStatic = await runPythonScript('detect_animation.py', localPath);
        console.log('[Moderation] After animation check:', isStatic);
        if (!isStatic) {
          const reason = 'Animated images are not allowed';
          console.warn('[Moderation]', reason, localPath);
          // return { isSafe: false, status: 'rejected', reason };
        }
      } catch (err) {
        console.error('[Moderation] Animation detection failed. Proceeding as static.', err);
      }
      try {
        console.log('[Moderation] Before blur check');
        const isClear = await runPythonScript('blur_check.py', localPath);
        console.log('[Moderation] After blur check:', isClear);
        if (!isClear) {
          const reason = 'Image is blurry or unclear';
          console.warn('[Moderation]', reason, localPath);
          // return { isSafe: false, status: 'rejected', reason };
        }
      } catch (err) {
        console.error('[Moderation] Blur detection failed. Proceeding to next check.', err);
      }
      try {
        console.log('[Moderation] Step 6: Checking for animation...');
        const isStatic = await runPythonScript('detect_animation.py', localPath);
        if (!isStatic) {
          const reason = 'Animated images are not allowed';
          console.warn('[Moderation]', reason, localPath);
          return {
            isSafe: false,
            status: 'rejected',
            reason,
            debug: {
              step: 'animation_check',
              rejectCode: 'ANIMATION_DETECTED',
              detail: reason,
              source,
            },
          };
        }
      } catch (err) {
        console.error('[Moderation] Animation detection failed. Proceeding as static.', err);
      }
      try {
        console.log('[Moderation] Step 7: Checking for blurriness...');
        const isClear = await runPythonScript('blur_check.py', localPath);
        if (!isClear) {
          const reason = 'Image is blurry or unclear';
          console.warn('[Moderation]', reason, localPath);
          return {
            isSafe: false,
            status: 'rejected',
            reason,
            debug: {
              step: 'blur_check',
              rejectCode: 'BLUR_DETECTED',
              detail: reason,
              source,
            },
          };
        }
      } catch (err) {
        console.error('[Moderation] Blur detection failed. Proceeding to next check.', err);
      }
      try {
        console.log('[Moderation] Step 8: Sending to FastAPI moderation...');
        const form = new FormData();
        form.append('file', fs.createReadStream(localPath));
        console.log('[Moderation] FastAPI request details:', {
          url: 'http://localhost:8000/moderate',
          headers: form.getHeaders(),
          filePath: localPath
        });
        const response = await axios.post('http://localhost:8000/moderate', form, {
          headers: form.getHeaders(),
          timeout: 10000,
        });
        console.log('[Moderation] FastAPI moderation response:', response.data);
        // Extra logging for debugging
        if (!response || !response.data) {
          console.error('[Moderation] No response or data from FastAPI moderation!');
        }
        const { is_safe, label, confidence } = response.data;
        console.log(`[Moderation] Parsed FastAPI response: is_safe=${is_safe}, label=${label}, confidence=${confidence}`);
        const normalizedLabel = String(label ?? '').toLowerCase();
        const normalizedConfidence = Number(confidence ?? 0);
        const reason = `AI moderation result: label=${label}, confidence=${confidence}`;
        const isSafeLabel = normalizedLabel === 'a safe image' || normalizedLabel === 'safe';

        // Always reject severe labels, even at lower confidence, to avoid
        // silently approving high-risk content.
        if (!isSafeLabel && this.severeUnsafeLabels.has(normalizedLabel)) {
          const rejectReason = `AI moderation rejected image (severe label: ${label}, confidence: ${confidence})`;
          console.warn('[Moderation] DECISION: REJECTED', rejectReason, localPath);
          return {
            isSafe: false,
            status: 'rejected',
            reason: rejectReason,
            debug: {
              step: 'ai_moderation',
              rejectCode: 'AI_MODEL_REJECTED_SEVERE_LABEL',
              detail: rejectReason,
              source,
            },
          };
        }

        // Reject when an unsafe label has strong confidence.
        if (!isSafeLabel && normalizedConfidence >= this.aiRejectThreshold) {
          const rejectReason = `AI moderation rejected image (label: ${label}, confidence: ${confidence})`;
          console.warn('[Moderation] DECISION: REJECTED', rejectReason, localPath);
          return {
            isSafe: false,
            status: 'rejected',
            reason: rejectReason,
            debug: {
              step: 'ai_moderation',
              rejectCode: 'AI_MODEL_REJECTED',
              detail: rejectReason,
              source,
            },
          };
        }

        // Medium confidence unsafe labels should be manually reviewed.
        if (!isSafeLabel && normalizedConfidence >= this.aiReviewThreshold) {
          const reviewReason = `AI moderation flagged image for review (label: ${label}, confidence: ${confidence})`;
          console.warn('[Moderation] DECISION: PENDING_REVIEW', reviewReason, localPath);
          return {
            isSafe: true,
            status: 'pending_review',
            reason: reviewReason,
            debug: {
              step: 'ai_moderation',
              rejectCode: 'AI_MODEL_REVIEW_REQUIRED',
              detail: reviewReason,
              source,
            },
          };
        }

        // Low-confidence non-severe labels are approved to reduce false positives.
        if (!isSafeLabel) {
          const lowConfidenceReason = `AI moderation low-confidence non-severe label treated as safe (label: ${label}, confidence: ${confidence})`;
          console.warn('[Moderation] DECISION: APPROVED_LOW_CONFIDENCE', lowConfidenceReason, localPath);
          return {
            isSafe: true,
            status: 'approved',
            reason: lowConfidenceReason,
            debug: {
              step: 'ai_moderation',
              rejectCode: 'AI_MODEL_LOW_CONFIDENCE_APPROVED',
              detail: lowConfidenceReason,
              source,
            },
          };
        }

        // Safe label result.
        console.log('[Moderation] DECISION: APPROVED', reason, localPath);
        return {
          isSafe: true,
          status: 'approved',
          reason,
          debug: {
            step: 'ai_moderation',
            source,
          },
        };
      } catch (err) {
        console.error('[Moderation] Image moderation (FastAPI) failed:', err);
        if (err.response) {
          console.error('[Moderation] FastAPI error response:', err.response.status, err.response.data);
        }
        return {
          isSafe: true,
          status: 'pending_review',
          reason: 'AI moderation unavailable',
          debug: {
            step: 'ai_moderation',
            rejectCode: 'AI_SERVICE_UNAVAILABLE',
            detail: 'FastAPI moderation endpoint unavailable',
            source,
          },
        };
      }
    } finally {
      if (tempFile) {
        try { await fsPromises.unlink(tempFile); } catch {}
      }
    }
  }

  // Video moderation logic (simplified)
  async moderateVideo(videoPath: string): Promise<MediaModerationResult> {
    console.log('[Video Moderation] Starting video moderation:', videoPath);
    let localPath = videoPath;
    let tempVideoPath: string | null = null;
    let framesDir: string | null = null;
    const source: MediaModerationDebug['source'] = /^https?:\/\//i.test(videoPath)
      ? 'remote_url'
      : 'local_file';

    try {
      if (/^https?:\/\//i.test(videoPath)) {
        const downloadedVideo = await this.downloadRemoteVideo(videoPath);
        if (downloadedVideo.ok === false) {
          return downloadedVideo.result;
        }
        localPath = downloadedVideo.path;
        tempVideoPath = downloadedVideo.path;
      }

      await this.validateVideo(localPath);

      framesDir = await this.extractFrames(localPath);
      const allFrames = await this.listExtractedFrames(framesDir);
      const frames = allFrames.slice(0, this.maxVideoFramesToAnalyze);

      if (!frames.length) {
        const reason = 'Unable to extract frames from video';
        return {
          isSafe: true,
          status: 'pending_review',
          reason,
          debug: {
            step: 'extract_frames',
            rejectCode: 'VIDEO_FRAME_EXTRACTION_EMPTY',
            detail: reason,
            source,
          },
        };
      }

      let unsafeFrameCount = 0;
      let reviewFrameCount = 0;

      for (const framePath of frames) {
        const frameResult = await this.moderateImage(framePath);
        if (!frameResult.isSafe || frameResult.status === 'rejected') {
          unsafeFrameCount += 1;
          console.warn('[Video Moderation] Unsafe frame detected:', framePath, frameResult.reason);
          if (unsafeFrameCount >= this.videoRejectFrameCount) {
            const reason = `Video rejected: ${unsafeFrameCount} unsafe frames detected`;
            return {
              isSafe: false,
              status: 'rejected',
              reason,
              debug: {
                step: 'frame_moderation',
                rejectCode: 'UNSAFE_FRAME_DETECTED',
                detail: reason,
                source,
              },
            };
          }
          continue;
        }

        if (frameResult.status === 'pending_review') {
          reviewFrameCount += 1;
        }
      }

      if (unsafeFrameCount > 0 || reviewFrameCount > 0) {
        const reason = `Video requires manual review (${unsafeFrameCount} unsafe, ${reviewFrameCount} review frames)`;
        return {
          isSafe: true,
          status: 'pending_review',
          reason,
          debug: {
            step: 'frame_moderation',
            rejectCode: 'VIDEO_REVIEW_REQUIRED',
            detail: reason,
            source,
          },
        };
      }

      const reason = `Video moderation approved (${frames.length}/${allFrames.length} frames checked)`;
      return {
        isSafe: true,
        status: 'approved',
        reason,
        debug: {
          step: 'frame_moderation',
          source,
        },
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Video moderation failed';
      console.error('[Video Moderation] failed:', err);
      return {
        isSafe: true,
        status: 'pending_review',
        reason: 'Video moderation service unavailable',
        debug: {
          step: 'video_moderation',
          source,
          rejectCode: 'VIDEO_SERVICE_UNAVAILABLE',
          detail: reason,
        },
      };
    } finally {
      if (framesDir) {
        await this.safeRm(framesDir);
      }
      if (tempVideoPath) {
        await this.safeUnlink(tempVideoPath);
      }
    }
  }

  private async validateVideo(videoPath: string): Promise<void> {
    const ext = path.extname(videoPath).toLowerCase();
    if (!this.allowedVideoFormats.includes(ext)) {
      throw new Error(`Unsupported video format: ${ext || 'unknown'}`);
    }

    const isSizeOk = await this.isFileSizeAcceptable(videoPath, 100);
    if (!isSizeOk) {
      throw new Error('Video size exceeds the allowed limit');
    }
  }

  private async downloadRemoteVideo(videoUrl: string): Promise<
    | { ok: true; path: string }
    | { ok: false; result: MediaModerationResult }
  > {
    try {
      const response = await axios.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        validateStatus: () => true,
      });

      if (response.status !== 200) {
        const reason = `Remote video URL not accessible (status ${response.status})`;
        return {
          ok: false,
          result: {
            isSafe: false,
            status: 'rejected',
            reason,
            debug: {
              step: 'download_remote_video',
              rejectCode: 'REMOTE_VIDEO_HTTP_STATUS',
              detail: reason,
              httpStatus: response.status,
              source: 'remote_url',
            },
          },
        };
      }

      const ext = path.extname(videoUrl).split('?')[0] || '.mp4';
      const tempVideoPath = path.join(os.tmpdir(), `moderation-video-${uuidv4()}${ext}`);
      await fsPromises.writeFile(tempVideoPath, response.data);
      return { ok: true, path: tempVideoPath };
    } catch (err) {
      const reason = 'Failed to download remote video';
      console.error('[Video Moderation]', reason, err);
      return {
        ok: false,
        result: {
          isSafe: false,
          status: 'rejected',
          reason,
          debug: {
            step: 'download_remote_video',
            rejectCode: 'REMOTE_VIDEO_DOWNLOAD_FAILED',
            detail: reason,
            source: 'remote_url',
          },
        },
      };
    }
  }

  private async extractFrames(videoPath: string): Promise<string> {
    const framesDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'video-frames-'));
    const outputPattern = path.join(framesDir, 'output_%04d.jpg');
    const args = ['-y', '-i', videoPath, '-vf', `fps=${this.ffmpegFrameFps}`, outputPattern];

    await this.runFfmpegWithFallback(args);

    return framesDir;
  }

  private async runFfmpegWithFallback(args: string[]): Promise<void> {
    let lastError: Error | null = null;

    for (const ffmpegCommand of this.ffmpegCandidates) {
      try {
        await new Promise<void>((resolve, reject) => {
          const ffmpeg = spawn(ffmpegCommand, args, { windowsHide: true });
          let stderr = '';

          ffmpeg.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
          });

          ffmpeg.on('error', (err) => {
            reject(new Error(`ffmpeg execution failed: ${err.message}`));
          });

          ffmpeg.on('close', (code) => {
            if (code === 0) {
              resolve();
              return;
            }
            const ffmpegError = stderr.trim() || `ffmpeg exited with code ${code}`;
            reject(new Error(ffmpegError));
          });
        });
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const lowerMsg = (lastError.message || '').toLowerCase();
        const isNotFound =
          lowerMsg.includes('enoent') || lowerMsg.includes('not found') || lowerMsg.includes('not recognized');
        if (!isNotFound) {
          throw lastError;
        }
      }
    }

    throw lastError ?? new Error('ffmpeg execution failed');
  }

  private async listExtractedFrames(framesDir: string): Promise<string[]> {
    const entries = await fsPromises.readdir(framesDir);
    return entries
      .filter((fileName) => /\.jpe?g$/i.test(fileName))
      .sort((a, b) => a.localeCompare(b))
      .map((fileName) => path.join(framesDir, fileName));
  }

  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fsPromises.unlink(filePath);
    } catch {}
  }

  private async safeRm(dirPath: string): Promise<void> {
    try {
      await fsPromises.rm(dirPath, { recursive: true, force: true });
    } catch {}
  }

  // Get status message for UI or notifications
  async getMediaStatusMessage(filename: string, status: string): Promise<string> {
    switch (status) {
      case 'rejected':
        return `Your media "${filename}" was rejected due to policy violation.`;
      case 'approved':
        return `Your media "${filename}" has been successfully uploaded and approved.`;
      case 'pending_review':
        return `Your media "${filename}" is under review.`;
      default:
        return `Thanks for uploading your media. It will be reviewed shortly.`;
    }
  }
}
