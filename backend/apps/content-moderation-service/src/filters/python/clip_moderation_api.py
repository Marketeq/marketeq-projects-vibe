from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image, UnidentifiedImageError
from transformers import CLIPProcessor, CLIPModel
import torch
import io

app = FastAPI()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch16").to(device)
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")

# Expanded label set for more nuanced moderation
safe_tags = [
    "a safe image",
    "a screenshot of a user interface",
    "a document, form, or chart",
    "a product photo or everyday object",
    "an illustration, logo, or artwork",
    "a landscape, building, or nature photo",
    "a photo of a person or group of people",
]
unsafe_tags = [
    "nudity",
    "violence",
    "graphic content",
    "hate symbol",
    "drugs",
    "weapons",
    "self-harm",
    "gore",
    "child abuse",
    "explicit sexual content",
    "suggestive content",
    "illegal activity",
    "offensive gesture",
    "terrorism",
    "animal cruelty",
]
tags = safe_tags + unsafe_tags
safe_tag_set = set(safe_tags)
text_inputs = processor(text=tags, return_tensors="pt", padding=True).to(device)

@app.post("/moderate")
async def moderate(file: UploadFile = File(...)):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    try:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=422,
            detail="Uploaded file is not a valid image."
        )

    inputs = processor(images=image, return_tensors="pt", padding=True).to(device)
    outputs = model(**inputs, **text_inputs)
    probs = outputs.logits_per_image.softmax(dim=-1)
    scored = [(tag, float(probs[0, i])) for i, tag in enumerate(tags)]
    best_safe = max((s for s in scored if s[0] in safe_tag_set), key=lambda x: x[1])
    best_unsafe = max((s for s in scored if s[0] not in safe_tag_set), key=lambda x: x[1])
    is_safe = best_safe[1] >= best_unsafe[1]
    predicted_label = "a safe image" if is_safe else best_unsafe[0]
    confidence = best_safe[1] if is_safe else best_unsafe[1]
    return {
        "is_safe": is_safe,
        "label": predicted_label,
        "confidence": confidence,
        "probabilities": {tag: prob for tag, prob in scored}
    }
