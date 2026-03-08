### **Document 6: Media Moderation**

#### **Overview:**

This document outlines how to **moderate media content** (images and
videos) across the platform using **Hugging Face models** and other
tools. The **media moderation service** is designed to screen uploaded
images and videos for explicit content, violence, and other harmful
material, ensuring only safe media is allowed on the platform.

This document outlines the process for **media moderation**, ensuring
that **images** and **videos** uploaded to the platform are
automatically screened for **explicit content** using **Hugging Face
models**. It provides step-by-step instructions for installing,
integrating, and using the **media moderation service**, as well as the
necessary **filter resources**.

#### **1. Media Moderation Filter Resources**

**Objective**: Block harmful or inappropriate media content (images,
videos) across the platform.

##### **Resources:**

- **Hugging Face Models** for **image and video moderation** (e.g.,
  **CLIP** for images, or other video models).

- **Installation**:

pip install transformers torch torchvision

##### **Links to Resources:**

- [[Hugging Face Models\]{.underline}
  ](https://huggingface.co/models)

- [[OpenAI CLIP Model\]{.underline}
  ](https://huggingface.co/openai/clip-vit-base-patch16)

#### **2. Installing and Setting Up Hugging Face for Media Moderation**

To use **Hugging Face models** for content moderation, you need to
install the **transformers**, **torch**, and **torchvision** libraries.

1.  **Install Required Libraries**:

pip install transformers torch torchvision

2.  \
    **Download and Load Pre-trained Model** from **Hugging Face**:

from transformers import CLIPProcessor, CLIPModel

\# Load pre-trained CLIP model and processor

model = CLIPModel.from_pretrained(\"openai/clip-vit-base-patch16\")

processor =
CLIPProcessor.from_pretrained(\"openai/clip-vit-base-patch16\")



#### **3. Media Moderation Logic**

##### **3.1. Image Moderation**

**Objective**: Ensure uploaded images do not contain explicit or harmful
content (e.g., nudity, violence).

**Steps for Image Moderation**:

- **CLIP model** from **Hugging Face** is used to process and classify
  uploaded images.

- **Output** will classify images as either **explicit** or **safe**
  based on pre-defined thresholds.

##### **Code Example for Image Moderation:**

****from PIL import Image

\# Load image for moderation

image = Image.open(\"path_to_image.jpg\")

\# Process image and get features using CLIP model

inputs = processor(images=image, return_tensors=\"pt\")

outputs = model.get_image_features(\*\*inputs)

\# Logic to classify image as explicit or safe

def moderate_image(image_path):

image = Image.open(image_path)

inputs = processor(images=image, return_tensors=\"pt\")

outputs = model.get_image_features(\*\*inputs)

\# Classification logic based on threshold (e.g., explicit content
detection)

if outputs\[0\] \> 0.8: \# Threshold value for explicit content (can be
adjusted)

return False \# Reject the image if explicit content detected

return True \# Approve the image if no explicit content is detected

\# Example usage

moderate_image(\"path_to_image.jpg\")

##### **3.2. Video Moderation**

**Objective**: Ensure that videos do not contain explicit content by
processing each frame for harmful material.

**Steps for Video Moderation**:

- Each **frame** of the video is processed using **CLIP model** for
  content classification.

##### **Code Example for Video Moderation:**

****import cv2

from transformers import CLIPProcessor, CLIPModel

\# Function to process video and check each frame

def moderate_video(video_path):

cap = cv2.VideoCapture(video_path)

while cap.isOpened():

ret, frame = cap.read()

if not ret:

break

\# Process each frame using CLIP model

inputs = processor(images=frame, return_tensors=\"pt\")

outputs = model.get_image_features(\*\*inputs)

\# Reject the video if any frame is explicit

if outputs\[0\] \> 0.8: \# Threshold for explicit content (can be
adjusted)

return False

return True \# Approve the video if no frame is flagged

\# Example usage

moderate_video(\"path_to_video.mp4\")



#### **4. Integration with Content Moderation Microservice**

##### **4.1. Media Moderation Service (app/media/media-moderation.service.ts)**

This service will integrate **media moderation** into the overall
content moderation system. It will process **images** and **videos**
before any content is made available to users.

import { Injectable } from \'@nestjs/common\';

import { moderateImage, moderateVideo } from \'./hugging-face.service\';
// Import functions for media moderation

\@Injectable()

export class MediaModerationService {

// Validate media (image or video)

async validateMedia(media: string): Promise\<boolean\> {

const isImage = media.endsWith(\'.jpg\') \|\| media.endsWith(\'.png\');

const isVideo = media.endsWith(\'.mp4\') \|\| media.endsWith(\'.avi\');

if (isImage) {

return await moderateImage(media); // Process image

} else if (isVideo) {

return await moderateVideo(media); // Process video

}

return true; // If media type is not recognized, approve it

}

}

##### **4.2. Integrating Media Moderation Service (app/project/project.controller.ts)**

This service is used in various parts of the platform, not just project
submission. It handles media content moderation before the content is
published.

import { Controller, Post, Body } from \'@nestjs/common\';

import { MediaModerationService } from \'./media-moderation.service\';

\@Controller(\'media\')

export class MediaController {

constructor(private readonly mediaModerationService:
MediaModerationService) {}

\@Post(\'upload\')

async uploadMedia(@Body() mediaData: { media: string }) {

// Step 1: Validate the media content

const isMediaValid = await
this.mediaModerationService.validateMedia(mediaData.media);

if (!isMediaValid) {

return { status: \'rejected\', message: \'Media contains explicit
content.\' };

}

return { status: \'approved\', message: \'Media is safe and approved.\'
};

}

}



#### **5. Final Status Feedback**

After the media content is processed, the user will receive one of the
following statuses:

1.  **Your media has been successfully uploaded and approved.\**

2.  **Your media contains explicit content and has been rejected.\**

3.  **Your media requires manual review.\**

##### **Code Example for Sending Status Messages:**

****async sendMediaStatus(mediaId: string, status: string) {

const media = await this.mediaRepository.findOne(mediaId);

switch (status) {

case \'rejected\':

return \`Your media \"\${media.filename}\" was rejected due to explicit
content.\`;

case \'approved\':

return \`Your media \"\${media.filename}\" has been successfully
uploaded and approved.\`;

case \'pending_review\':

return \`Your media \"\${media.filename}\" is under review.\`;

default:

return \`Thanks for uploading your media. It will be reviewed
shortly.\`;

}

}


