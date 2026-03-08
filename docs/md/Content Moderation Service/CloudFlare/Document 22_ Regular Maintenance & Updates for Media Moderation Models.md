### **Document 22: Regular Maintenance & Updates for Media Moderation Models**

#### **Overview**

This document describes the **process** for keeping your **Hugging
Face--based media moderation models** up to date. Whenever a new or
improved model is released, you'll update the reference in your code,
verify its performance against existing test suites, and deploy it with
minimal disruption. **Cloudflare R2** storage remains unchanged.

#### **1. Monitoring for New Model Releases**

1.  **Subscribe** to the Hugging Face model repository (e.g.
    openai/clip-vit-base-patch16) for release notifications.

2.  **Review changelogs** at
    [[https://huggingface.co/models]{.underline}](https://huggingface.co/models)
    to identify models with improved explicit--content detection or
    performance fixes.

#### **2. Updating Your Model Reference**

##### **2.1. Environment Variable**

In your .env, update the model identifier used by your inference client:

-HF_INFERENCE_API_URL=https://api-inference.huggingface.co/models/openai/clip-vit-base-patch16

+HF_INFERENCE_API_URL=https://api-inference.huggingface.co/models/openai/clip-vit-base-patch16-v2

If you use a direct model package (offline inference), update
accordingly:

-HF_CLIP_MODEL=openai/clip-vit-base-patch16

+HF_CLIP_MODEL=openai/clip-vit-base-patch16-v2

##### **2.2. Code Change**

In src/media/hugging-face.service.ts, ensure the constructor or
initializer picks up the new env var:

// src/media/hugging-face.service.ts

\@Injectable()

export class HuggingFaceService {

private readonly apiUrl = process.env.HF_INFERENCE_API_URL;

// ...

}

No other code changes are needed if your service reads the URL from
env.

#### **3. Threshold Adjustments**

After updating to a new model, you may need to recalibrate your
"explicit" threshold:

// Example: tighten threshold if new model is more sensitive

const EXPLICIT_THRESHOLD = parseFloat(process.env.EXPLICIT_THRESHOLD)
\|\| 0.6;

...

const explicit = results.find(r =\>
r.label.toLowerCase().includes(\'explicit\'));

return !explicit \|\| explicit.score \< EXPLICIT_THRESHOLD;

Update .env as needed:

EXPLICIT_THRESHOLD=0.6



#### **4. Testing the New Model**

##### **4.1. Unit Tests**

Enhance test/media/hugging-face.service.spec.ts:

describe(\'HuggingFaceService v2\', () =\> {

let service: HuggingFaceService;

beforeAll(() =\> {

process.env.HF_INFERENCE_API_URL =
\'https://api-inference.huggingface.co/models/openai/clip-vit-base-patch16-v2\';

service = new HuggingFaceService();

});

it(\'should reject an explicit image with new model\', async () =\> {

const result = await
service.moderateImage(\'https://.../explicit-sample.jpg\');

expect(result).toBe(false);

});

it(\'should approve a safe image with new model\', async () =\> {

const result = await
service.moderateImage(\'https://.../safe-sample.jpg\');

expect(result).toBe(true);

});

});

##### **4.2. Integration Tests**

Run your existing test/validate-media.spec.ts and
test/project-media.spec.ts to ensure end-to-end flow still passes.

#### **5. Deployment Procedure**

1.  **Merge** the env changes and code into your staging branch.

2.  **Redeploy** the Content Moderation Microservice (e.g., update your
    Docker image or Git tag).

3.  **Smoke-test** media uploads against staging: upload both explicit
    and safe samples.

4.  **Promote** to production once tests pass.

#### **6. Automating Model Updates**

Optionally, schedule a **weekly job** to:

- **Check** the Hugging Face model registry for new versions.

- **Open** a pull request updating the HF_INFERENCE_API_URL or
  HF_CLIP_MODEL.

This keeps your team notified of available improvements without manual
oversight.

With this process in place, your **media moderation models** stay
current, improving detection accuracy while maintaining your
**Cloudflare--backed** storage pipeline.
