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
tags = [
    "a safe image",
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
    "animal cruelty"
]
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
    image_features = outputs.image_embeds
    text_features = outputs.text_embeds
    logits_per_image = image_features @ text_features.T
    probs = logits_per_image.softmax(dim=-1)
    best_idx = probs.argmax().item()
    predicted_label = tags[best_idx]
    confidence = probs[0, best_idx].item()
    # Consider anything except 'a safe image' as unsafe
    is_safe = predicted_label == "a safe image"
    return {
        "is_safe": is_safe,
        "label": predicted_label,
        "confidence": confidence,
        "probabilities": {tag: float(probs[0, i]) for i, tag in enumerate(tags)}
    }
